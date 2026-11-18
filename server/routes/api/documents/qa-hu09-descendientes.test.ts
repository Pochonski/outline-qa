
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { Document } from "@server/models";
import {
  buildUser,
  buildCollection,
  buildDocument,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const carpeta = path.resolve(process.cwd(), "qa-tests/evidencias");

describe("OL-TC-59 - Evitar mover un documento dentro de sus descendientes", () => {
  it("rechaza el movimiento del padre dentro de su hijo", async () => {
    fs.mkdirSync(carpeta, { recursive: true });

    const resultados: Record<string, unknown>[] = [];

    function guardar(
      paso: number,
      descripcion: string,
      datos: Record<string, unknown>
    ) {
      resultados.push({ paso, descripcion, ...datos });

      fs.writeFileSync(
        path.join(carpeta, "OL-TC-59_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );

      console.log(`\n========== PASO ${paso} ==========`);
      console.log(descripcion);
      console.log(JSON.stringify(datos, null, 2));
    }

    // PASO 1: Crear documento padre e hijo

    const usuario = await buildUser();

    const coleccion = await buildCollection({
      teamId: usuario.teamId,
    });

    const padre = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: coleccion.id,
    });

    const hijo = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: coleccion.id,
      parentDocumentId: padre.id,
    });

    const padreOriginal = await Document.findByPk(padre.id);
    const hijoOriginal = await Document.findByPk(hijo.id);

    expect(padreOriginal).not.toBeNull();
    expect(hijoOriginal).not.toBeNull();
    expect(padreOriginal?.parentDocumentId).toBeNull();
    expect(hijoOriginal?.parentDocumentId).toBe(padre.id);

    const coleccionPadreOriginal = padreOriginal!.collectionId;
    const padreDelPadreOriginal = padreOriginal!.parentDocumentId;
    const coleccionHijoOriginal = hijoOriginal!.collectionId;

    guardar(1, "Estructura padre e hijo preparada", {
      documentoPadreId: padre.id,
      documentoHijoId: hijo.id,
      coleccionId: coleccion.id,
      coleccionPadreOriginal,
      padreDelPadreOriginal,
      padreDelHijo: hijoOriginal?.parentDocumentId,
      estructuraPreparada: hijoOriginal?.parentDocumentId === padre.id,
    });

    // PASO 2: Intentar mover el padre dentro de su hijo

    const respuesta = await server.post(
      "/api/documents.move",
      usuario,
      {
        body: {
          id: padre.id,
          collectionId: coleccion.id,
          parentDocumentId: hijo.id,
        },
      }
    );

    const cuerpo = await respuesta.json();

    guardar(2, "Intento de movimiento circular", {
      documentoOrigenId: padre.id,
      destinoSolicitadoId: hijo.id,
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      rechazado: respuesta.status === 400,
    });

    expect(respuesta.status).toBe(400);
    expect(cuerpo.ok).toBe(false);
    expect(cuerpo.message).toContain("infinite loop detected");

    // PASO 3: Comprobar ubicacion del padre

    const padreActualizado = await Document.findByPk(padre.id);

    expect(padreActualizado).not.toBeNull();

    guardar(3, "Ubicacion del padre despues del rechazo", {
      coleccionAnterior: coleccionPadreOriginal,
      coleccionActual: padreActualizado?.collectionId,
      padreAnterior: padreDelPadreOriginal,
      padreActual: padreActualizado?.parentDocumentId,
      coleccionSinCambios:
        padreActualizado?.collectionId === coleccionPadreOriginal,
      ubicacionSinCambios:
        padreActualizado?.parentDocumentId === padreDelPadreOriginal,
    });

    expect(padreActualizado?.collectionId).toBe(coleccionPadreOriginal);
    expect(padreActualizado?.parentDocumentId).toBe(padreDelPadreOriginal);

    // PASO 4: Comprobar estructura final

    const hijoActualizado = await Document.findByPk(hijo.id);

    expect(hijoActualizado).not.toBeNull();

    const estructuraCorrecta =
      hijoActualizado?.parentDocumentId === padre.id &&
      hijoActualizado?.collectionId === coleccionHijoOriginal &&
      padreActualizado?.parentDocumentId === null;

    guardar(4, "Verificacion de estructura jerarquica", {
      documentoPadreId: padre.id,
      documentoHijoId: hijo.id,
      padreDelPadre: padreActualizado?.parentDocumentId,
      padreDelHijo: hijoActualizado?.parentDocumentId,
      coleccionPadre: padreActualizado?.collectionId,
      coleccionHijo: hijoActualizado?.collectionId,
      estructuraCorrecta,
      relacionCircular: padreActualizado?.parentDocumentId === hijo.id,
    });

    expect(estructuraCorrecta).toBe(true);
    expect(padreActualizado?.parentDocumentId).not.toBe(hijo.id);

    console.log("\n====================================");
    console.log("OL-TC-59 - COMPROBACIONES COMPLETADAS");
    console.log("PASO 1 - Padre e hijo preparados");
    console.log("PASO 2 - Movimiento circular rechazado");
    console.log("PASO 3 - Padre conserva su ubicacion");
    console.log("PASO 4 - Jerarquia original conservada");
    console.log("====================================");
  });
});
