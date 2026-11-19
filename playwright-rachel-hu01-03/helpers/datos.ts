import { Api } from "./fixtures";
import { createTeam, createUser, TestUser } from "./db";

/** Equipo nuevo y aislado con un administrador (cada prueba crea el suyo). */
export async function equipoConAdmin() {
  const teamId = await createTeam();
  const admin = await createUser(teamId, "admin");
  return { teamId, admin };
}

/** Colección y documento publicado, creados por la API como el administrador. */
export async function documentoPublicado(api: Api, admin: TestUser) {
  const col = await api.post("collections.create", admin.apiKey, {
    name: `Coleccion ${Date.now()}`,
    permission: "read_write",
  });
  const doc = await api.post("documents.create", admin.apiKey, {
    title: "Informe semanal",
    text: "Contenido de prueba",
    collectionId: col.body.data.id,
    publish: true,
  });
  return { collectionId: col.body.data.id as string, documentId: doc.body.data.id as string };
}
