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

describe("OL-TC-58 - Evitar mover un documento dentro de si mismo", () => {
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
      resultados.push({ paso, descripcion, ...datos });

      fs.writeFileSync(
        path.join(carpeta, "OL-TC-58_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );
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

    observaciones.push(coleccionOriginal);
    esperados.push(coleccion.id);
    observaciones.push(padreOriginal);
    esperados.push(undefined);

    guardar(1, "Documento y ubicacion original preparados", {
      documentoId,
      titulo: documento.title,
      coleccionOriginal,
      padreOriginal,
      documentoExistente: true,
    });

    // PASO 2: Intentar poner el documento dentro de si mismo

    const respuesta = await server.post("/api/documents.move", usuario, {
      body: {
        id: documentoId,
        collectionId: coleccion.id,
        parentDocumentId: documentoId,
      },
    });

    const cuerpo = await respuesta.json();

    guardar(2, "Intento de autoanidacion", {
      documentoOrigenId: documentoId,
      padreSolicitadoId: documentoId,
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      solicitudRechazada: respuesta.status === 400,
    });

    observaciones.push(respuesta.status);
    esperados.push(400);
    observaciones.push(cuerpo.ok);
    esperados.push(false);
    observaciones.push(cuerpo.message);
    esperados.push("infinite loop detected");

    // PASO 3: Confirmar que no se modifico la ubicacion

    const actualizado = await Document.findByPk(documentoId);

    observaciones.push(actualizado);
    esperados.push(undefined);

    guardar(3, "Ubicacion despues del rechazo", {
      documentoId: actualizado?.id,
      coleccionAnterior: coleccionOriginal,
      coleccionActual: actualizado?.collectionId,
      padreAnterior: padreOriginal,
      padreActual: actualizado?.parentDocumentId,
      coleccionSinCambios: actualizado?.collectionId === coleccionOriginal,
      padreSinCambios: actualizado?.parentDocumentId === padreOriginal,
    });

    observaciones.push(actualizado?.collectionId);
    esperados.push(coleccionOriginal);
    observaciones.push(actualizado?.parentDocumentId);
    esperados.push(padreOriginal);

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

    observaciones.push(documentoEnOrigen);
    esperados.push(undefined);
    observaciones.push(documentosAutoanidados);
    esperados.push(0);
    observaciones.push(actualizado?.parentDocumentId);
    esperados.push(undefined);
  });

  it("OL-TC-58 - parte de la colección original", () => {
    expect(observaciones[0]).toBe(esperados[0]);
  });

  it("OL-TC-58 - parte sin documento padre", () => {
    expect(observaciones[1]).toBeNull();
  });

  it("OL-TC-58 - responde HTTP 400", () => {
    expect(observaciones[2]).toBe(esperados[2]);
  });

  it("OL-TC-58 - indica operación fallida", () => {
    expect(observaciones[3]).toBe(esperados[3]);
  });

  it("OL-TC-58 - explica el ciclo", () => {
    expect(observaciones[4]).toContain(esperados[4]);
  });

  it("OL-TC-58 - conserva el documento", () => {
    expect(observaciones[5]).not.toBeNull();
  });

  it("OL-TC-58 - conserva la colección", () => {
    expect(observaciones[6]).toBe(esperados[6]);
  });

  it("OL-TC-58 - conserva el padre", () => {
    expect(observaciones[7]).toBe(esperados[7]);
  });

  it("OL-TC-58 - permanece en el origen", () => {
    expect(observaciones[8]).not.toBeNull();
  });

  it("OL-TC-58 - no crea autoanidación", () => {
    expect(observaciones[9]).toBe(esperados[9]);
  });

  it("OL-TC-58 - permanece sin padre", () => {
    expect(observaciones[10]).toBeNull();
  });
});
