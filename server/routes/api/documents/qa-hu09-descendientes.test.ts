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

describe("OL-TC-59 - Evitar mover un documento dentro de sus descendientes", () => {
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
        path.join(carpeta, "OL-TC-59_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );
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

    observaciones.push(padreOriginal);
    esperados.push(undefined);
    observaciones.push(hijoOriginal);
    esperados.push(undefined);
    observaciones.push(padreOriginal?.parentDocumentId);
    esperados.push(undefined);
    observaciones.push(hijoOriginal?.parentDocumentId);
    esperados.push(padre.id);

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

    const respuesta = await server.post("/api/documents.move", usuario, {
      body: {
        id: padre.id,
        collectionId: coleccion.id,
        parentDocumentId: hijo.id,
      },
    });

    const cuerpo = await respuesta.json();

    guardar(2, "Intento de movimiento circular", {
      documentoOrigenId: padre.id,
      destinoSolicitadoId: hijo.id,
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      rechazado: respuesta.status === 400,
    });

    observaciones.push(respuesta.status);
    esperados.push(400);
    observaciones.push(cuerpo.ok);
    esperados.push(false);
    observaciones.push(cuerpo.message);
    esperados.push("infinite loop detected");

    // PASO 3: Comprobar ubicacion del padre

    const padreActualizado = await Document.findByPk(padre.id);

    observaciones.push(padreActualizado);
    esperados.push(undefined);

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

    observaciones.push(padreActualizado?.collectionId);
    esperados.push(coleccionPadreOriginal);
    observaciones.push(padreActualizado?.parentDocumentId);
    esperados.push(padreDelPadreOriginal);

    // PASO 4: Comprobar estructura final

    const hijoActualizado = await Document.findByPk(hijo.id);

    observaciones.push(hijoActualizado);
    esperados.push(undefined);

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

    observaciones.push(estructuraCorrecta);
    esperados.push(true);
    observaciones.push(padreActualizado?.parentDocumentId);
    esperados.push(hijo.id);
  });

  it("OL-TC-59 - encuentra el padre inicial", () => {
    expect(observaciones[0]).not.toBeNull();
  });

  it("OL-TC-59 - encuentra el hijo inicial", () => {
    expect(observaciones[1]).not.toBeNull();
  });

  it("OL-TC-59 - el padre inicia en la raíz", () => {
    expect(observaciones[2]).toBeNull();
  });

  it("OL-TC-59 - el hijo inicia bajo el padre", () => {
    expect(observaciones[3]).toBe(esperados[3]);
  });

  it("OL-TC-59 - responde HTTP 400", () => {
    expect(observaciones[4]).toBe(esperados[4]);
  });

  it("OL-TC-59 - indica operación fallida", () => {
    expect(observaciones[5]).toBe(esperados[5]);
  });

  it("OL-TC-59 - explica el ciclo", () => {
    expect(observaciones[6]).toContain(esperados[6]);
  });

  it("OL-TC-59 - encuentra el padre final", () => {
    expect(observaciones[7]).not.toBeNull();
  });

  it("OL-TC-59 - conserva la colección del padre", () => {
    expect(observaciones[8]).toBe(esperados[8]);
  });

  it("OL-TC-59 - conserva la ubicación del padre", () => {
    expect(observaciones[9]).toBe(esperados[9]);
  });

  it("OL-TC-59 - encuentra el hijo final", () => {
    expect(observaciones[10]).not.toBeNull();
  });

  it("OL-TC-59 - conserva la jerarquía", () => {
    expect(observaciones[11]).toBe(esperados[11]);
  });

  it("OL-TC-59 - no anida el padre bajo el hijo", () => {
    expect(observaciones[12]).not.toBe(esperados[12]);
  });
});
