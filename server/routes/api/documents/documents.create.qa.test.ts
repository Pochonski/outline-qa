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
  it("CP-HU04-01 – editor creates a document in a collection", async () => {
    // HU-04, CA-04.1: editor con escritura crea documento con título.
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: user.id,
      teamId: team.id,
    });
    const res = await server.post("/api/documents.create", user, {
      body: {
        collectionId: collection.id,
        title: "new document",
        text: "hello",
      },
    });
    const body = await res.json();
    expect(body.data.title).toEqual("new document");
  });

  it("CP-HU04-02 – rejects an invalid collectionId", async () => {
    // HU-04: collectionId con formato inválido → 400 (omitirlo crea un
    // draft con 200, por eso el caso inválido usa un UUID malformado).
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

  it("CP-HU04-03 – viewer cannot create a document", async () => {
    // HU-04, CA-04.2: viewer recibe 403.
    const team = await buildTeam();
    const editor = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: editor.id,
      teamId: team.id,
    });
    const viewer = await buildViewer({ teamId: team.id });
    const res = await server.post("/api/documents.create", viewer, {
      body: {
        collectionId: collection.id,
        title: "new document",
        text: "hello",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("CP-HU04-04 – requires authentication", async () => {
    // HU-04: sin token responde 401.
    const res = await server.post("/api/documents.create", {
      body: {
        title: "new document",
        text: "hello",
      },
    });
    expect(res.status).toEqual(401);
  });

  it("CP-HU04-05 – guest cannot create a document", async () => {
    // HU-04: guest recibe 403.
    const team = await buildTeam();
    const editor = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      userId: editor.id,
      teamId: team.id,
    });
    const guest = await buildGuestUser({ teamId: team.id });
    const res = await server.post("/api/documents.create", guest, {
      body: {
        collectionId: collection.id,
        title: "new document",
        text: "hello",
      },
    });
    expect(res.status).toEqual(403);
  });
});
