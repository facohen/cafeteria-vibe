// Autenticación y sesiones (solo servidor). Contrato: docs/TECNICO.md §Contratos.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { STAFF_DEMO_PASSWORD } from "@/lib/db";
import { AppError, type DemoAccounts, type Role, type SessionUser, type User } from "@/lib/contracts";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: number;
  password_hash?: string | null;
}

/** Las sesiones vencen a las 12 h (kiosco compartido); la cookie usa el mismo maxAge. */
export const SESSION_TTL_HOURS = 12;

// Hash ficticio: el login hace el mismo trabajo exista o no el usuario.
const DUMMY_HASH = `${"0".repeat(32)}:${"0".repeat(64)}`;

const USER_COLS = "id, email, name, role, active";

export function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, name: row.name, role: row.role, active: row.active === 1 };
}

export function listDemoAccounts(): DemoAccounts {
  const db = getDb();
  const customers = db
    .prepare("SELECT email, name FROM users WHERE role = 'cliente' AND active = 1 ORDER BY id")
    .all() as { email: string; name: string }[];
  const staff = db
    .prepare("SELECT email, name, role FROM users WHERE role IN ('cocina','admin') AND active = 1 ORDER BY CASE role WHEN 'cocina' THEN 0 ELSE 1 END, id")
    .all() as { email: string; name: string; role: Exclude<Role, "cliente"> }[];
  return { customers, staff, staffDemoPassword: STAFF_DEMO_PASSWORD };
}

function createSession(userId: number): string {
  const token = randomBytes(32).toString("hex");
  // Limpieza: borra las sesiones ya vencidas de cualquier usuario.
  getDb()
    .prepare(`DELETE FROM sessions WHERE created_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now','-${SESSION_TTL_HOURS} hours')`)
    .run();
  getDb().prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function loginCustomer(email: unknown): { token: string; user: User } {
  if (typeof email !== "string" || !email.trim()) {
    throw new AppError("UNAUTHENTICATED", "Cuenta no habilitada");
  }
  const row = getDb()
    .prepare(`SELECT ${USER_COLS} FROM users WHERE email = ?`)
    .get(email.trim()) as UserRow | undefined;
  if (!row || row.active !== 1 || row.role !== "cliente") {
    throw new AppError("UNAUTHENTICATED", "Cuenta no habilitada");
  }
  return { token: createSession(row.id), user: toUser(row) };
}

export function loginStaff(email: unknown, password: unknown): { token: string; user: User } {
  const fail = () => new AppError("UNAUTHENTICATED", "Email o contraseña incorrectos");
  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || password.length > 200) throw fail();
  const row = getDb()
    .prepare(`SELECT ${USER_COLS}, password_hash FROM users WHERE email = ?`)
    .get(email.trim()) as UserRow | undefined;
  const ok = verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || row.active !== 1 || (row.role !== "cocina" && row.role !== "admin") || !ok) throw fail();
  return { token: createSession(row.id), user: toUser(row) };
}

export function getSessionUser(token?: string | null): SessionUser | null {
  if (!token || typeof token !== "string") return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.active FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-${SESSION_TTL_HOURS} hours')`,
    )
    .get(token) as UserRow | undefined;
  if (!row || row.active !== 1) return null;
  return toUser(row);
}

export function logout(token?: string | null): void {
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function requireRole(actor: SessionUser | null | undefined, ...roles: Role[]): SessionUser {
  if (!actor) throw new AppError("UNAUTHENTICATED", "Iniciá sesión para continuar");
  if (!roles.includes(actor.role)) throw new AppError("FORBIDDEN", "No tenés permiso para esta acción");
  return actor;
}
