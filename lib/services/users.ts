// Administración de usuarios y roles (solo servidor). Contrato: lib/contracts.ts «Contratos de la tarea 2».
// Orden de chequeo: sesión → rol → id → existencia → cuerpo.
import { getDb, hashPassword, STAFF_DEMO_PASSWORD } from "@/lib/db";
import { ADMIN_LIMITS, AppError, ROLES, type Role, type SessionUser, type User } from "@/lib/contracts";
import { requireRole, toUser } from "@/lib/services/auth";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: number;
  password_hash: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isStaffRole = (r: Role) => r === "cocina" || r === "admin";
const fail = (msg: string) => new AppError("VALIDATION", msg);

function parseId(id: unknown): number {
  const n = typeof id === "number" ? id : typeof id === "string" && /^\d+$/.test(id) ? Number(id) : NaN;
  if (!Number.isSafeInteger(n) || n <= 0) throw fail("Id de usuario inválido");
  return n;
}

function findRow(id: number): UserRow {
  const row = getDb()
    .prepare("SELECT id, email, name, role, active, password_hash FROM users WHERE id = ?")
    .get(id) as UserRow | undefined;
  if (!row) throw new AppError("NOT_FOUND", "No existe ese usuario");
  return row;
}

function asObject(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw fail("Datos de usuario inválidos");
  return v as Record<string, unknown>;
}

function parseEmail(v: unknown, exceptId?: number): string {
  if (typeof v !== "string") throw fail("Ingresá un email");
  const email = v.trim().toLowerCase();
  if (!email) throw fail("Ingresá un email");
  if (email.length > ADMIN_LIMITS.email.max) throw fail(`El email puede tener hasta ${ADMIN_LIMITS.email.max} caracteres`);
  if (!EMAIL_RE.test(email)) throw fail("El email no tiene un formato válido");
  const dup = getDb().prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, exceptId ?? 0);
  if (dup) throw fail("Ya existe un usuario con ese email");
  return email;
}

function parseName(v: unknown): string {
  if (typeof v !== "string") throw fail("Ingresá un nombre");
  const name = v.trim();
  const { min, max } = ADMIN_LIMITS.userName;
  if (name.length < min) throw fail("Ingresá un nombre");
  if (name.length > max) throw fail(`El nombre puede tener hasta ${max} caracteres`);
  return name;
}

function parseRole(v: unknown): Role {
  if (typeof v !== "string" || !(ROLES as string[]).includes(v)) throw fail("Rol inválido");
  return v as Role;
}

function parseActive(v: unknown): boolean {
  if (typeof v !== "boolean") throw fail("El estado debe ser verdadero o falso");
  return v;
}

function parsePassword(v: unknown): string {
  const { min, max } = ADMIN_LIMITS.password;
  if (typeof v !== "string" || v.length < min || v.length > max) {
    throw fail(`La contraseña debe tener entre ${min} y ${max} caracteres`);
  }
  return v;
}

function deleteSessions(userId: number): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/** Traduce el choque de UNIQUE (carrera entre dos altas) al mismo mensaje de validación. */
function uniqueGuard<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if ((err as { code?: string })?.code === "SQLITE_CONSTRAINT_UNIQUE") throw fail("Ya existe un usuario con ese email");
    throw err;
  }
}

export function listUsers(actor: SessionUser | null): User[] {
  requireRole(actor, "admin");
  const rows = getDb()
    .prepare(
      "SELECT id, email, name, role, active FROM users ORDER BY CASE role WHEN 'cliente' THEN 0 WHEN 'cocina' THEN 1 ELSE 2 END, name COLLATE NOCASE, id",
    )
    .all() as UserRow[];
  return rows.map(toUser);
}

export function createUser(actor: SessionUser | null, input: unknown): User {
  requireRole(actor, "admin");
  const body = asObject(input);
  const email = parseEmail(body.email);
  const name = parseName(body.name);
  const role = parseRole(body.role);
  const active = body.active === undefined ? true : parseActive(body.active);
  let hash: string | null = null;
  if (isStaffRole(role)) {
    hash = hashPassword(body.password === undefined ? STAFF_DEMO_PASSWORD : parsePassword(body.password));
  }
  const info = uniqueGuard(() =>
    getDb()
      .prepare("INSERT INTO users (email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?)")
      .run(email, name, role, hash, active ? 1 : 0),
  );
  return toUser(findRow(Number(info.lastInsertRowid)));
}

export function updateUser(actor: SessionUser | null, id: unknown, patch: unknown): User {
  const admin = requireRole(actor, "admin");
  const userId = parseId(id);
  const current = findRow(userId);
  const body = asObject(patch);

  const email = body.email === undefined ? current.email : parseEmail(body.email, userId);
  const name = body.name === undefined ? current.name : parseName(body.name);
  const role = body.role === undefined ? current.role : parseRole(body.role);
  const active = body.active === undefined ? current.active === 1 : parseActive(body.active);

  if (userId === admin.id) {
    if (role !== "admin") throw fail("No podés quitarte el rol de administración");
    if (!active) throw fail("No podés darte de baja a vos mismo");
  }

  let hash = current.password_hash;
  if (isStaffRole(role)) {
    if (body.password !== undefined) hash = hashPassword(parsePassword(body.password));
    else if (!hash) hash = hashPassword(STAFF_DEMO_PASSWORD);
  } else {
    hash = null; // los clientes no tienen contraseña (entran con Google simulado)
  }

  const roleChanged = role !== current.role;
  const deactivated = !active;
  const db = getDb();
  db.transaction(() => {
    uniqueGuard(() =>
      db
        .prepare("UPDATE users SET email = ?, name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?")
        .run(email, name, role, active ? 1 : 0, hash, userId),
    );
    if (roleChanged || deactivated) deleteSessions(userId);
  })();
  return toUser(findRow(userId));
}

export function deactivateUser(actor: SessionUser | null, id: unknown): User {
  const admin = requireRole(actor, "admin");
  const userId = parseId(id);
  findRow(userId);
  if (userId === admin.id) throw fail("No podés darte de baja a vos mismo");
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(userId);
    deleteSessions(userId);
  })();
  return toUser(findRow(userId));
}
