// Administración de usuarios y roles (solo servidor). Contrato: lib/contracts.ts §«Contratos de la tarea 2».
// Orden de chequeo: sesión → rol admin → existencia → validación.
import { getDb, hashPassword, STAFF_DEMO_PASSWORD } from "@/lib/db";
import { ADMIN_LIMITS, AppError, ROLES, type Role, type SessionUser, type User, type UserInput } from "@/lib/contracts";
import { requireRole, toUser } from "@/lib/services/auth";

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: number;
  password_hash: string | null;
}

const USER_COLS = "id, email, name, role, active, password_hash";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVISIBLE_RE = /[\p{Cf}\p{Cc}\p{Z}\u115F\u1160\u3164\uFFA0]/gu;
const isStaff = (role: Role) => role === "cocina" || role === "admin";

/** Acepta número o el string crudo de la URL; se valida DESPUÉS de sesión y rol. */
function validId(raw: unknown): number {
  const id = typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : raw;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError("NOT_FOUND", "Usuario no encontrado");
  }
  return id;
}

function loadRow(id: number): UserRow | undefined {
  return getDb().prepare(`SELECT ${USER_COLS} FROM users WHERE id = ?`).get(id) as UserRow | undefined;
}

function loadExisting(id: unknown): UserRow {
  const row = loadRow(validId(id));
  if (!row) throw new AppError("NOT_FOUND", "Usuario no encontrado");
  return row;
}

function asObject(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AppError("VALIDATION", "Datos del usuario inválidos");
  }
  return input as Record<string, unknown>;
}

function parseEmail(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw new AppError("VALIDATION", "El email es obligatorio");
  const email = v.trim().toLowerCase();
  if (email.length > ADMIN_LIMITS.emailMax) {
    throw new AppError("VALIDATION", `El email puede tener hasta ${ADMIN_LIMITS.emailMax} caracteres`);
  }
  if (!EMAIL_RE.test(email)) throw new AppError("VALIDATION", "El email no tiene un formato válido (ej.: nombre@dominio.com)");
  return email;
}

function parseName(v: unknown): string {
  // Además de trim, se descartan nombres hechos solo de caracteres invisibles (U+200B, \p{Cf}, etc.).
  if (typeof v !== "string" || !v.replace(INVISIBLE_RE, "").trim()) {
    throw new AppError("VALIDATION", "El nombre es obligatorio");
  }
  const name = v.trim();
  if (name.length > ADMIN_LIMITS.userNameMax) {
    throw new AppError("VALIDATION", `El nombre puede tener hasta ${ADMIN_LIMITS.userNameMax} caracteres`);
  }
  return name;
}

function parseRole(v: unknown): Role {
  if (typeof v !== "string" || !(ROLES as string[]).includes(v)) {
    throw new AppError("VALIDATION", "El rol debe ser cliente, cocina o admin");
  }
  return v as Role;
}

function parseActive(v: unknown): boolean {
  if (typeof v !== "boolean") throw new AppError("VALIDATION", "El estado activo debe ser verdadero o falso");
  return v;
}

/** Email único sin distinguir mayúsculas (la columna es COLLATE NOCASE). */
function assertEmailFree(email: string, exceptId: number | null): void {
  const other = getDb()
    .prepare("SELECT id FROM users WHERE email = ? AND id IS NOT ?")
    .get(email, exceptId) as { id: number } | undefined;
  if (other) throw new AppError("VALIDATION", "Ya existe un usuario con ese email");
}

/** Traduce un choque de UNIQUE (carrera entre el chequeo y la escritura) a VALIDATION. */
function withUniqueGuard<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if ((err as { code?: string })?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new AppError("VALIDATION", "Ya existe un usuario con ese email");
    }
    throw err;
  }
}

