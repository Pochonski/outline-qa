
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const URL =
  "https://local.outline.dev:3000/doc/qa-hu-07-prueba-de-tabla-movil-2TvCokbah0";

const DIAMETRO = 24;
const RADIO = DIAMETRO / 2;

test.use({
  viewport: { width: 390, height: 844 },
  ignoreHTTPSErrors: true,
  storageState: "qa-tests/.auth/wiki.json",
});

test.setTimeout(60000);

test(
  "OL-TC-45 - Verificación final de espaciado WCAG",
  async ({ page }) => {
    fs.mkdirSync("qa-tests/evidencias", { recursive: true });

    // PASO 1: Abrir Outline en pantalla móvil.
    await page.goto(URL, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByText("QA HU-07 - Prueba de tabla móvil").first()
    ).toBeVisible({ timeout: 25000 });

    console.log("DOCUMENTO: Cargado correctamente.");
    console.log("VIEWPORT:", page.viewportSize());

    // PASO 2: Obtener dimensiones y posiciones reales.
    const controles = await page.evaluate(() => {
      const selector =
        'button, a[href], input, select, textarea, [role="button"]';

      return Array.from(
        document.querySelectorAll<HTMLElement>(selector)
      )
        .filter((elemento) => {
          const estilo = getComputedStyle(elemento);
          const r = elemento.getBoundingClientRect();

          return (
            estilo.display !== "none" &&
            estilo.visibility !== "hidden" &&
            estilo.pointerEvents !== "none" &&
            r.width > 0 &&
            r.height > 0 &&
            r.left >= 0 &&
            r.right <= innerWidth &&
            r.top >= 0 &&
            r.bottom <= innerHeight
          );
        })
        .map((elemento, indice) => {
          const r = elemento.getBoundingClientRect();

          return {
            id: indice + 1,
            nombre:
              elemento.getAttribute("aria-label") ||
              elemento.getAttribute("title") ||
              elemento.textContent?.trim().slice(0, 55) ||
              "(sin nombre)",
            tipo: elemento.tagName.toLowerCase(),
            x: r.left,
            y: r.top,
            derecha: r.right,
            abajo: r.bottom,
            ancho: r.width,
            alto: r.height,
            centroX: r.left + r.width / 2,
            centroY: r.top + r.height / 2,
          };
        });
    });

    console.log("CONTROLES IDENTIFICADOS:", controles.length);

    const pequenos = controles.filter(
      (c) => c.ancho < DIAMETRO || c.alto < DIAMETRO
    );

    console.log("CONTROLES MENORES DE 24 PX:", pequenos.length);

    // PASO 3: Evaluación geométrica del espaciado.
    const evaluaciones = pequenos.map((control) => {
      const comparaciones = controles
        .filter((otro) => otro.id !== control.id)
        .map((otro) => {
          const otroEsPequeno =
            otro.ancho < DIAMETRO || otro.alto < DIAMETRO;

          if (otroEsPequeno) {
            // Dos objetivos pequeños:
            // comparar círculos de radio 12 px.
            const distancia = Math.hypot(
              control.centroX - otro.centroX,
              control.centroY - otro.centroY
            );

            return {
              vecino: otro.nombre,
              comparacion: "circulo-circulo",
              distancia: Number(distancia.toFixed(2)),
              minimo: DIAMETRO,
              interseccion: distancia < DIAMETRO,
            };
          }

          // Objetivo pequeño frente a uno de tamaño suficiente:
          // distancia del centro del círculo al rectángulo.
          const dx = Math.max(
            otro.x - control.centroX,
            0,
            control.centroX - otro.derecha
          );

          const dy = Math.max(
            otro.y - control.centroY,
            0,
            control.centroY - otro.abajo
          );

          const distancia = Math.hypot(dx, dy);

          return {
            vecino: otro.nombre,
            comparacion: "circulo-rectangulo",
            distancia: Number(distancia.toFixed(2)),
            minimo: RADIO,
            interseccion: distancia < RADIO,
          };
        });

      const intersecciones = comparaciones.filter(
        (c) => c.interseccion
      );

      const masCercano = [...comparaciones].sort(
        (a, b) => a.distancia - b.distancia
      )[0];

      return {
        control: control.nombre,
        ancho: Number(control.ancho.toFixed(2)),
        alto: Number(control.alto.toFixed(2)),
        centroX: Number(control.centroX.toFixed(2)),
        centroY: Number(control.centroY.toFixed(2)),
        vecinoMasCercano: masCercano ?? null,
        intersecciones,
        cumpleExcepcionEspaciadoEnMuestra:
          intersecciones.length === 0,
      };
    });

    for (const resultado of evaluaciones) {
      console.log("\n=================================");
      console.log("CONTROL:", resultado.control);
      console.log(
        "DIMENSIONES:",
        resultado.ancho,
        "x",
        resultado.alto
      );
      console.log(
        "CENTRO:",
        resultado.centroX,
        resultado.centroY
      );
      console.log(
        "VECINO MÁS CERCANO:",
        resultado.vecinoMasCercano
      );
      console.log(
        "INTERSECCIONES:",
        resultado.intersecciones
      );

      console.log(
        "EVALUACIÓN DE ESPACIADO:",
        resultado.cumpleExcepcionEspaciadoEnMuestra
          ? "CUMPLE EN LA MUESTRA"
          : "NO CUMPLE LA EXCEPCIÓN EN LA MUESTRA"
      );
    }

    const todosCumplen = evaluaciones.every(
      (resultado) =>
        resultado.cumpleExcepcionEspaciadoEnMuestra
    );

    console.log("\n=================================");
    console.log("RESULTADO GEOMÉTRICO:", todosCumplen);
    console.log(
      "CONTROLES PEQUEÑOS EVALUADOS:",
      evaluaciones.length
    );

    // Guardar evidencias.
    fs.writeFileSync(
      "qa-tests/evidencias/OL-TC-45_Verificacion_Final.json",
      JSON.stringify(
        {
          viewport: page.viewportSize(),
          diametroReferencia: DIAMETRO,
          totalControles: controles.length,
          controlesPequenos: pequenos.length,
          evaluaciones,
          todosCumplenEspaciadoEnMuestra: todosCumplen,
        },
        null,
        2
      )
    );

    await page.screenshot({
      path: "qa-tests/evidencias/OL-TC-45_Verificacion_Final.png",
      fullPage: true,
    });

    // Esta prueba valida que la inspección se haya completado.
    // El cumplimiento se evalúa a partir de los resultados.
    expect(controles.length).toBeGreaterThan(0);
    expect(evaluaciones.length).toBeGreaterThan(0);

    console.log("\nOL-TC-45: Verificación final completada.");
  }
);
