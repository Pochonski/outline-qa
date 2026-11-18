
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = "https://local.outline.dev:3000";
const CARPETA = "qa-tests/evidencias";
const ARCHIVO = path.join(CARPETA, "OL-TC-53_Resultados.json");

type Objeto = Record<string, any>;

type RespuestaAPI = {
  status: number;
  ok: boolean;
  body: Objeto;
};

test.use({
  storageState: "qa-tests/.auth/wiki.json",
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 800 },
});

test.setTimeout(120000);

const registros: Objeto[] = [];

function guardarPaso(
  numero: number,
  descripcion: string,
  valores: Objeto
) {
  const registro = {
    paso: numero,
    descripcion,
    fecha: new Date().toISOString(),
    ...valores,
  };

  registros.push(registro);

  fs.mkdirSync(CARPETA, { recursive: true });

  fs.writeFileSync(
    ARCHIVO,
    JSON.stringify(registros, null, 2),
    "utf8"
  );

  console.log(`\n========== PASO ${numero} ==========`);
  console.log(descripcion);
  console.log(JSON.stringify(valores, null, 2));
}

// Las solicitudes se ejecutan desde el navegador autenticado.
// Así se utilizan las cookies legítimas de la sesión de Outline.
async function llamarAPI(
  page: Page,
  endpoint: string,
  parametros: Objeto
): Promise<RespuestaAPI> {
  return page.evaluate(
    async ({ endpoint, parametros, baseURL }) => {
      const cookies = document.cookie
        .split(";")
        .map((elemento) => elemento.trim());

      const cookieCSRF = cookies.find((elemento) => {
        const nombre = elemento.split("=")[0];
        return /csrf|xsrf/i.test(nombre);
      });

      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      if (cookieCSRF) {
        const posicion = cookieCSRF.indexOf("=");
        const token = decodeURIComponent(
          cookieCSRF.slice(posicion + 1)
        );

        // Incluimos los nombres habituales de encabezado CSRF.
        // El servidor utiliza únicamente el que tiene configurado.
        headers["X-CSRF-Token"] = token;
        headers["X-CSRFToken"] = token;
        headers["X-XSRF-TOKEN"] = token;
      }

      const respuesta = await fetch(
        `${baseURL}/api/${endpoint}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers,
          body: JSON.stringify(parametros),
        }
      );

      const texto = await respuesta.text();

      let body: Objeto;

      try {
        body = JSON.parse(texto);
      } catch {
        body = {
          error: "La respuesta no es JSON",
          status: respuesta.status,
          fragmento: texto.slice(0, 300),
        };
      }

      return {
        status: respuesta.status,
        ok: respuesta.ok,
        body,
      };
    },
    { endpoint, parametros, baseURL: BASE_URL }
  );
}

function obtenerData(resultado: RespuestaAPI): any {
  expect(
    resultado.ok,
    `HTTP ${resultado.status}: ${JSON.stringify(resultado.body)}`
  ).toBe(true);

  expect(
    resultado.body.data,
    "La respuesta debe incluir data"
  ).toBeTruthy();

  return resultado.body.data;
}

function obtenerId(documento: Objeto): string {
  expect(typeof documento.id).toBe("string");
  return documento.id;
}

async function crearDocumento(
  page: Page,
  collectionId: string,
  titulo: string
) {
  const respuesta = await llamarAPI(
    page,
    "documents.create",
    {
      collectionId,
      title: titulo,
      text: `Documento exclusivo para OL-TC-53: ${titulo}`,
      publish: true,
    }
  );

  const data = obtenerData(respuesta);

  return {
    id: obtenerId(data),
    titulo,
    status: respuesta.status,
  };
}

async function consultarDocumento(
  page: Page,
  id: string
): Promise<Objeto> {
  const respuesta = await llamarAPI(
    page,
    "documents.info",
    { id }
  );

  return obtenerData(respuesta);
}

// Busca un documento en una estructura plana o anidada.
function encontrarNodo(
  valor: unknown,
  id: string,
  nivel = 0
): Objeto | null {
  if (!valor || nivel > 30) {
    return null;
  }

  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      const encontrado = encontrarNodo(
        elemento,
        id,
        nivel + 1
      );

      if (encontrado) {
        return encontrado;
      }
    }
    return null;
  }

  if (typeof valor !== "object") {
    return null;
  }

  const objeto = valor as Objeto;

  if (objeto.id === id) {
    return objeto;
  }

  for (const clave of [
    "children",
    "documents",
    "data",
    "items",
  ]) {
    const encontrado = encontrarNodo(
      objeto[clave],
      id,
      nivel + 1
    );

    if (encontrado) {
      return encontrado;
    }
  }

  return null;
}

test(
  "OL-TC-53 - Mover documento a destino valido",
  async ({ page }) => {
    fs.mkdirSync(CARPETA, { recursive: true });

    fs.writeFileSync(ARCHIVO, "[]", "utf8");

    // Abrir Outline para establecer la sesión y
    // recibir la cookie CSRF generada por el servidor.
    await page.goto(
      `${BASE_URL}/settings/preferences`,
      { waitUntil: "domcontentloaded" }
    );

    await expect(
      page.getByText("Preferences", {
        exact: true,
      }).first()
    ).toBeVisible({ timeout: 30000 });

    const tieneCSRF = await page.evaluate(() =>
      document.cookie
        .split(";")
        .some((cookie) =>
          /csrf|xsrf/i.test(cookie.split("=")[0])
        )
    );

    expect(
      tieneCSRF,
      "No se encontró una cookie CSRF. No es seguro continuar."
    ).toBe(true);

    // =============================================
    // PASO 1 - PREPARAR DOCUMENTOS
    // =============================================

    const respuestaColecciones = await llamarAPI(
      page,
      "collections.list",
      {}
    );

    const colecciones = obtenerData(
      respuestaColecciones
    );

    expect(Array.isArray(colecciones)).toBe(true);

    const welcome = colecciones.find(
      (coleccion: Objeto) =>
        coleccion.name === "Welcome"
    );

    expect(
      welcome,
      "No se encontró la colección Welcome"
    ).toBeTruthy();

    const collectionId = obtenerId(welcome);

    const sufijo = Date.now();

    const origen = await crearDocumento(
      page,
      collectionId,
      `QA HU09 - Informe semanal ${sufijo}`
    );

    const destino = await crearDocumento(
      page,
      collectionId,
      `QA HU09 - Proyectos ${sufijo}`
    );

    const estadoAnterior = await consultarDocumento(
      page,
      origen.id
    );

    const padreAnterior =
      estadoAnterior.parentDocumentId ?? null;

    expect(padreAnterior).toBeNull();

    guardarPaso(
      1,
      "Documentos de prueba preparados",
      {
        collectionId,
        origen,
        destino,
        parentDocumentIdAnterior: padreAnterior,
        csrfPresente: tieneCSRF,
      }
    );

    // =============================================
    // PASO 2 - EJECUTAR documents.move
    // =============================================

    const solicitudMovimiento = {
      id: origen.id,
      collectionId,
      parentDocumentId: destino.id,
    };

    const movimiento = await llamarAPI(
      page,
      "documents.move",
      solicitudMovimiento
    );

    guardarPaso(
      2,
      "Respuesta de documents.move",
      {
        solicitud: solicitudMovimiento,
        httpStatus: movimiento.status,
        respuesta: movimiento.body,
      }
    );

    expect(
      movimiento.ok,
      "documents.move debe aceptar el movimiento"
    ).toBe(true);

    // =============================================
    // PASO 3 - CONSULTAR NUEVO PADRE
    // =============================================

    const estadoPosterior = await consultarDocumento(
      page,
      origen.id
    );

    guardarPaso(
      3,
      "Comprobación de parentDocumentId",
      {
        documento: origen.id,
        padreAnterior,
        padreActual:
          estadoPosterior.parentDocumentId ?? null,
        padreEsperado: destino.id,
        collectionIdActual:
          estadoPosterior.collectionId,
      }
    );

    expect(
      estadoPosterior.parentDocumentId
    ).toBe(destino.id);

    expect(
      estadoPosterior.collectionId
    ).toBe(collectionId);

    // =============================================
    // PASO 4 - COMPROBAR ESTRUCTURA
    // =============================================

    const respuestaEstructura = await llamarAPI(
      page,
      "collections.documents",
      { id: collectionId }
    );

    const estructura = obtenerData(
      respuestaEstructura
    );

    const nodoOrigen = encontrarNodo(
      estructura,
      origen.id
    );

    const nodoDestino = encontrarNodo(
      estructura,
      destino.id
    );

    const origenAnidado = nodoDestino
      ? encontrarNodo(
          nodoDestino.children,
          origen.id
        )
      : null;

    // Algunas versiones devuelven una lista plana
    // con parentDocumentId en lugar de children.
    const relacionPlana =
      nodoOrigen?.parentDocumentId === destino.id;

    const estructuraCorrecta =
      Boolean(origenAnidado) || relacionPlana;

    guardarPaso(
      4,
      "Comprobación de estructura final",
      {
        origenEncontrado: Boolean(nodoOrigen),
        destinoEncontrado: Boolean(nodoDestino),
        origenAnidado: Boolean(origenAnidado),
        relacionPlana,
        estructuraCorrecta,
        padreConfirmadoPorDocumentsInfo:
          estadoPosterior.parentDocumentId,
      }
    );

    expect(
      nodoOrigen,
      "El documento de origen debe aparecer en la estructura"
    ).toBeTruthy();

    expect(
      nodoDestino,
      "El destino debe aparecer en la estructura"
    ).toBeTruthy();

    expect(
      estructuraCorrecta,
      "La estructura no confirmó que el origen esté bajo el destino"
    ).toBe(true);

    console.log("\n==================================");
    console.log("OL-TC-53: PRUEBA COMPLETADA");
    console.log("PASO 1: documentos preparados");
    console.log("PASO 2: movimiento aceptado");
    console.log("PASO 3: nuevo padre confirmado");
    console.log("PASO 4: estructura confirmada");
    console.log("==================================");
  }
);
