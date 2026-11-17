import { SubscriptionType } from "@shared/types";
import { buildUser, buildDocument } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("HU-03 Suscripcion por evento (OL-9)", () => {
  let user: Awaited<ReturnType<typeof buildUser>>;
  let document: Awaited<ReturnType<typeof buildDocument>>;

  beforeEach(async () => {
    user = await buildUser();
    document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
  });

  it("CP-HU03-04: suscribirse a un documento registra la suscripcion a documents.update", async () => {
    const res = await server.post("/api/subscriptions.create", user, {
      body: { documentId: document.id, event: SubscriptionType.Document },
    });
    const body = await res.json();

    const info = await server.post("/api/subscriptions.info", user, {
      body: { documentId: document.id, event: SubscriptionType.Document },
    });
    const infoBody = await info.json();

    expect({
      status: res.status,
      userId: body.data.userId,
      documentId: body.data.documentId,
      consulta: info.status,
      mismaSuscripcion: infoBody.data.id === body.data.id,
    }).toEqual({
      status: 200,
      userId: user.id,
      documentId: document.id,
      consulta: 200,
      mismaSuscripcion: true,
    });
  });
});
