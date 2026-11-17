import { DocumentValidation } from "@shared/validations";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("QA HU-05 autosave persistence", () => {
  it("CP-HU05-03", async () => {
    // HU-05, CA-05.3: tras un guardado fallido el siguiente guardado
    // válido persiste sin intervención (recuperación transparente).
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: team.id,
    });
    const failed = await server.post("/api/documents.update", user, {
      body: {
        id: document.id,
        text: "a".repeat(DocumentValidation.maxLength + 1),
      },
    });
    const recovered = await server.post("/api/documents.update", user, {
      body: {
        id: document.id,
        text: "recovered text",
      },
    });
    const body = await recovered.json();
    expect([failed.status, recovered.status, body.data.text]).toEqual([
      400,
      200,
      "recovered text",
    ]);
  });

  it("CP-HU05-05", async () => {
    // HU-05: guardar sin cambios es idempotente (200, contenido igual).
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: team.id,
      title: "stable title",
      text: "stable text",
    });
    const res = await server.post("/api/documents.update", user, {
      body: {
        id: document.id,
        title: "stable title",
        text: "stable text",
      },
    });
    const body = await res.json();
    expect([res.status, body.data.text]).toEqual([200, "stable text"]);
  });

  it("CP-HU05-06", async () => {
    // HU-05: un guardado inválido se rechaza, el original queda intacto
    // y el editor puede seguir guardando (no se bloquea).
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: team.id,
      text: "original text",
    });
    const rejected = await server.post("/api/documents.update", user, {
      body: {
        id: document.id,
        text: "a".repeat(DocumentValidation.maxLength + 1),
      },
    });
    const info = await server.post("/api/documents.info", user, {
      body: {
        id: document.id,
      },
    });
    const infoBody = await info.json();
    const retry = await server.post("/api/documents.update", user, {
      body: {
        id: document.id,
        text: "still editable",
      },
    });
    expect([rejected.status, infoBody.data.text, retry.status]).toEqual([
      400,
      "original text",
      200,
    ]);
  });
});
