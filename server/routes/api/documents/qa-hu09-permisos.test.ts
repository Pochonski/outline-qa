
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { CollectionPermission } from "@shared/types";
import { Document, UserMembership } from "@server/models";
import {
  buildUser,
  buildCollection,
  buildDocument,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const CARPETA = path.resolve(
  process.cwd(),
  "qa-tests/evidencias"
);

const ARCHIVO = path.join(
  CARPETA,
  "OL-TC-54_Resultados.json"
);

type Registro = Record<string, unknown>;

describe("OL-TC-54 - Rechazar movimiento sin permisos", () => {
  it("rechaza el movimiento y conserva la ubicacion original", async () => {
    const evidencias: Registro[] = [];

    fs.mkdirSync(CARPETA, { recursive: true });

    function guardar(
      paso: number,
      descripcion: string,
      datos: Registro
    ) {
      const registro = {
        paso,
        descripcion,
        ...datos,
      };

      evidencias.push(registro);

      fs.writeFileSync(
        ARCHIVO,
        JSON.stringify(evidencias, null, 2),
        "utf8"
      );

    }

    // ==========================================
    // PASO 1 - PREPARAR USUARIO Y PERMISOS
    // ==========================================

    const usuario = await buildUser();

    const origenColeccion = await buildCollection({
      teamId: usuario.teamId,
    });

    const destinoColeccion = await buildCollection({
      teamId: usuario.teamId,
      permission: null,
    });

    const origen = await buildDocument({
      userId: usuario.id,
      teamId: usuario.teamId,
      collectionId: origenColeccion.id,
    });

    // El usuario solo puede LEER el destino.
    await UserMembership.create({
      createdById: usuario.id,
      userId: usuario.id,
      collectionId: destinoColeccion.id,
      permission: CollectionPermission.Read,
    });

    const membresia = await UserMembership.findOne({
      where: {
        userId: usuario.id,
        collectionId: destinoColeccion.id,
      },
    });

    expect(membresia).not.toBeNull();

    expect(membresia?.permission).toBe(
      CollectionPermission.Read
    );

    const coleccionAnterior = origen.collectionId;
    const padreAnterior = origen.parentDocumentId ?? null;

    guardar(1, "Escenario de permisos preparado", {
      usuarioId: usuario.id,
      documentoOrigenId: origen.id,
      coleccionOrigenId: coleccionAnterior,
      coleccionDestinoId: destinoColeccion.id,
      permisoDestino: membresia?.permission,
      permisoEsperado: CollectionPermission.Read,
      padreAnterior,
      resultado: "ESCENARIO PREPARADO",
    });

    // ==========================================
    // PASO 2 - INTENTAR MOVER SIN PERMISOS
    // ==========================================

    const respuesta = await server.post(
      "/api/documents.move",
      usuario,
      {
        body: {
          id: origen.id,
          collectionId: destinoColeccion.id,
        },
      }
    );

    const cuerpo = await respuesta.json();

    guardar(2, "Respuesta de documents.move", {
      solicitud: {
        id: origen.id,
        collectionId: destinoColeccion.id,
      },
      httpStatus: respuesta.status,
      respuesta: cuerpo,
      resultadoEsperado: 403,
    });

    expect(respuesta.status).toBe(403);

    // ==========================================
    // PASO 3 - VERIFICAR UBICACION ORIGINAL
    // ==========================================

    await origen.reload();

    const coleccionActual = origen.collectionId;
    const padreActual = origen.parentDocumentId ?? null;

    guardar(3, "Ubicacion despues del rechazo", {
      coleccionAnterior,
      coleccionActual,
      padreAnterior,
      padreActual,
      coleccionSinCambios:
        coleccionAnterior === coleccionActual,
      padreSinCambios:
        padreAnterior === padreActual,
    });

    expect(coleccionActual).toBe(coleccionAnterior);
    expect(padreActual).toBe(padreAnterior);

    // ==========================================
    // PASO 4 - VERIFICAR COLECCION DESTINO
    // ==========================================

    const documentoEnDestino = await Document.findOne({
      where: {
        id: origen.id,
        collectionId: destinoColeccion.id,
      },
    });

    const documentoOriginal = await Document.findByPk(
      origen.id
    );

    guardar(4, "Verificacion final de ubicacion", {
      encontradoEnDestino:
        documentoEnDestino !== null,
      encontradoEnOrigen:
        documentoOriginal?.collectionId ===
        origenColeccion.id,
      coleccionActual: documentoOriginal?.collectionId,
      coleccionEsperada: origenColeccion.id,
    });

    expect(documentoEnDestino).toBeNull();
    expect(documentoOriginal).not.toBeNull();

    expect(documentoOriginal?.collectionId).toBe(
      origenColeccion.id
    );

  });
});
