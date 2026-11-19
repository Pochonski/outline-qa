import { beforeEach, describe, expect, it } from "vitest";
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
  let author: Awaited<ReturnType<typeof buildUser>>;
  let document: Awaited<ReturnType<typeof buildDocument>>;

  beforeEach(async () => {
    const team = await buildTeam();
    author = await buildUser({ teamId: team.id });
    document = await buildDocument({
      userId: author.id,
      teamId: author.teamId,
    });
  });

  describe("comentario del autor", () => {
    let comment: Awaited<ReturnType<typeof buildComment>>;

    beforeEach(async () => {
      comment = await buildComment({
        userId: author.id,
        documentId: document.id,
      });
    });

    it("OL-TC-18 / CP-HU06-01 - el autor edita su comentario", async () => {
      const res = await server.post("/api/comments.update", author, {
        body: { id: comment.id, text: "Updated **text**" },
      });
      const body = await res.json();
      expect(body.data.data.content[0].content[0].text).toEqual("Updated ");
    });

    it("OL-TC-21 / CP-HU06-03 - el autor elimina su comentario", async () => {
      const res = await server.post("/api/comments.delete", author, {
        body: { id: comment.id },
      });
      const body = await res.json();
      expect(body.success).toEqual(true);
    });

    it("OL-TC-22 / CP-HU06-04 - resolver llena resolvedAt", async () => {
      const res = await server.post("/api/comments.resolve", author, {
        body: { id: comment.id },
      });
      const body = await res.json();
      expect(body.data.resolvedAt).toBeTruthy();
    });

    it("OL-TC-40 / CP-HU06-06 - texto vacío responde 400", async () => {
      const res = await server.post("/api/comments.update", author, {
        body: { id: comment.id, text: "" },
      });
      expect(res.status).toEqual(400);
    });
  });

  describe("acciones de otro usuario", () => {
    let other: Awaited<ReturnType<typeof buildUser>>;
    let comment: Awaited<ReturnType<typeof buildComment>>;

    beforeEach(async () => {
      other = await buildUser({ teamId: author.teamId });
      comment = await buildComment({
        userId: author.id,
        documentId: document.id,
      });
    });

    it("OL-TC-19 / CP-HU06-02 - no autor no puede editar", async () => {
      const res = await server.post("/api/comments.update", other, {
        body: { id: comment.id, text: "intento de edición ajena" },
      });
      expect(res.status).toEqual(403);
    });

    it("OL-TC-39 / CP-HU06-05 - no autor no puede eliminar", async () => {
      const res = await server.post("/api/comments.delete", other, {
        body: { id: comment.id },
      });
      expect(res.status).toEqual(403);
    });
  });

  describe("comentario resuelto", () => {
    let comment: Awaited<ReturnType<typeof buildResolvedComment>>;

    beforeEach(async () => {
      comment = await buildResolvedComment(author, {
        userId: author.id,
        documentId: document.id,
      });
    });

    it("OL-TC-41 / CP-HU06-07 - reabrir limpia resolvedAt", async () => {
      const res = await server.post("/api/comments.unresolve", author, {
        body: { id: comment.id },
      });
      const body = await res.json();
      expect(body.data.resolvedAt).toEqual(null);
    });
  });
});
