import { beforeEach, describe, expect, it } from "vitest";
import { DocumentValidation } from "@shared/validations";
import { buildDocument, buildTeam, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("QA HU-05 autosave persistence", () => {
  let user: Awaited<ReturnType<typeof buildUser>>;

  beforeEach(async () => {
    const team = await buildTeam();
    user = await buildUser({ teamId: team.id });
  });

  describe("OL-TC-13 - recuperación después de un guardado fallido", () => {
    let failedStatus: number;
    let recoveredStatus: number;
    let recoveredText: string;

    beforeEach(async () => {
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const failed = await server.post("/api/documents.update", user, {
        body: {
          id: document.id,
          text: "a".repeat(DocumentValidation.maxLength + 1),
        },
      });
      const recovered = await server.post("/api/documents.update", user, {
        body: { id: document.id, text: "recovered text" },
      });
      const body = await recovered.json();
      failedStatus = failed.status;
      recoveredStatus = recovered.status;
      recoveredText = body.data.text;
    });

    it("OL-TC-13 / CP-HU05-03 - persiste tras recuperar", () => {
      expect([failedStatus, recoveredStatus, recoveredText]).toEqual([
        400,
        200,
        "recovered text",
      ]);
    });
  });

  describe("OL-TC-15 - guardado sin cambios", () => {
    let status: number;
    let text: string;

    beforeEach(async () => {
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
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
      status = res.status;
      text = body.data.text;
    });

    it("OL-TC-15 / CP-HU05-05 - conserva el contenido", () => {
      expect([status, text]).toEqual([200, "stable text"]);
    });
  });

  describe("OL-TC-16 - rechazo y reintento", () => {
    let rejectedStatus: number;
    let originalText: string;
    let retryStatus: number;

    beforeEach(async () => {
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
        text: "original text",
      });
      const rejected = await server.post("/api/documents.update", user, {
        body: {
          id: document.id,
          text: "a".repeat(DocumentValidation.maxLength + 1),
        },
      });
      const info = await server.post("/api/documents.info", user, {
        body: { id: document.id },
      });
      const infoBody = await info.json();
      const retry = await server.post("/api/documents.update", user, {
        body: { id: document.id, text: "still editable" },
      });
      rejectedStatus = rejected.status;
      originalText = infoBody.data.text;
      retryStatus = retry.status;
    });

    it("OL-TC-16 / CP-HU05-06 - conserva original y permite reintentar", () => {
      expect([rejectedStatus, originalText, retryStatus]).toEqual([
        400,
        "original text",
        200,
      ]);
    });
  });
});
