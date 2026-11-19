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

describe("OL-TC-60 - Conservar contenido despues de mover documento", () => {
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
        path.join(carpeta, "OL-TC-60_Resultados.json"),
        JSON.stringify(resultados, null, 2),
        "utf8"
      );
    }

    // PASO 1: Preparar un documento con contenido conocido

    const usuario = await buildUser();

    const origen = await buildCollection({
      teamId: usuario.teamId,
    });

    const destino = await buildCollection({
      teamId: usuario.teamId,
    });

    const tituloEsperado = "Informe semanal";
    const contenidoEsperado =
      "Primer párrafo de prueba.\n\nSegundo párrafo de prueba.";

    const documento = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: origen.id,
      title: tituloEsperado,
      text: contenidoEsperado,
    });

    const documentoId = documento.id;

    const antes = await Document.findByPk(documentoId);

    observaciones.push(antes);
    esperados.push(undefined);
    observaciones.push(origen.id);
    esperados.push(destino.id);
    observaciones.push(antes?.collectionId);
    esperados.push(origen.id);
    observaciones.push(antes?.title);
    esperados.push(tituloEsperado);
    observaciones.push(antes?.text);
    esperados.push(contenidoEsperado);

    guardar(1, "Documento con contenido conocido preparado", {
      documentoId,
      titulo: antes?.title,
      contenido: antes?.text,
      coleccionOrigen: origen.id,
      coleccionDestino: destino.id,
      contenidoCorrecto: antes?.text === contenidoEsperado,
    });

    // PASO 2: Mover el documento al destino permitido

    const respuesta = await server.post("/api/documents.move", usuario, {
      body: {
        id: documentoId,
        collectionId: destino.id,
      },
    });

    const cuerpo = await respuesta.json();

    guardar(2, "Solicitud de movimiento", {
      documentoId,
      coleccionOrigen: origen.id,
      coleccionDestino: destino.id,
      httpStatus: respuesta.status,
      respuestaOk: cuerpo.ok,
      mensaje: cuerpo.message ?? null,
    });

    observaciones.push(respuesta.status);
    esperados.push(200);
    observaciones.push(cuerpo.ok);
    esperados.push(true);

    // PASO 3: Consultar el documento después del movimiento

    const despues = await Document.findByPk(documentoId);

    observaciones.push(despues);
    esperados.push(undefined);

    const tituloConservado = despues?.title === tituloEsperado;
    const contenidoConservado = despues?.text === contenidoEsperado;
    const identificadorConservado = despues?.id === documentoId;

    guardar(3, "Datos del documento despues del movimiento", {
      documentoId: despues?.id,
      tituloAntes: tituloEsperado,
      tituloDespues: despues?.title,
      contenidoAntes: contenidoEsperado,
      contenidoDespues: despues?.text,
      tituloConservado,
      contenidoConservado,
      identificadorConservado,
    });

    observaciones.push(identificadorConservado);
    esperados.push(true);
    observaciones.push(tituloConservado);
    esperados.push(true);
    observaciones.push(contenidoConservado);
    esperados.push(true);

    // PASO 4: Confirmar ubicación final y contenido

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

    const resultadoCorrecto =
      encontradoEnDestino !== null &&
      encontradoEnOrigen === null &&
      encontradoEnDestino.title === tituloEsperado &&
      encontradoEnDestino.text === contenidoEsperado;

    guardar(4, "Verificacion final de ubicacion y contenido", {
      documentoEnDestino: encontradoEnDestino !== null,
      documentoEnOrigen: encontradoEnOrigen !== null,
      tituloFinal: encontradoEnDestino?.title,
      contenidoFinal: encontradoEnDestino?.text,
      resultadoCorrecto,
    });

    observaciones.push(resultadoCorrecto);
    esperados.push(true);
  });

  it("OL-TC-60 - encuentra el documento inicial", () => {
    expect(observaciones[0]).not.toBeNull();
  });

  it("OL-TC-60 - usa colecciones distintas", () => {
    expect(observaciones[1]).not.toBe(esperados[1]);
  });

  it("OL-TC-60 - parte de la colección origen", () => {
    expect(observaciones[2]).toBe(esperados[2]);
  });

  it("OL-TC-60 - parte con el título esperado", () => {
    expect(observaciones[3]).toBe(esperados[3]);
  });

  it("OL-TC-60 - parte con el contenido esperado", () => {
    expect(observaciones[4]).toBe(esperados[4]);
  });

  it("OL-TC-60 - responde HTTP 200", () => {
    expect(observaciones[5]).toBe(esperados[5]);
  });

  it("OL-TC-60 - indica operación correcta", () => {
    expect(observaciones[6]).toBe(esperados[6]);
  });

  it("OL-TC-60 - encuentra el documento final", () => {
    expect(observaciones[7]).not.toBeNull();
  });

  it("OL-TC-60 - conserva el identificador", () => {
    expect(observaciones[8]).toBe(esperados[8]);
  });

  it("OL-TC-60 - conserva el título", () => {
    expect(observaciones[9]).toBe(esperados[9]);
  });

  it("OL-TC-60 - conserva el contenido", () => {
    expect(observaciones[10]).toBe(esperados[10]);
  });

  it("OL-TC-60 - conserva ubicación y contenido", () => {
    expect(observaciones[11]).toBe(esperados[11]);
  });
});
