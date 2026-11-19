import { test, expect, caso } from "../helpers/fixtures";
import type { ApiResult } from "../helpers/fixtures";
import { createTeam, createUser, getUser, countUsersByEmail } from "../helpers/db";
import { equipoConAdmin } from "../helpers/datos";

/**
 * Estilo de esta suite: un describe por caso de prueba, la preparación y la acción
 * en beforeEach, y exactamente una verificación (expect) por prueba.
 */
test.describe("HU-02 Administrar miembros del equipo (OL-8)", () => {
  test.describe("CP-HU02-01 invitar con correo y rol válidos (OL-TC-23)", () => {
    const correo = "nuevo@empresa.com";
    let teamId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const equipo = await equipoConAdmin();
      teamId = equipo.teamId;
      res = await api.post("users.invite", equipo.admin.apiKey, {
        invites: [{ email: correo, name: "Nuevo Miembro", role: "member" }],
      });
    });

    test("la invitación responde 200", caso("OL-TC-23"), async () => {
      expect(res.status).toBe(200);
    });

    test("se envía exactamente una invitación", caso("OL-TC-23"), async () => {
      expect(res.body.data.sent).toHaveLength(1);
    });

    test("la invitación enviada lleva el correo y el rol member", caso("OL-TC-23"), async () => {
      expect(res.body.data.sent[0]).toMatchObject({ email: correo, role: "member" });
    });

    test("no queda ninguna invitación sin enviar", caso("OL-TC-23"), async () => {
      expect(res.body.data.unsent).toHaveLength(0);
    });

    test("el usuario invitado existe una vez en el equipo", caso("OL-TC-23"), async () => {
      expect(await countUsersByEmail(teamId, correo)).toBe(1);
    });
  });

  test.describe("CP-HU02-02 invitar con correo de formato inválido (OL-TC-24)", () => {
    const correo = "nuevo@@empresa";
    let teamId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const equipo = await equipoConAdmin();
      teamId = equipo.teamId;
      res = await api.post("users.invite", equipo.admin.apiKey, {
        invites: [{ email: correo, name: "Nuevo", role: "member" }],
      });
    });

    test("la invitación responde 400", caso("OL-TC-24"), async () => {
      expect(res.status).toBe(400);
    });

    test("el error es validation_error", caso("OL-TC-24"), async () => {
      expect(res.body.error).toBe("validation_error");
    });

    test("el mensaje indica que el correo es inválido", caso("OL-TC-24"), async () => {
      expect(res.body.message).toContain("Invalid email address");
    });

    test("no se crea ningún usuario con ese correo", caso("OL-TC-24"), async () => {
      expect(await countUsersByEmail(teamId, correo)).toBe(0);
    });
  });

  test.describe("CP-HU02-03 invitar a un correo que ya es miembro (OL-TC-25)", () => {
    let teamId: string;
    let correoMiembro: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const equipo = await equipoConAdmin();
      teamId = equipo.teamId;
      const miembro = await createUser(teamId, "member");
      correoMiembro = miembro.email;
      res = await api.post("users.invite", equipo.admin.apiKey, {
        invites: [{ email: correoMiembro, name: "Duplicado", role: "member" }],
      });
    });

    test("la invitación responde 200", caso("OL-TC-25"), async () => {
      expect(res.status).toBe(200);
    });

    test("no se envía ninguna invitación", caso("OL-TC-25"), async () => {
      expect(res.body.data.sent).toHaveLength(0);
    });

    test("el correo duplicado queda en las invitaciones sin enviar", caso("OL-TC-25"), async () => {
      expect(res.body.data.unsent.map((u: { email: string }) => u.email)).toContain(correoMiembro);
    });

    test("no se crea ningún usuario nuevo", caso("OL-TC-25"), async () => {
      expect(res.body.data.users).toHaveLength(0);
    });

    test("el correo sigue existiendo una sola vez en el equipo", caso("OL-TC-25"), async () => {
      expect(await countUsersByEmail(teamId, correoMiembro)).toBe(1);
    });
  });

  test.describe("CP-HU02-04 promover Member a Admin (OL-TC-26)", () => {
    let miembroId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId, admin } = await equipoConAdmin();
      const miembro = await createUser(teamId, "member");
      miembroId = miembro.id;
      res = await api.post("users.promote", admin.apiKey, { id: miembroId });
    });

    test("la promoción responde 200", caso("OL-TC-26"), async () => {
      expect(res.status).toBe(200);
    });

    test("la respuesta indica el rol admin", caso("OL-TC-26"), async () => {
      expect(res.body.data.role).toBe("admin");
    });

    test("el rol admin queda guardado en la base de datos", caso("OL-TC-26"), async () => {
      expect((await getUser(miembroId)).role).toBe("admin");
    });
  });

  test.describe("CP-HU02-05 asignar un rol inexistente (OL-TC-27)", () => {
    let miembroId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId, admin } = await equipoConAdmin();
      const miembro = await createUser(teamId, "member");
      miembroId = miembro.id;
      res = await api.post("users.update_role", admin.apiKey, {
        id: miembroId,
        role: "superadmin",
      });
    });

    test("la asignación responde 400", caso("OL-TC-27"), async () => {
      expect(res.status).toBe(400);
    });

    test("el error es validation_error", caso("OL-TC-27"), async () => {
      expect(res.body.error).toBe("validation_error");
    });

    // Prueba parametrizada: una verificación por cada rol válido que el mensaje debe listar.
    for (const rol of ["admin", "member", "viewer", "guest"]) {
      test(`el mensaje de error lista el rol válido ${rol}`, caso("OL-TC-27"), async () => {
        expect(res.body.message).toContain(rol);
      });
    }

    test("el rol del usuario no cambia", caso("OL-TC-27"), async () => {
      expect((await getUser(miembroId)).role).toBe("member");
    });
  });

  test.describe("CP-HU02-06 viewer intenta invitar (OL-TC-28)", () => {
    const correo = "nuevo@empresa.com";
    let teamId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const equipo = await equipoConAdmin();
      teamId = equipo.teamId;
      const viewer = await createUser(teamId, "viewer");
      res = await api.post("users.invite", viewer.apiKey, {
        invites: [{ email: correo, name: "Nuevo", role: "member" }],
      });
    });

    test("la invitación responde 403", caso("OL-TC-28"), async () => {
      expect(res.status).toBe(403);
    });

    test("el error es authorization_error", caso("OL-TC-28"), async () => {
      expect(res.body.error).toBe("authorization_error");
    });

    test("no se crea ningún usuario con ese correo", caso("OL-TC-28"), async () => {
      expect(await countUsersByEmail(teamId, correo)).toBe(0);
    });
  });

  test.describe("CP-HU02-07 member intenta promover (OL-TC-29)", () => {
    let otroId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId } = await equipoConAdmin();
      const member = await createUser(teamId, "member");
      const otro = await createUser(teamId, "member");
      otroId = otro.id;
      res = await api.post("users.promote", member.apiKey, { id: otroId });
    });

    test("la promoción responde 403", caso("OL-TC-29"), async () => {
      expect(res.status).toBe(403);
    });

    test("el rol del otro usuario sigue siendo member", caso("OL-TC-29"), async () => {
      expect((await getUser(otroId)).role).toBe("member");
    });
  });

  test.describe("CP-HU02-08 suspender la propia cuenta del único administrador (OL-TC-30)", () => {
    let unicoId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      // Equipo propio con un solo administrador activo.
      const teamId = await createTeam();
      const unico = await createUser(teamId, "admin");
      unicoId = unico.id;
      res = await api.post("users.suspend", unico.apiKey, { id: unicoId });
    });

    test("la suspensión responde 403", caso("OL-TC-30"), async () => {
      expect(res.status).toBe(403);
    });

    test("el error es authorization_error", caso("OL-TC-30"), async () => {
      expect(res.body.error).toBe("authorization_error");
    });

    test("la cuenta del administrador no queda suspendida", caso("OL-TC-30"), async () => {
      expect((await getUser(unicoId)).suspendedAt).toBeNull();
    });
  });

  test.describe("CP-HU02-09 suspender a otro miembro con más admins activos (OL-TC-31)", () => {
    let miembroId: string;
    let res: ApiResult;

    test.beforeEach(async ({ api }) => {
      const { teamId, admin } = await equipoConAdmin();
      await createUser(teamId, "admin"); // segundo administrador activo
      const miembro = await createUser(teamId, "member");
      miembroId = miembro.id;
      res = await api.post("users.suspend", admin.apiKey, { id: miembroId });
    });

    test("la suspensión responde 200", caso("OL-TC-31"), async () => {
      expect(res.status).toBe(200);
    });

    test("la respuesta indica que el usuario está suspendido", caso("OL-TC-31"), async () => {
      expect(res.body.data.isSuspended).toBe(true);
    });

    test("la fecha de suspensión queda guardada en la base de datos", caso("OL-TC-31"), async () => {
      expect((await getUser(miembroId)).suspendedAt).not.toBeNull();
    });
  });
});
