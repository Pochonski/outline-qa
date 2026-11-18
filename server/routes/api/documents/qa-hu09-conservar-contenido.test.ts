
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

describe("OL-TC-60 - Conservar contenido despues de mover documento", () => {
  it("mueve un documento sin modificar su titulo ni contenido", async () => {
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

    expect(antes).not.toBeNull();
    expect(origen.id).not.toBe(destino.id);
    expect(antes?.collectionId).toBe(origen.id);
    expect(antes?.title).toBe(tituloEsperado);
    expect(antes?.text).toBe(contenidoEsperado);

    guardar(1, "Documento con contenido conocido preparado", {
      documentoId,
      titulo: antes?.title,
      contenido: antes?.text,
      coleccionOrigen: origen.id,
      coleccionDestino: destino.id,
      contenidoCorrecto: antes?.text === contenidoEsperado,
    });

    // PASO 2: Mover el documento al destino permitido

    const respuesta = await server.post(
      "/api/documents.move",
      usuario,
      {
        body: {
          id: documentoId,
          collectionId: destino.id,
        },
      }
    );

    const cuerpo = await respuesta.json();

    guardar(2, "Solicitud de movimiento", {
      documentoId,
      coleccionOrigen: origen.id,
      coleccionDestino: destino.id,
      httpStatus: respuesta.status,
      respuestaOk: cuerpo.ok,
      mensaje: cuerpo.message ?? null,
    });

    expect(respuesta.status).toBe(200);
    expect(cuerpo.ok).toBe(true);

    // PASO 3: Consultar el documento después del movimiento

    const despues = await Document.findByPk(documentoId);

    expect(despues).not.toBeNull();

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

    expect(identificadorConservado).toBe(true);
    expect(tituloConservado).toBe(true);
    expect(contenidoConservado).toBe(true);

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

    expect(resultadoCorrecto).toBe(true);

  });
});
