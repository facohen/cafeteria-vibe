// Utilidades de prueba: base nueva en memoria por test, actores y matcher de AppError.
import { beforeEach, expect } from "vitest";
import { openDb, setDbForTests, STAFF_DEMO_PASSWORD, type DB } from "@/lib/db";
import { AppError, type ErrorCode, type SessionUser, type CreateOrderInput } from "@/lib/contracts";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";

export const CUSTOMER_EMAIL = "sofia@gmail.com";
export const KITCHEN_EMAIL = "cocina@vibecoffee.local";
export const ADMIN_EMAIL = "admin@vibecoffee.local";
export { STAFF_DEMO_PASSWORD };

let current: DB;

/** Registrar en cada archivo de test: base nueva (esquema + semilla) antes de cada test. */
export function useFreshDb(): void {
  beforeEach(() => {
    current = openDb(":memory:");
    setDbForTests(current);
  });
}

export function db(): DB {
  return current;
}

/** Inserta un cliente extra (Google simulado, sin contraseña). */
export function createCustomer(email: string, name = "Cliente Extra", active = true): number {
  const r = current
    .prepare("INSERT INTO users (email, name, role, password_hash, active) VALUES (?, ?, 'cliente', NULL, ?)")
    .run(email, name, active ? 1 : 0);
  return Number(r.lastInsertRowid);
}

function resolve(token: string): SessionUser {
  const u = getSessionUser(token);
  if (!u) throw new Error("getSessionUser devolvió null para un token recién emitido");
  return u;
}

export function customerActor(email = CUSTOMER_EMAIL): SessionUser {
  return resolve(loginCustomer(email).token);
}
export function kitchenActor(): SessionUser {
  return resolve(loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token);
}
export function adminActor(): SessionUser {
  return resolve(loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD).token);
}

export function productId(slug: string): number {
  const row = current.prepare("SELECT id FROM products WHERE slug = ?").get(slug) as { id: number } | undefined;
  if (!row) throw new Error(`producto ${slug} no existe en la semilla`);
  return row.id;
}

/** Entrada típica: 2 latte + 1 medialuna. */
export function sampleInput(): CreateOrderInput {
  return {
    items: [
      { productId: productId("latte"), quantity: 2 },
      { productId: productId("medialuna"), quantity: 1 },
    ],
  };
}

/** Espera que fn lance AppError con ese code. */
export function expectCode(fn: () => unknown, code: ErrorCode): void {
  let thrown: unknown;
  try {
    fn();
  } catch (e) {
    thrown = e;
  }
  expect(thrown, `se esperaba AppError ${code} y no se lanzó nada`).toBeDefined();
  expect(thrown, `se esperaba AppError ${code}, se lanzó: ${String(thrown)}`).toBeInstanceOf(AppError);
  expect((thrown as AppError).code).toBe(code);
}

/** Usuario por email (fila cruda de la base, incluye password_hash). */
export function userRow(email: string): { id: number; email: string; name: string; role: string; active: number; password_hash: string | null } {
  const row = current.prepare("SELECT * FROM users WHERE email = ?").get(email) as ReturnType<typeof userRow> | undefined;
  if (!row) throw new Error(`usuario ${email} no existe`);
  return row;
}

/** Cantidad de sesiones vivas de un usuario. */
export function sessionCount(userId: number): number {
  return (current.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?").get(userId) as { n: number }).n;
}

/** Recorre el valor y falla si aparece alguna clave password_hash / password (nunca se devuelven). */
export function expectNoSecrets(value: unknown): void {
  const json = JSON.stringify(value);
  expect(json).not.toContain("password_hash");
  expect(json).not.toContain('"password"');
  expect(json).not.toMatch(/[0-9a-f]{32}:[0-9a-f]{64}/); // forma salt:hash de hashPassword
}
