import { test, expect, caso } from "../helpers/fixtures";
import { equipoConAdmin, documentoPublicado } from "../helpers/datos";
import type { ApiResult } from "../helpers/fixtures";

/**
 * Estilo de esta suite: un describe por caso de prueba, la preparación y la acción
 * en beforeEach, y exactamente una verificación (expect) por prueba.
 */
test.describe("HU-01 Publicar y compartir documento (OL-7)", () => {
  test.describe("CP-HU01-01 acceso desde dominio no permitido (OL-TC-7)", () => {
    let share: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { admin } = await equipoConAdmin();
      const { documentId } = await documentoPublicado(api, admin);
      // Se intenta publicar el enlace con una restricción de dominio (CA-01.1).
      share = await api.post("shares.create", admin.apiKey, {
        documentId,
        published: true,
        allowedDomains: ["empresa.com"],
      });
    });

    test("el enlace se crea aunque se envíe una restricción de dominio", async () => {
      expect(share.status).toBe(200);
    });

    test("el enlace no guarda ningún campo de restricción de acceso", async () => {
      // El campo "domain" del enlace es solo un dominio propio para servirlo.
      const data = share.body.data as Record<string, unknown>;
      const camposDeRestriccion = Object.keys(data).filter((k) => /allowed|restrict/i.test(k));
      expect(camposDeRestriccion).toEqual([]);
    });

    test("un visitante externo accede sin recibir el 403 que pide el CA", async ({ api }) => {
      const visita = await api.post("documents.info", null, { shareId: share.body.data.id });
      expect(visita.status).toBe(200);
    });

    test(
      "CA-01.1 no puede verificarse: la restricción por dominio no existe (OL-BUG-1)",
      caso("OL-TC-7"),
      async () => {
        test.info().annotations.push(
          { type: "qatlas-estado", description: "bloqueado" },
          {
            type: "qatlas-motivo",
            description:
              "CA-01.1 no puede verificarse: Outline no ofrece restricción de acceso por dominio para visitantes en enlaces compartidos (defecto OL-BUG-1).",
          }
        );
        test.skip(true, "Bloqueado: la funcionalidad de restricción por dominio no existe (OL-BUG-1).");
      }
    );
  });

  test.describe("CP-HU01-02 enlace publicado se abre sin sesión (OL-TC-9)", () => {
    let shareId: string;
    let info: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { admin } = await equipoConAdmin();
      const { documentId } = await documentoPublicado(api, admin);
      const share = await api.post("shares.create", admin.apiKey, { documentId, published: true });
      shareId = share.body.data.id;
      // Solicitar shares.info sin sesión del enlace publicado.
      info = await api.post("shares.info", null, { id: shareId });
    });

    test("shares.info responde 200", caso("OL-TC-9"), async () => {
      expect(info.status).toBe(200);
    });

    test("shares.info devuelve el enlace solicitado", caso("OL-TC-9"), async () => {
      expect(info.body.data.shares[0].id).toBe(shareId);
    });

    test("el enlace devuelto está publicado", caso("OL-TC-9"), async () => {
      expect(info.body.data.shares[0].published).toBe(true);
    });
  });

  test.describe("CP-HU01-03 enlace revocado no se abre (OL-TC-12)", () => {
    let revocado: ApiResult;
    let info: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { admin } = await equipoConAdmin();
      const { documentId } = await documentoPublicado(api, admin);
      const share = await api.post("shares.create", admin.apiKey, { documentId, published: true });
      revocado = await api.post("shares.revoke", admin.apiKey, { id: share.body.data.id });
      // Solicitar shares.info sin sesión del enlace revocado.
      info = await api.post("shares.info", null, { id: share.body.data.id });
    });

    test("la revocación responde 200", caso("OL-TC-12"), async () => {
      expect(revocado.status).toBe(200);
    });

    test("shares.info del enlace revocado responde 404", caso("OL-TC-12"), async () => {
      expect(info.status).toBe(404);
    });

    test("shares.info del enlace revocado devuelve el error not_found", caso("OL-TC-12"), async () => {
      expect(info.body.error).toBe("not_found");
    });
  });

  test.describe("CP-HU01-04 enlace sin publicar no se abre a un visitante sin sesión (OL-TC-20)", () => {
    let share: ApiResult;
    let info: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { admin } = await equipoConAdmin();
      const { documentId } = await documentoPublicado(api, admin);
      share = await api.post("shares.create", admin.apiKey, { documentId, published: false });
      // Solicitar shares.info sin sesión del enlace sin publicar.
      info = await api.post("shares.info", null, { id: share.body.data.id });
    });

    test("el enlace se crea sin publicar", caso("OL-TC-20"), async () => {
      expect(share.body.data.published).toBe(false);
    });

    test("shares.info del enlace sin publicar responde 404", caso("OL-TC-20"), async () => {
      expect(info.status).toBe(404);
    });

    test("shares.info del enlace sin publicar devuelve el error not_found", caso("OL-TC-20"), async () => {
      expect(info.body.error).toBe("not_found");
    });
  });
});
