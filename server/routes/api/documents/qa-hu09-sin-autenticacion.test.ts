import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, it, expect } from "vitest";
import { Document } from "@server/models";
import {
  buildUser,
  buildCollection,
  buildDocument,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const carpeta = path.resolve(process.cwd(), "qa-tests/evidencias");

describe("OL-TC-61 - Rechazar movimiento sin autenticacion", () => {
  let observaciones: unknown[];
  let esperados: unknown[];

  beforeEach(async () => {
    observaciones = [];
    esperados = [];
    fs.mkdirSync(carpeta, { recursive: true });

    const resultados: Record<string, unknown>[] = [];

    function guardar(
      paso: number,
      descripcion: string,
      datos: Record<string, unknown>
    ) {
      resultados.push({
        paso,
        descripcion,
        ...datos,
      });

      fs.writeFileSync(
        path.join(carpeta, "OL-TC-61_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );
    }

    // PASO 1: Preparar documento y destino validos

    const usuario = await buildUser();

    const origen = await buildCollection({
      teamId: usuario.teamId,
    });

    const destino = await buildCollection({
      teamId: usuario.teamId,
    });

    const documento = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: origen.id,
    });

    const documentoId = documento.id;
    const coleccionOriginal = documento.collectionId;
    const padreOriginal = documento.parentDocumentId;

    observaciones.push(origen.id);
    esperados.push(destino.id);
    observaciones.push(coleccionOriginal);
    esperados.push(origen.id);

    guardar(1, "Documento y destino preparados", {
      documentoId,
      titulo: documento.title,
      coleccionOriginal,
      padreOriginal,
      coleccionDestino: destino.id,
      usuarioAutorizadoId: usuario.id,
    });

    // PASO 2: Solicitud sin usuario autenticado

    // No pasamos el objeto usuario a server.post.
    // Esto simula una peticion sin sesion autenticada.

    const respuesta = await server.post("/api/documents.move", {
      body: {
        id: documentoId,
        collectionId: destino.id,
      },
    });

    guardar(2, "Solicitud de movimiento sin autenticacion", {
      endpoint: "/api/documents.move",
      metodo: "POST",
      documentoId,
      coleccionDestino: destino.id,
      usuarioAutenticado: false,
      solicitudEnviada: true,
    });

    // PASO 3: Comprobar respuesta HTTP 401

    const cuerpo = await respuesta.json();

    guardar(3, "Respuesta del servidor sin autenticacion", {
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      resultadoEsperado: 401,
      movimientoRechazado: respuesta.status === 401,
    });

    observaciones.push(respuesta.status);
    esperados.push(401);
    observaciones.push(cuerpo.ok);
    esperados.push(false);

    // PASO 4: Comprobar que el documento sigue igual

    const actualizado = await Document.findByPk(documentoId);

    observaciones.push(actualizado);
    esperados.push(undefined);

    const ubicacionConservada =
      actualizado?.collectionId === coleccionOriginal &&
      actualizado?.parentDocumentId === padreOriginal;

    const encontradoEnOrigen = await Document.findOne({
      where: {
        id: documentoId,
        collectionId: origen.id,
      },
    });

    const encontradoEnDestino = await Document.findOne({
      where: {
        id: documentoId,
        collectionId: destino.id,
      },
    });

    guardar(4, "Verificacion final de ubicacion", {
      coleccionAnterior: coleccionOriginal,
      coleccionActual: actualizado?.collectionId,
      padreAnterior: padreOriginal,
      padreActual: actualizado?.parentDocumentId,
      encontradoEnOrigen: encontradoEnOrigen !== null,
      encontradoEnDestino: encontradoEnDestino !== null,
      ubicacionConservada,
    });

    observaciones.push(ubicacionConservada);
    esperados.push(true);
    observaciones.push(encontradoEnOrigen);
    esperados.push(undefined);
    observaciones.push(encontradoEnDestino);
    esperados.push(undefined);
  });

  it("OL-TC-61 - usa colecciones distintas", () => {
    expect(observaciones[0]).not.toBe(esperados[0]);
  });

  it("OL-TC-61 - parte de la colección origen", () => {
    expect(observaciones[1]).toBe(esperados[1]);
  });

  it("OL-TC-61 - responde HTTP 401", () => {
    expect(observaciones[2]).toBe(esperados[2]);
  });

  it("OL-TC-61 - indica operación fallida", () => {
    expect(observaciones[3]).toBe(esperados[3]);
  });

  it("OL-TC-61 - encuentra el documento final", () => {
    expect(observaciones[4]).not.toBeNull();
  });

  it("OL-TC-61 - conserva la ubicación", () => {
    expect(observaciones[5]).toBe(esperados[5]);
  });

  it("OL-TC-61 - permanece en el origen", () => {
    expect(observaciones[6]).not.toBeNull();
  });

  it("OL-TC-61 - no aparece en el destino", () => {
    expect(observaciones[7]).toBeNull();
  });
});