function deleteSessions(userId: number): void {
  getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/** Dentro de la transacción: el actor (ya resuelto) sigue siendo admin activo en la base. */
function assertActorStillAdmin(actorId: number): void {
  const row = loadRow(actorId);
  if (!row || row.active !== 1 || row.role !== "admin") {
    throw new AppError("FORBIDDEN", "No tenés permiso para esta acción");
  }
}

/** Dentro de la transacción, tras escribir: tiene que quedar al menos un admin activo (si no, se revierte). */
function assertSomeAdminLeft(): void {
  const { n } = getDb().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get() as { n: number };
  if (n === 0) throw new AppError("VALIDATION", "Tiene que quedar al menos un administrador activo");
}

function reloadInTx(id: number): UserRow {
  const row = loadRow(id);
  if (!row) throw new AppError("NOT_FOUND", "Usuario no encontrado");
  return row;
}

export function listUsers(actor: SessionUser | null): User[] {
  requireRole(actor, "admin");
  const rows = getDb()
    .prepare(
      `SELECT ${USER_COLS} FROM users
       ORDER BY CASE role WHEN 'cliente' THEN 0 WHEN 'cocina' THEN 1 ELSE 2 END, name COLLATE NOCASE, id`,
    )
    .all() as UserRow[];
  return rows.map(toUser);
}

export function createUser(actor: SessionUser | null, input: unknown): User {
  const admin = requireRole(actor, "admin");
  const o = asObject(input);
  const data: UserInput = {
    email: parseEmail(o.email),
    name: parseName(o.name),
    role: parseRole(o.role),
    active: o.active === undefined ? true : parseActive(o.active),
  };
  const db = getDb();
  return withUniqueGuard(() =>
    db.transaction(() => {
      assertActorStillAdmin(admin.id);
      assertEmailFree(data.email, null);
      const hash = isStaff(data.role) ? hashPassword(STAFF_DEMO_PASSWORD) : null;
      const info = db
        .prepare("INSERT INTO users (email, name, role, password_hash, active) VALUES (?, ?, ?, ?, ?)")
        .run(data.email, data.name, data.role, hash, data.active ? 1 : 0);
      return toUser(loadRow(Number(info.lastInsertRowid))!);
    })(),
  );
}

export function updateUser(actor: SessionUser | null, id: unknown, patch: unknown): User {
  const admin = requireRole(actor, "admin");
  const existing = loadExisting(id);
  const o = asObject(patch);
  const next: Partial<UserInput> = {};
  if (o.email !== undefined) next.email = parseEmail(o.email);
  if (o.name !== undefined) next.name = parseName(o.name);
  if (o.role !== undefined) next.role = parseRole(o.role);
  if (o.active !== undefined) next.active = parseActive(o.active);

  if (existing.id === admin.id) {
    if (next.active === false) throw new AppError("VALIDATION", "No podés darte de baja a vos mismo");
    if (next.role !== undefined && next.role !== "admin") {
      throw new AppError("VALIDATION", "No podés quitarte el rol de administración");
    }
  }

  const db = getDb();
  return withUniqueGuard(() =>
    db.transaction(() => {
      assertActorStillAdmin(admin.id);
      const current = reloadInTx(existing.id);
      const role = next.role ?? current.role;
      const active = next.active ?? current.active === 1;
      if (next.email !== undefined) assertEmailFree(next.email, current.id);
      const hash = isStaff(role) && !current.password_hash ? hashPassword(STAFF_DEMO_PASSWORD) : current.password_hash;
      db.prepare("UPDATE users SET email = ?, name = ?, role = ?, active = ?, password_hash = ? WHERE id = ?").run(
        next.email ?? current.email,
        next.name ?? current.name,
        role,
        active ? 1 : 0,
        hash,
        current.id,
      );
      assertSomeAdminLeft();
      // Baja o cambio de rol: se cierran sus sesiones (vuelve a entrar con el rol nuevo, o no entra).
      if (!active || role !== current.role) deleteSessions(current.id);
      return toUser(loadRow(current.id)!);
    })(),
  );
}

export function deactivateUser(actor: SessionUser | null, id: unknown): User {
  const admin = requireRole(actor, "admin");
  const existing = loadExisting(id);
  if (existing.id === admin.id) throw new AppError("VALIDATION", "No podés darte de baja a vos mismo");
  const db = getDb();
  return db.transaction(() => {
    assertActorStillAdmin(admin.id);
    const current = reloadInTx(existing.id);
    db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(current.id);
    assertSomeAdminLeft();
    deleteSessions(current.id);
    return toUser(loadRow(current.id)!);
  })();
}
