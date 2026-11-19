import { test, expect, caso } from "../helpers/fixtures";
import type { ApiResult } from "../helpers/fixtures";
import {
  createUser,
  getUser,
  createNotification,
  getNotification,
  pixelToken,
  unsubscribeToken,
} from "../helpers/db";
import { equipoConAdmin, documentoPublicado } from "../helpers/datos";

/**
 * Estilo de esta suite: un describe por caso de prueba, la preparación y la acción
 * en beforeEach, y exactamente una verificación (expect) por prueba.
 */
test.describe("HU-03 Configuración de notificaciones y suscripción (OL-9)", () => {
  test.describe("CP-HU03-01 desactivar PublishDocument ejecuta la mutación (OL-TC-32)", () => {
    let usuarioId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId } = await equipoConAdmin();
      const usuario = await createUser(teamId, "member");
      usuarioId = usuario.id;
      res = await api.post("users.notificationsUnsubscribe", usuario.apiKey, {
        eventType: "documents.publish",
      });
    });

    test("la baja responde 200", caso("OL-TC-32"), async () => {
      expect(res.status).toBe(200);
    });

    test("la respuesta indica documents.publish desactivado", caso("OL-TC-32"), async () => {
      expect(res.body.data.notificationSettings["documents.publish"]).toBe(false);
    });

    test("documents.publish queda desactivado en la base de datos", caso("OL-TC-32"), async () => {
      expect((await getUser(usuarioId)).notificationSettings["documents.publish"]).toBe(false);
    });
  });

  test.describe("CP-HU03-02 enlace de baja con firma HMAC válida (OL-TC-33)", () => {
    const evento = "documents.update";
    let usuarioId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId } = await equipoConAdmin();
      const usuario = await createUser(teamId, "member");
      usuarioId = usuario.id;
      res = await api.get("notifications.unsubscribe", {
        userId: usuarioId,
        token: unsubscribeToken(usuarioId, evento),
        eventType: evento,
        follow: "true",
      });
    });

    test("el enlace redirige con un 302", caso("OL-TC-33"), async () => {
      expect(res.status).toBe(302);
    });

    test("la redirección apunta a la configuración de notificaciones con éxito", caso("OL-TC-33"), async () => {
      expect(res.headers["location"]).toContain("/settings/notifications?success");
    });

    test("el evento queda desactivado en la base de datos", caso("OL-TC-33"), async () => {
      expect((await getUser(usuarioId)).notificationSettings[evento]).toBe(false);
    });
  });

  test.describe("CP-HU03-03 enlace de baja con firma alterada (OL-TC-34)", () => {
    const evento = "documents.update";
    let usuarioId: string;
    let antes: Record<string, unknown>;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId } = await equipoConAdmin();
      const usuario = await createUser(teamId, "member");
      usuarioId = usuario.id;
      const valido = unsubscribeToken(usuarioId, evento);
      const alterado = valido.slice(0, -1) + (valido.endsWith("0") ? "1" : "0");
      antes = (await getUser(usuarioId)).notificationSettings;
      res = await api.get("notifications.unsubscribe", {
        userId: usuarioId,
        token: alterado,
        eventType: evento,
        follow: "true",
      });
    });

    test("el enlace redirige con un 302", caso("OL-TC-34"), async () => {
      expect(res.status).toBe(302);
    });

    test("la redirección indica autenticación inválida", caso("OL-TC-34"), async () => {
      expect(res.headers["location"]).toContain("notice=invalid-auth");
    });

    test("la configuración de notificaciones no cambia", caso("OL-TC-34"), async () => {
      expect((await getUser(usuarioId)).notificationSettings).toEqual(antes);
    });
  });

  test.describe("CP-HU03-04 suscribirse a cambios de un documento (OL-TC-35)", () => {
    let usuarioId: string;
    let documentoId: string;
    let crear: ApiResult;
    let info: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId, admin } = await equipoConAdmin();
      const { documentId } = await documentoPublicado(api, admin);
      documentoId = documentId;
      const usuario = await createUser(teamId, "admin");
      usuarioId = usuario.id;
      // POST subscriptions.create con documentId y evento documents.update.
      crear = await api.post("subscriptions.create", usuario.apiKey, {
        documentId,
        event: "documents.update",
      });
      // POST subscriptions.info para el mismo documento.
      info = await api.post("subscriptions.info", usuario.apiKey, {
        documentId,
        event: "documents.update",
      });
    });

    test("subscriptions.create responde 200", caso("OL-TC-35"), async () => {
      expect(crear.status).toBe(200);
    });

    test("la suscripción creada pertenece al usuario", caso("OL-TC-35"), async () => {
      expect(crear.body.data.userId).toBe(usuarioId);
    });

    test("la suscripción creada es del documento", caso("OL-TC-35"), async () => {
      expect(crear.body.data.documentId).toBe(documentoId);
    });

    test("subscriptions.info responde 200", caso("OL-TC-35"), async () => {
      expect(info.status).toBe(200);
    });

    test("subscriptions.info devuelve al usuario suscrito", caso("OL-TC-35"), async () => {
      expect(info.body.data.userId).toBe(usuarioId);
    });

    test("subscriptions.info devuelve el documento suscrito", caso("OL-TC-35"), async () => {
      expect(info.body.data.documentId).toBe(documentoId);
    });
  });

  test.describe("CP-HU03-05 píxel de seguimiento marca como leída (OL-TC-36)", () => {
    let notificacionId: string;
    let res: ApiResult;
    let vistaAntes: unknown;

    test.beforeEach(async ({ api }) => {
      const { teamId } = await equipoConAdmin();
      const usuario = await createUser(teamId, "member");
      notificacionId = await createNotification(usuario.id, teamId);
      vistaAntes = (await getNotification(notificacionId)).viewedAt;
      // Solicitar notifications.pixel con el id y el token de la notificación.
      res = await api.get("notifications.pixel", {
        id: notificacionId,
        token: pixelToken(notificacionId),
      });
    });

    test("la notificación no estaba vista antes del píxel", caso("OL-TC-36"), async () => {
      expect(vistaAntes).toBeNull();
    });

    test("el píxel responde 200", caso("OL-TC-36"), async () => {
      expect(res.status).toBe(200);
    });

    test("el píxel devuelve una imagen gif", caso("OL-TC-36"), async () => {
      expect(res.headers["content-type"]).toContain("image/gif");
    });

    test("la notificación queda marcada como vista", caso("OL-TC-36"), async () => {
      expect((await getNotification(notificacionId)).viewedAt).not.toBeNull();
    });
  });
});
