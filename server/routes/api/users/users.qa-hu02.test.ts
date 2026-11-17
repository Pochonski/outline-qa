import { UserRole } from "@shared/types";
import {
  buildTeam,
  buildAdmin,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

const invitacion = (email: string) => ({
  invites: [{ email, name: "Nuevo", role: "member" }],
});

describe("HU-02 Administrar miembros del equipo (OL-8)", () => {
  let team: Awaited<ReturnType<typeof buildTeam>>;
  let admin: Awaited<ReturnType<typeof buildAdmin>>;

  beforeEach(async () => {
    team = await buildTeam();
    admin = await buildAdmin({ teamId: team.id });
  });

  it("CP-HU02-01: invitar con correo y rol validos crea la invitacion", async () => {
    const res = await server.post("/api/users.invite", admin, {
      body: invitacion("nuevo@empresa.com"),
    });
    const body = await res.json();
    expect({
      status: res.status,
      enviadas: body.data.sent.length,
      rol: body.data.users[0].role,
    }).toEqual({ status: 200, enviadas: 1, rol: UserRole.Member });
  });

  it("CP-HU02-02: invitar con correo de formato invalido se rechaza", async () => {
    const res = await server.post("/api/users.invite", admin, {
      body: invitacion("nuevo@@empresa"),
    });
    const body = await res.json();
    expect({ status: res.status, error: body.error }).toEqual({
      status: 400,
      error: "validation_error",
    });
  });

  it("CP-HU02-03: invitar a un correo que ya es miembro no crea invitacion", async () => {
    const member = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.invite", admin, {
      body: invitacion(member.email as string),
    });
    const body = await res.json();
    expect({
      status: res.status,
      enviadas: body.data.sent.length,
      noEnviadas: body.data.unsent.map((u: { email: string }) => u.email),
      usuariosNuevos: body.data.users.length,
    }).toEqual({
      status: 200,
      enviadas: 0,
      noEnviadas: [member.email],
      usuariosNuevos: 0,
    });
  });

  it("CP-HU02-04: promover a un miembro actualiza su rol", async () => {
    const member = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.promote", admin, {
      body: { id: member.id },
    });
    await member.reload();
    expect({ status: res.status, rol: member.role }).toEqual({
      status: 200,
      rol: UserRole.Admin,
    });
  });

  it("CP-HU02-05: asignar un rol inexistente se rechaza", async () => {
    const member = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.update_role", admin, {
      body: { id: member.id, role: "superadmin" },
    });
    const body = await res.json();
    await member.reload();
    expect({
      status: res.status,
      error: body.error,
      rol: member.role,
    }).toEqual({
      status: 400,
      error: "validation_error",
      rol: UserRole.Member,
    });
  });

  it("CP-HU02-06: un viewer no puede invitar", async () => {
    const viewer = await buildViewer({ teamId: team.id });
    const res = await server.post("/api/users.invite", viewer, {
      body: invitacion("nuevo@empresa.com"),
    });
    const body = await res.json();
    expect({ status: res.status, error: body.error }).toEqual({
      status: 403,
      error: "authorization_error",
    });
  });

  it("CP-HU02-07: un member no puede promover", async () => {
    const member = await buildUser({ teamId: team.id });
    const other = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.promote", member, {
      body: { id: other.id },
    });
    await other.reload();
    expect({ status: res.status, rol: other.role }).toEqual({
      status: 403,
      rol: UserRole.Member,
    });
  });

  it("CP-HU02-08: el unico admin no puede suspender su propia cuenta", async () => {
    const res = await server.post("/api/users.suspend", admin, {
      body: { id: admin.id },
    });
    const body = await res.json();
    await admin.reload();
    expect({
      status: res.status,
      error: body.error,
      suspendedAt: admin.suspendedAt,
    }).toEqual({
      status: 403,
      error: "authorization_error",
      suspendedAt: null,
    });
  });

  it("CP-HU02-09: suspender a otro miembro con mas admins activos procede", async () => {
    await buildAdmin({ teamId: team.id });
    const target = await buildUser({ teamId: team.id });
    const res = await server.post("/api/users.suspend", admin, {
      body: { id: target.id },
    });
    await target.reload();
    expect({
      status: res.status,
      suspendido: target.suspendedAt !== null,
    }).toEqual({ status: 200, suspendido: true });
  });
});
