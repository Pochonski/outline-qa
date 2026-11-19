import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCollection,
  buildGuestUser,
  buildTeam,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("QA HU-04 — Crear documento (OL-TC-1…OL-TC-5)", () => {
  describe("documento en una colección", () => {
    let editor: Awaited<ReturnType<typeof buildUser>>;
    let collection: Awaited<ReturnType<typeof buildCollection>>;

    beforeEach(async () => {
      const team = await buildTeam();
      editor = await buildUser({ teamId: team.id });
      collection = await buildCollection({
        userId: editor.id,
        teamId: team.id,
      });
    });

    it("OL-TC-1 / CP-HU04-01 - editor crea documento", async () => {
      const res = await server.post("/api/documents.create", editor, {
        body: {
          collectionId: collection.id,
          title: "new document",
          text: "hello",
        },
      });
      const body = await res.json();
      expect(body.data.title).toEqual("new document");
    });

    describe.each([
      { code: "OL-TC-3", role: "viewer" },
      { code: "OL-TC-5", role: "guest" },
    ])("$code - rol sin permiso de creación", ({ role }) => {
      let actor: Awaited<ReturnType<typeof buildUser>>;

      beforeEach(async () => {
        actor =
          role === "viewer"
            ? await buildViewer({ teamId: editor.teamId })
            : await buildGuestUser({ teamId: editor.teamId });
      });

      if (role === "viewer") {
        it("OL-TC-3 / CP-HU04-03 - viewer recibe 403", async () => {
          const res = await server.post("/api/documents.create", actor, {
            body: {
              collectionId: collection.id,
              title: "new document",
              text: "hello",
            },
          });
          expect(res.status).toEqual(403);
        });
      } else {
        it("OL-TC-5 / CP-HU04-05 - guest recibe 403", async () => {
          const res = await server.post("/api/documents.create", actor, {
            body: {
              collectionId: collection.id,
              title: "new document",
              text: "hello",
            },
          });
          expect(res.status).toEqual(403);
        });
      }
    });
  });

  it("OL-TC-2 / CP-HU04-02 - collectionId inválido responde 400", async () => {
    const user = await buildUser();
    const res = await server.post("/api/documents.create", user, {
      body: {
        collectionId: "invalid",
        title: "new document",
        text: "hello",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("OL-TC-4 / CP-HU04-04 - sin autenticación responde 401", async () => {
    const res = await server.post("/api/documents.create", {
      body: {
        title: "new document",
        text: "hello",
      },
    });
    expect(res.status).toEqual(401);
  });
});
