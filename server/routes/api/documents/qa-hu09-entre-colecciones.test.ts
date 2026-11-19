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

describe("OL-TC-56 - Movimiento entre colecciones permitidas", () => {
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
      const registro = { paso, descripcion, ...datos };
      resultados.push(registro);

      fs.writeFileSync(
        path.join(carpeta, "OL-TC-56_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );
    }

    // PASO 1: Preparar dos colecciones y un documento

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
    const contenidoOriginal = documento.text;
    const tituloOriginal = documento.title;

    observaciones.push(origen.id);
    esperados.push(destino.id);
    observaciones.push(documento.collectionId);
    esperados.push(origen.id);

    guardar(1, "Documentos y colecciones preparados", {
      usuarioId: usuario.id,
      coleccionOrigenId: origen.id,
      coleccionDestinoId: destino.id,
      documentoId,
      tituloOriginal,
      contenidoOriginal,
      coleccionInicial: documento.collectionId,
    });

    // PASO 2: Ejecutar documents.move

    const respuesta = await server.post("/api/documents.move", usuario, {
      body: {
        id: documentoId,
        collectionId: destino.id,
      },
    });

    const cuerpo = await respuesta.json();

    guardar(2, "Respuesta del movimiento", {
      httpStatus: respuesta.status,
      coleccionDestinoEsperada: destino.id,
      respuestaOk: cuerpo.ok,
      error: cuerpo.error ?? null,
      mensaje: cuerpo.message ?? null,
    });

    observaciones.push(respuesta.status);
    esperados.push(200);
    observaciones.push(cuerpo.ok);
    esperados.push(true);

    // PASO 3: Confirmar nueva coleccion y contenido

    const actualizado = await Document.findByPk(documentoId);

    observaciones.push(actualizado);
    esperados.push(undefined);

    guardar(3, "Documento despues del movimiento", {
      documentoId: actualizado?.id,
      coleccionActual: actualizado?.collectionId,
      coleccionEsperada: destino.id,
      tituloConservado: actualizado?.title === tituloOriginal,
      contenidoConservado: actualizado?.text === contenidoOriginal,
    });

    observaciones.push(actualizado?.collectionId);
    esperados.push(destino.id);
    observaciones.push(actualizado?.title);
    esperados.push(tituloOriginal);
    observaciones.push(actualizado?.text);
    esperados.push(contenidoOriginal);

    // PASO 4: Verificar origen y destino

    const encontradoEnDestino = await Document.findOne({
      where: {
        id: documentoId,
        collectionId: destino.id,
      },
    });

    const encontradoEnOrigen = await Document.findOne({
      where: {
        id: documentoId,
        collectionId: origen.id,
      },
    });

    guardar(4, "Verificacion de ambas colecciones", {
      documentoEnDestino: encontradoEnDestino !== null,
      documentoEnOrigen: encontradoEnOrigen !== null,
      coleccionFinal: actualizado?.collectionId,
      movimientoCorrecto:
        encontradoEnDestino !== null && encontradoEnOrigen === null,
    });

    observaciones.push(encontradoEnDestino);
    esperados.push(undefined);
    observaciones.push(encontradoEnOrigen);
    esperados.push(undefined);
  });

  it("OL-TC-56 - usa colecciones distintas", () => {
    expect(observaciones[0]).not.toBe(esperados[0]);
  });

  it("OL-TC-56 - parte de la colección origen", () => {
    expect(observaciones[1]).toBe(esperados[1]);
  });

  it("OL-TC-56 - responde HTTP 200", () => {
    expect(observaciones[2]).toBe(esperados[2]);
  });

  it("OL-TC-56 - indica operación correcta", () => {
    expect(observaciones[3]).toBe(esperados[3]);
  });

  it("OL-TC-56 - encuentra el documento final", () => {
    expect(observaciones[4]).not.toBeNull();
  });

  it("OL-TC-56 - llega a la colección destino", () => {
    expect(observaciones[5]).toBe(esperados[5]);
  });

  it("OL-TC-56 - conserva el título", () => {
    expect(observaciones[6]).toBe(esperados[6]);
  });

  it("OL-TC-56 - conserva el contenido", () => {
    expect(observaciones[7]).toBe(esperados[7]);
  });

  it("OL-TC-56 - aparece en el destino", () => {
    expect(observaciones[8]).not.toBeNull();
  });

  it("OL-TC-56 - desaparece del origen", () => {
    expect(observaciones[9]).toBeNull();
  });
});
