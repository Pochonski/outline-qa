import { buildUser, buildDocument, buildShare } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("HU-01 Publicar y compartir documento (OL-7)", () => {
  let usuario: Awaited<ReturnType<typeof buildUser>>;
  let documento: Awaited<ReturnType<typeof buildDocument>>;

  const crearShare = (attrs: Record<string, unknown>) =>
    buildShare({
      documentId: documento.id,
      teamId: usuario.teamId,
      userId: usuario.id,
      ...attrs,
    });

  beforeEach(async () => {
    usuario = await buildUser();
    documento = await buildDocument({
      createdById: usuario.id,
      teamId: usuario.teamId,
    });
  });

  // CA-01.1 pide rechazar con 403 al visitante de un dominio no permitido.
  // En esta version de Outline no existe un mecanismo de dominios permitidos
  // para enlaces compartidos, por lo que el caso queda como pendiente.
  it.todo("CP-HU01-01: visitante de un dominio no permitido recibe 403");

  it("CP-HU01-02: un enlace publicado se abre sin sesion", async () => {
    const share = await crearShare({ published: true });
    const res = await server.post("/api/shares.info", {
      body: { id: share.id },
    });
    const body = await res.json();
    expect({ status: res.status, id: body.data.shares[0].id }).toEqual({
      status: 200,
      id: share.id,
    });
  });

  it.each([
    [
      "CP-HU01-03: un enlace revocado no se abre",
      { published: true, revokedAt: new Date() },
    ],
    [
      "CP-HU01-04: un enlace sin publicar no se abre a un visitante sin sesion",
      { published: false },
    ],
  ])("%s", async (_caso, atributos) => {
    const share = await crearShare(atributos);
    const res = await server.post("/api/shares.info", {
      body: { id: share.id },
    });
    const body = await res.json();
    expect({ status: res.status, error: body.error }).toEqual({
      status: 404,
      error: "not_found",
    });
  });
});
