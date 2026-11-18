
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

describe("OL-TC-56 - Movimiento entre colecciones permitidas", () => {
  it("mueve el documento y conserva su contenido", async () => {
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

      console.log(`\n========== PASO ${paso} ==========`);
      console.log(descripcion);
      console.log(JSON.stringify(datos, null, 2));
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

    expect(origen.id).not.toBe(destino.id);
    expect(documento.collectionId).toBe(origen.id);

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

    guardar(2, "Respuesta del movimiento", {
      httpStatus: respuesta.status,
      coleccionDestinoEsperada: destino.id,
      respuestaOk: cuerpo.ok,
      error: cuerpo.error ?? null,
      mensaje: cuerpo.message ?? null,
    });

    expect(respuesta.status).toBe(200);
    expect(cuerpo.ok).toBe(true);

    // PASO 3: Confirmar nueva coleccion y contenido

    const actualizado = await Document.findByPk(documentoId);

    expect(actualizado).not.toBeNull();

    guardar(3, "Documento despues del movimiento", {
      documentoId: actualizado?.id,
      coleccionActual: actualizado?.collectionId,
      coleccionEsperada: destino.id,
      tituloConservado: actualizado?.title === tituloOriginal,
      contenidoConservado: actualizado?.text === contenidoOriginal,
    });

    expect(actualizado?.collectionId).toBe(destino.id);
    expect(actualizado?.title).toBe(tituloOriginal);
    expect(actualizado?.text).toBe(contenidoOriginal);

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
        encontradoEnDestino !== null &&
        encontradoEnOrigen === null,
    });

    expect(encontradoEnDestino).not.toBeNull();
    expect(encontradoEnOrigen).toBeNull();

    console.log("\n======================================");
    console.log("OL-TC-56 - COMPROBACIONES COMPLETADAS");
    console.log("PASO 1 - Dos colecciones preparadas");
    console.log("PASO 2 - Movimiento aceptado con HTTP 200");
    console.log("PASO 3 - Documento y contenido conservados");
    console.log("PASO 4 - Documento ubicado en destino");
    console.log("======================================");
  });
});
