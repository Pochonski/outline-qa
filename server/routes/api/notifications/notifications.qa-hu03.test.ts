import queryString from "query-string";
import { NotificationEventType } from "@shared/types";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import {
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("HU-03 Configuracion de notificaciones (OL-9)", () => {
  describe("preferencias y enlaces de baja", () => {
    let user: Awaited<ReturnType<typeof buildUser>>;

    beforeEach(async () => {
      user = await buildUser();
    });

    it("CP-HU03-01: desactivar PublishDocument guarda la preferencia", async () => {
      const res = await server.post(
        "/api/users.notificationsUnsubscribe",
        user,
        { body: { eventType: NotificationEventType.PublishDocument } }
      );
      const events = (await user.reload()).notificationSettings;
      expect({
        status: res.status,
        preferencia: events[NotificationEventType.PublishDocument],
      }).toEqual({ status: 200, preferencia: false });
    });

    it("CP-HU03-02: enlace de baja con firma valida procesa la baja", async () => {
      const token = NotificationSettingsHelper.unsubscribeToken(
        user.id,
        NotificationEventType.UpdateDocument
      );
      const res = await server.get(
        `/api/notifications.unsubscribe?userId=${user.id}&token=${token}&eventType=documents.update&follow=true`,
        { redirect: "manual" }
      );
      const events = (await user.reload()).notificationSettings;
      expect({
        status: res.status,
        location: res.headers.get("location"),
        preferencia: events["documents.update"],
      }).toEqual({
        status: 302,
        location: expect.stringContaining("/settings/notifications?success"),
        preferencia: false,
      });
    });

    it("CP-HU03-03: enlace de baja con firma alterada se rechaza", async () => {
      const antes = (await user.reload()).notificationSettings[
        "documents.update"
      ];
      const res = await server.get(
        `/api/notifications.unsubscribe?userId=${user.id}&token=firma-alterada&eventType=documents.update&follow=true`,
        { redirect: "manual" }
      );
      const despues = (await user.reload()).notificationSettings[
        "documents.update"
      ];
      expect({
        status: res.status,
        location: res.headers.get("location"),
        preferencia: despues,
      }).toEqual({
        status: 302,
        location: expect.stringContaining("?notice=invalid-auth"),
        preferencia: antes,
      });
    });
  });

  describe("pixel de seguimiento", () => {
    let notification: Awaited<ReturnType<typeof buildNotification>>;

    beforeEach(async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const actor = await buildUser({ teamId: team.id });
      notification = await buildNotification({
        teamId: team.id,
        userId: user.id,
        actorId: actor.id,
        event: NotificationEventType.UpdateDocument,
      });
    });

    it("CP-HU03-05: el pixel de seguimiento marca la notificacion como leida", async () => {
      const res = await server.get(
        `/api/notifications.pixel?${queryString.stringify({
          id: notification.id,
          token: notification.pixelToken,
        })}`
      );
      const recargada = await notification.reload();
      expect({
        status: res.status,
        tipo: res.headers.get("content-type"),
        leida: recargada.viewedAt !== null,
      }).toEqual({ status: 200, tipo: "image/gif", leida: true });
    });
  });
});
