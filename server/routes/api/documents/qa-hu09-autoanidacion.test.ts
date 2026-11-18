
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

const carpeta = path.resolve(
  process.cwd(),
  "qa-tests/evidencias"
);

describe("OL-TC-58 - Evitar mover un documento dentro de si mismo", () => {
  it("rechaza la autoanidacion y conserva la estructura", async () => {
    fs.mkdirSync(carpeta, { recursive: true });

    const resultados: Record<string, unknown>[] = [];

    function guardar(
      paso: number,
      descripcion: string,
      datos: Record<string, unknown>
    ) {
      resultados.push({ paso, descripcion, ...datos });

      fs.writeFileSync(
        path.join(carpeta, "OL-TC-58_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );

      console.log(`\n========== PASO ${paso} ==========`);
      console.log(descripcion);
      console.log(JSON.stringify(datos, null, 2));
    }

    // PASO 1: Preparar documento valido

    const usuario = await buildUser();

    const coleccion = await buildCollection({
      teamId: usuario.teamId,
    });

    const documento = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: coleccion.id,
    });

    const documentoId = documento.id;
    const coleccionOriginal = documento.collectionId;
    const padreOriginal = documento.parentDocumentId;

    expect(coleccionOriginal).toBe(coleccion.id);
    expect(padreOriginal).toBeNull();

    guardar(1, "Documento y ubicacion original preparados", {
      documentoId,
      titulo: documento.title,
      coleccionOriginal,
      padreOriginal,
      documentoExistente: true,
    });

    // PASO 2: Intentar poner el documento dentro de si mismo

    const respuesta = await server.post(
      "/api/documents.move",
      usuario,
      {
        body: {
          id: documentoId,
          collectionId: coleccion.id,
          parentDocumentId: documentoId,
        },
      }
    );

    const cuerpo = await respuesta.json();

    guardar(2, "Intento de autoanidacion", {
      documentoOrigenId: documentoId,
      padreSolicitadoId: documentoId,
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      solicitudRechazada: respuesta.status === 400,
    });

    expect(respuesta.status).toBe(400);
    expect(cuerpo.ok).toBe(false);
    expect(cuerpo.message).toContain(
      "infinite loop detected"
    );

    // PASO 3: Confirmar que no se modifico la ubicacion

    const actualizado = await Document.findByPk(documentoId);

    expect(actualizado).not.toBeNull();

    guardar(3, "Ubicacion despues del rechazo", {
      documentoId: actualizado?.id,
      coleccionAnterior: coleccionOriginal,
      coleccionActual: actualizado?.collectionId,
      padreAnterior: padreOriginal,
      padreActual: actualizado?.parentDocumentId,
      coleccionSinCambios:
        actualizado?.collectionId === coleccionOriginal,
      padreSinCambios:
        actualizado?.parentDocumentId === padreOriginal,
    });

    expect(actualizado?.collectionId).toBe(coleccionOriginal);
    expect(actualizado?.parentDocumentId).toBe(padreOriginal);

    // PASO 4: Comprobar que la jerarquia sigue siendo valida

    const documentosAutoanidados = await Document.count({
      where: {
        id: documentoId,
        parentDocumentId: documentoId,
      },
    });

    const documentoEnOrigen = await Document.findOne({
      where: {
        id: documentoId,
        collectionId: coleccionOriginal,
      },
    });

    guardar(4, "Verificacion de estructura jerarquica", {
      documentoEnOrigen: documentoEnOrigen !== null,
      documentosAutoanidados,
      padreActual: actualizado?.parentDocumentId,
      estructuraValida:
        documentoEnOrigen !== null &&
        documentosAutoanidados === 0 &&
        actualizado?.parentDocumentId === padreOriginal,
    });

    expect(documentoEnOrigen).not.toBeNull();
    expect(documentosAutoanidados).toBe(0);
    expect(actualizado?.parentDocumentId).toBeNull();

    console.log("\n====================================");
    console.log("OL-TC-58 - COMPROBACIONES COMPLETADAS");
    console.log("PASO 1 - Documento valido preparado");
    console.log("PASO 2 - Autoanidacion rechazada con HTTP 400");
    console.log("PASO 3 - Ubicacion original conservada");
    console.log("PASO 4 - Jerarquia sin autoanidacion");
    console.log("====================================");
  });
});
