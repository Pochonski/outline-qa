import {
  buildComment,
  buildDocument,
  buildResolvedComment,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("QA HU-06 comments", () => {
  it("CP-HU06-01", async () => {
    // HU-06, CA-06.1: el autor actualiza su comentario y cambia el texto.
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.update", user, {
      body: {
        id: comment.id,
        text: "Updated **text**",
      },
    });
    const body = await res.json();
    expect(body.data.data.content[0].content[0].text).toEqual("Updated ");
  });

  it("CP-HU06-02", async () => {
    // HU-06, CA-06.4: un usuario que no es el autor recibe 403.
    const team = await buildTeam();
    const author = await buildUser({ teamId: team.id });
    const other = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });
    const comment = await buildComment({
      userId: author.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.update", other, {
      body: {
        id: comment.id,
        text: "intento de edición ajena",
      },
    });
    expect(res.status).toEqual(403);
  });

  it("CP-HU06-03", async () => {
    // HU-06, CA-06.2: el autor elimina su comentario (soft delete).
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.delete", user, {
      body: {
        id: comment.id,
      },
    });
    const body = await res.json();
    expect(body.success).toEqual(true);
  });

  it("CP-HU06-04", async () => {
    // HU-06, CA-06.3: resolver puebla resolvedAt y pasa a Resuelto.
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.resolve", user, {
      body: {
        id: comment.id,
      },
    });
    const body = await res.json();
    expect(body.data.resolvedAt).toBeTruthy();
  });

  it("CP-HU06-05", async () => {
    // HU-06: un usuario que no es el autor no puede eliminar (403).
    const team = await buildTeam();
    const author = await buildUser({ teamId: team.id });
    const other = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });
    const comment = await buildComment({
      userId: author.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.delete", other, {
      body: {
        id: comment.id,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("CP-HU06-06", async () => {
    // HU-06: editar con texto vacío responde 400 (se requiere data o text).
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.update", user, {
      body: {
        id: comment.id,
        text: "",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("CP-HU06-07", async () => {
    // HU-06: reabrir limpia resolvedAt y vuelve a activo.
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildResolvedComment(user, {
      userId: user.id,
      documentId: document.id,
    });
    const res = await server.post("/api/comments.unresolve", user, {
      body: {
        id: comment.id,
      },
    });
    const body = await res.json();
    expect(body.data.resolvedAt).toEqual(null);
  });
});
