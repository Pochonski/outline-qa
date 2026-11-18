
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
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

describe("OL-TC-57 - Rechazar movimiento a destino invalido", () => {
  it("rechaza un destino inexistente y conserva el documento", async () => {
    fs.mkdirSync(carpeta, { recursive: true });

    const resultados: Record<string, unknown>[] = [];

    function guardar(
      paso: number,
      descripcion: string,
      datos: Record<string, unknown>
    ) {
      resultados.push({ paso, descripcion, ...datos });

      fs.writeFileSync(
        path.join(carpeta, "OL-TC-57_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );

    }

    // PASO 1: Preparar documento de origen

    const usuario = await buildUser();

    const coleccion = await buildCollection({
      teamId: usuario.teamId,
    });

    const documento = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: coleccion.id,
    });

    const idDocumento = documento.id;
    const coleccionOriginal = documento.collectionId;
    const padreOriginal = documento.parentDocumentId;

    expect(coleccionOriginal).toBe(coleccion.id);

    guardar(1, "Documento de origen preparado", {
      usuarioId: usuario.id,
      documentoId: idDocumento,
      titulo: documento.title,
      coleccionOriginal,
      padreOriginal,
    });

    // PASO 2: Intentar mover a un destino inexistente

    const destinoInexistente = randomUUID();

    const destinoEnBase = await Document.findByPk(
      destinoInexistente
    );

    expect(destinoEnBase).toBeNull();

    const respuesta = await server.post(
      "/api/documents.move",
      usuario,
      {
        body: {
          id: idDocumento,
          collectionId: coleccion.id,
          parentDocumentId: destinoInexistente,
        },
      }
    );

    const cuerpo = await respuesta.json();

    guardar(2, "Solicitud hacia destino inexistente", {
      documentoId: idDocumento,
      parentDocumentIdInexistente: destinoInexistente,
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      solicitudRechazada: respuesta.status >= 400,
    });

    expect(respuesta.status).toBeGreaterThanOrEqual(400);
    expect(respuesta.status).toBeLessThan(500);

    // PASO 3: Verificar que no cambio la ubicacion

    const actualizado = await Document.findByPk(idDocumento);

    expect(actualizado).not.toBeNull();

    guardar(3, "Ubicacion despues del rechazo", {
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

    // PASO 4: Confirmar permanencia en origen

    const encontradoEnOrigen = await Document.findOne({
      where: {
        id: idDocumento,
        collectionId: coleccionOriginal,
      },
    });

    const encontradoEnDestino = await Document.findOne({
      where: {
        id: idDocumento,
        parentDocumentId: destinoInexistente,
      },
    });

    guardar(4, "Verificacion de estructura original", {
      encontradoEnOrigen: encontradoEnOrigen !== null,
      encontradoEnDestino: encontradoEnDestino !== null,
      coleccionActual: actualizado?.collectionId,
      padreActual: actualizado?.parentDocumentId,
      estructuraCorrecta:
        encontradoEnOrigen !== null &&
        encontradoEnDestino === null,
    });

    expect(encontradoEnOrigen).not.toBeNull();
    expect(encontradoEnDestino).toBeNull();

  });
});
