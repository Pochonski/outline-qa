import crypto from "node:crypto";
import { Pool } from "pg";

/**
 * Acceso directo a la base de datos del Outline de pruebas (ambiente aislado).
 * Se usa solo para preparar datos (equipos, usuarios, llaves de API y
 * notificaciones), igual que las "factories" de las pruebas internas de Outline.
 */
export const pool = new Pool({
  connectionString:
    process.env.OUTLINE_DATABASE_URL ??
    "postgres://outline:pass@127.0.0.1:5433/outline",
});

export type Role = "admin" | "member" | "viewer" | "guest";

export type TestUser = {
  id: string;
  email: string;
  role: Role;
  teamId: string;
  apiKey: string;
};

const uuid = () => crypto.randomUUID();
const rnd = (n = 6) => crypto.randomBytes(n).toString("hex");

export async function createTeam(): Promise<string> {
  const id = uuid();
  const name = `Equipo QA ${rnd(3)}`;
  await pool.query(
    `INSERT INTO teams (id, name, "createdAt", "updatedAt", sharing, "inviteRequired")
     VALUES ($1, $2, now(), now(), true, false)`,
    [id, name]
  );
  return id;
}

export async function createUser(
  teamId: string,
  role: Role,
  email?: string
): Promise<TestUser> {
  const id = uuid();
  const mail = email ?? `${role}-${rnd(4)}@qa-outline.test`;
  await pool.query(
    `INSERT INTO users (id, email, name, "jwtSecret", "createdAt", "updatedAt", "teamId", role, "notificationSettings")
     VALUES ($1, $2, $3, $4, now(), now(), $5, $6, '{}'::jsonb)`,
    [id, mail, `QA ${role} ${rnd(2)}`, crypto.randomBytes(32), teamId, role]
  );

  const apiKey = `ol_api_${crypto.randomBytes(19).toString("hex")}`;
  await pool.query(
    `INSERT INTO "apiKeys" (id, name, secret, "userId", "createdAt", "updatedAt", last4)
     VALUES ($1, $2, $3, $4, now(), now(), $5)`,
    [uuid(), "qa-playwright", apiKey, id, apiKey.slice(-4)]
  );

  return { id, email: mail, role, teamId, apiKey };
}

export async function getUser(id: string) {
  const { rows } = await pool.query(
    `SELECT id, role, "suspendedAt", "notificationSettings" FROM users WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function countUsersByEmail(teamId: string, email: string) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM users WHERE "teamId" = $1 AND lower(email) = lower($2)`,
    [teamId, email]
  );
  return rows[0].n as number;
}

/** Crea una notificación pendiente de lectura y devuelve su id y token de píxel. */
export async function createNotification(userId: string, teamId: string) {
  const id = uuid();
  const { rows } = await pool.query(
    `INSERT INTO notifications (id, "userId", "teamId", event, "createdAt")
     VALUES ($1, $2, $3, 'documents.publish', now())
     RETURNING id`,
    [id, userId, teamId]
  );
  return rows[0].id as string;
}

/** Misma fórmula que Notification.pixelToken de Outline. */
export function pixelToken(
  notificationId: string,
  secretKey = process.env.OUTLINE_SECRET_KEY ?? ""
) {
  return crypto
    .createHash("sha256")
    .update(`${notificationId}-${secretKey}`)
    .digest("hex");
}

export async function getNotification(id: string) {
  const { rows } = await pool.query(
    `SELECT id, "viewedAt" FROM notifications WHERE id = $1`,
    [id]
  );
  return rows[0];
}

/** Misma fórmula que NotificationSettingsHelper.unsubscribeToken de Outline. */
export function unsubscribeToken(
  userId: string,
  eventType: string,
  secretKey = process.env.OUTLINE_SECRET_KEY ?? ""
) {
  return crypto
    .createHash("sha256")
    .update(`${userId}-${secretKey}-${eventType}`)
    .digest("hex");
}

export async function closePool() {
  await pool.end();
}
