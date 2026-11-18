// Acceso a SQLite (better-sqlite3, síncrono). Esquema + semilla idempotente.
// Contrato de datos: ver docs/TECNICO.md. Solo código de servidor.
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type DB = Database.Database;

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cliente','cocina','admin')),
  password_hash TEXT,              -- solo personal; clientes entran con Google simulado
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL CHECK (price > 0),
  icon TEXT NOT NULL DEFAULT 'generico',
  available INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pendiente_pago','pagado','listo','entregado','cancelado')),
  total INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  paid_at TEXT, ready_at TEXT, finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  icon TEXT NOT NULL DEFAULT 'generico'
);
`;

export const STAFF_DEMO_PASSWORD = "cafe1234";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}

// Datos mínimos de la tarea 1 (la tarea 2 amplía catálogo, clientes y pedidos de ejemplo).
export const SEED = {
  users: [
    { email: "sofia@gmail.com", name: "Sofía Martínez", role: "cliente" },
    { email: "cocina@vibecoffee.local", name: "Cocina Vibe", role: "cocina" },
    { email: "admin@vibecoffee.local", name: "Admin Vibe", role: "admin" },
  ],
  categories: [
    { slug: "cafes", name: "Cafés", sort: 1 },
    { slug: "frias", name: "Frías y tés", sort: 2 },
    { slug: "pasteleria", name: "Pastelería", sort: 3 },
  ],
  products: [
    { slug: "espresso", category: "cafes", name: "Espresso", description: "Corto e intenso", price: 2200, icon: "espresso", sort: 1 },
    { slug: "cortado", category: "cafes", name: "Cortado", description: "Espresso con un toque de leche", price: 2600, icon: "cortado", sort: 2 },
    { slug: "latte", category: "cafes", name: "Latte", description: "Espresso y mucha leche cremosa", price: 3400, icon: "latte", sort: 3 },
    { slug: "cappuccino", category: "cafes", name: "Cappuccino", description: "Espuma, cacao y espresso", price: 3500, icon: "cappuccino", sort: 4 },
    { slug: "te-verde", category: "frias", name: "Té verde", description: "En hebras, caliente", price: 2400, icon: "te", sort: 1 },
    { slug: "jugo-naranja", category: "frias", name: "Jugo de naranja", description: "Exprimido en el momento", price: 3000, icon: "jugo", sort: 2 },
    { slug: "medialuna", category: "pasteleria", name: "Medialuna", description: "De manteca", price: 1200, icon: "medialuna", sort: 1 },
    { slug: "tostado", category: "pasteleria", name: "Tostado", description: "Jamón y queso", price: 4200, icon: "tostado", sort: 2 },
  ],
} as const;

/**
 * Carga la semilla sin duplicar ni pisar: INSERT OR IGNORE por clave natural
 * (email / slug). Lo que ya existe (p. ej. precios editados por admin) se conserva.
 */
export function seed(db: DB): void {
  const tx = db.transaction(() => {
    const insUser = db.prepare(
      "INSERT OR IGNORE INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)",
    );
    for (const u of SEED.users) {
      insUser.run(u.email, u.name, u.role, u.role === "cliente" ? null : hashPassword(STAFF_DEMO_PASSWORD));
    }
    const insCat = db.prepare("INSERT OR IGNORE INTO categories (slug, name, sort) VALUES (?, ?, ?)");
    for (const c of SEED.categories) insCat.run(c.slug, c.name, c.sort);
    const catId = db.prepare("SELECT id FROM categories WHERE slug = ?");
    const insProd = db.prepare(
      "INSERT OR IGNORE INTO products (slug, category_id, name, description, price, icon, sort) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const p of SEED.products) {
      const c = catId.get(p.category) as { id: number };
      insProd.run(p.slug, c.id, p.name, p.description, p.price, p.icon, p.sort);
    }
  });
  tx();
}

/** Abre una base (archivo o ":memory:"), aplica esquema y semilla. Usar en tests con ":memory:". */
export function openDb(file: string): DB {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seed(db);
  return db;
}

const g = globalThis as unknown as { __vibeDb?: DB };

/** Base de la app (singleton). Ruta: env VIBE_DB_PATH o data/vibe.db. */
export function getDb(): DB {
  if (!g.__vibeDb) {
    g.__vibeDb = openDb(process.env.VIBE_DB_PATH || path.join(process.cwd(), "data", "vibe.db"));
  }
  return g.__vibeDb;
}

/** Solo para tests: reemplaza la base singleton. */
export function setDbForTests(db: DB): void {
  g.__vibeDb = db;
}
