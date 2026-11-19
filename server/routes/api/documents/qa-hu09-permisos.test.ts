import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, it, expect } from "vitest";
import { CollectionPermission } from "@shared/types";
import { Document, UserMembership } from "@server/models";
import {
  buildUser,
  buildCollection,
  buildDocument,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const CARPETA = path.resolve(process.cwd(), "qa-tests/evidencias");

const ARCHIVO = path.join(CARPETA, "OL-TC-54_Resultados.json");

type Registro = Record<string, unknown>;

describe("OL-TC-54 - Rechazar movimiento sin permisos", () => {
  let observaciones: unknown[];
  let esperados: unknown[];

  beforeEach(async () => {
    observaciones = [];
    esperados = [];
    const evidencias: Registro[] = [];

    fs.mkdirSync(CARPETA, { recursive: true });

    function guardar(paso: number, descripcion: string, datos: Registro) {
      const registro = {
        paso,
        descripcion,
        ...datos,
      };

      evidencias.push(registro);

      fs.writeFileSync(ARCHIVO, JSON.stringify(evidencias, null, 2), "utf8");
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

    observaciones.push(membresia);
    esperados.push(undefined);

    observaciones.push(membresia?.permission);
    esperados.push(CollectionPermission.Read);

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

    const respuesta = await server.post("/api/documents.move", usuario, {
      body: {
        id: origen.id,
        collectionId: destinoColeccion.id,
      },
    });

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

    observaciones.push(respuesta.status);
    esperados.push(403);

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
      coleccionSinCambios: coleccionAnterior === coleccionActual,
      padreSinCambios: padreAnterior === padreActual,
    });

    observaciones.push(coleccionActual);
    esperados.push(coleccionAnterior);
    observaciones.push(padreActual);
    esperados.push(padreAnterior);

    // ==========================================
    // PASO 4 - VERIFICAR COLECCION DESTINO
    // ==========================================

    const documentoEnDestino = await Document.findOne({
      where: {
        id: origen.id,
        collectionId: destinoColeccion.id,
      },
    });

    const documentoOriginal = await Document.findByPk(origen.id);

    guardar(4, "Verificacion final de ubicacion", {
      encontradoEnDestino: documentoEnDestino !== null,
      encontradoEnOrigen:
        documentoOriginal?.collectionId === origenColeccion.id,
      coleccionActual: documentoOriginal?.collectionId,
      coleccionEsperada: origenColeccion.id,
    });

    observaciones.push(documentoEnDestino);
    esperados.push(undefined);
    observaciones.push(documentoOriginal);
    esperados.push(undefined);

    observaciones.push(documentoOriginal?.collectionId);
    esperados.push(origenColeccion.id);
  });

  it("OL-TC-54 - encuentra la membresía", () => {
    expect(observaciones[0]).not.toBeNull();
  });

  it("OL-TC-54 - confirma permiso de lectura", () => {
    expect(observaciones[1]).toBe(esperados[1]);
  });

  it("OL-TC-54 - responde HTTP 403", () => {
    expect(observaciones[2]).toBe(esperados[2]);
  });

  it("OL-TC-54 - conserva la colección", () => {
    expect(observaciones[3]).toBe(esperados[3]);
  });

  it("OL-TC-54 - conserva el padre", () => {
    expect(observaciones[4]).toBe(esperados[4]);
  });

  it("OL-TC-54 - no aparece en el destino", () => {
    expect(observaciones[5]).toBeNull();
  });

  it("OL-TC-54 - encuentra el documento original", () => {
    expect(observaciones[6]).not.toBeNull();
  });

  it("OL-TC-54 - permanece en la colección origen", () => {
    expect(observaciones[7]).toBe(esperados[7]);
  });
});
