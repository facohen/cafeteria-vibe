// Acceso a SQLite (better-sqlite3, síncrono). Esquema + semilla idempotente.
// Contrato de datos: ver docs/TECNICO.md. Solo código de servidor.
import Database from "better-sqlite3";
import { randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { IconKey, Role } from "./contracts";

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

// Datos de demo completos (tarea 2): catálogo, personal, clientes y pedidos anteriores.
// Tipos explícitos para que las pruebas puedan recorrerlos.
export interface SeedUser {
  email: string;
  name: string;
  role: Role;
}
export interface SeedCategory {
  slug: string;
  name: string;
  sort: number;
}
export interface SeedProduct {
  slug: string;
  /** slug de la categoría */
  category: string;
  name: string;
  description: string;
  price: number;
  icon: IconKey;
  /** Por defecto true. */
  available?: boolean;
  sort: number;
}
/** Pedido anterior de ejemplo (siempre `entregado`). Fechas relativas al momento de sembrar. */
export interface SeedOrder {
  /** email del cliente dueño */
  customer: string;
  /** Hace cuántos días se hizo (≥ 1, siempre en el pasado); el más chico es el más reciente. */
  daysAgo: number;
  /** Hora de Buenos Aires (UTC−3), "HH:MM", hasta 20:59 (así cae en el día UTC indicado y en el pasado). */
  at: string;
  items: { product: string; quantity: number }[];
}

const SEED_USERS: SeedUser[] = [
  { email: "sofia@gmail.com", name: "Sofía Martínez", role: "cliente" },
  { email: "cocina@vibecoffee.local", name: "Cocina Vibe", role: "cocina" },
  { email: "admin@vibecoffee.local", name: "Admin Vibe", role: "admin" },
  { email: "martin.gomez@gmail.com", name: "Martín Gómez", role: "cliente" },
  { email: "lucia.fernandez@gmail.com", name: "Lucía Fernández", role: "cliente" },
  { email: "julian.rossi@gmail.com", name: "Julián Rossi", role: "cliente" },
  { email: "camila.diaz@gmail.com", name: "Camila Díaz", role: "cliente" },
  // Sin pedidos anteriores: muestra que «Pedí lo de siempre» no aparece.
  { email: "valentina.lopez@gmail.com", name: "Valentina López", role: "cliente" },
];

const SEED_CATEGORIES: SeedCategory[] = [
  { slug: "cafes", name: "Cafés", sort: 1 },
  { slug: "cafes-frios", name: "Cafés fríos", sort: 2 },
  { slug: "frias", name: "Tés y jugos", sort: 3 },
  { slug: "pasteleria", name: "Pastelería", sort: 4 },
  { slug: "salado", name: "Salado", sort: 5 },
];

const SEED_PRODUCTS: SeedProduct[] = [
  // Cafés
  { slug: "espresso", category: "cafes", name: "Espresso", description: "Corto e intenso", price: 2200, icon: "espresso", sort: 1 },
  { slug: "cortado", category: "cafes", name: "Cortado", description: "Espresso con un toque de leche", price: 2600, icon: "cortado", sort: 2 },
  { slug: "americano", category: "cafes", name: "Americano", description: "Espresso estirado con agua caliente", price: 2800, icon: "americano", sort: 3 },
  { slug: "latte", category: "cafes", name: "Latte", description: "Espresso y mucha leche cremosa", price: 3400, icon: "latte", sort: 4 },
  { slug: "cappuccino", category: "cafes", name: "Cappuccino", description: "Espuma, cacao y espresso", price: 3500, icon: "cappuccino", sort: 5 },
  { slug: "flat-white", category: "cafes", name: "Flat white", description: "Doble espresso con leche sedosa", price: 3600, icon: "flat_white", sort: 6 },
  { slug: "mocha", category: "cafes", name: "Mocha", description: "Espresso, chocolate y leche", price: 3900, icon: "mocha", sort: 7 },
  { slug: "submarino", category: "cafes", name: "Submarino", description: "Leche caliente con barrita de chocolate", price: 3800, icon: "submarino", sort: 8 },
  // Cafés fríos
  { slug: "cafe-helado", category: "cafes-frios", name: "Café helado", description: "Espresso sobre hielo, con o sin leche", price: 3800, icon: "cafe_helado", sort: 1 },
  { slug: "cold-brew", category: "cafes-frios", name: "Cold brew", description: "Infusionado en frío 18 horas", price: 4200, icon: "cafe_helado", sort: 2 },
  { slug: "latte-helado", category: "cafes-frios", name: "Latte helado", description: "Leche fría, hielo y espresso", price: 4300, icon: "cafe_helado", sort: 3 },
  // Tés y jugos
  { slug: "te-verde", category: "frias", name: "Té verde", description: "En hebras, caliente", price: 2400, icon: "te", sort: 1 },
  { slug: "te-negro", category: "frias", name: "Té negro", description: "English breakfast, con leche si querés", price: 2400, icon: "te", sort: 2 },
  { slug: "chai-latte", category: "frias", name: "Chai latte", description: "Especias, té negro y leche espumada", price: 3600, icon: "chai", sort: 3 },
  { slug: "jugo-naranja", category: "frias", name: "Jugo de naranja", description: "Exprimido en el momento", price: 3000, icon: "jugo", sort: 4 },
  { slug: "limonada", category: "frias", name: "Limonada", description: "Con menta y jengibre", price: 3500, icon: "limonada", sort: 5 },
  { slug: "licuado-banana", category: "frias", name: "Licuado de banana", description: "Banana y leche, bien frío", price: 4000, icon: "licuado", sort: 6 },
  { slug: "licuado-frutilla", category: "frias", name: "Licuado de frutilla", description: "Frutillas con leche o agua", price: 4200, icon: "licuado", sort: 7 },
  { slug: "agua", category: "frias", name: "Agua mineral", description: "500 ml, con o sin gas", price: 1800, icon: "agua", sort: 8 },
  // Pastelería
  { slug: "medialuna", category: "pasteleria", name: "Medialuna", description: "De manteca", price: 1200, icon: "medialuna", sort: 1 },
  { slug: "alfajor-maicena", category: "pasteleria", name: "Alfajor de maicena", description: "Dulce de leche y coco rallado", price: 1800, icon: "alfajor", sort: 2 },
  { slug: "alfajor-chocolate", category: "pasteleria", name: "Alfajor de chocolate", description: "Bañado en chocolate semiamargo", price: 2000, icon: "alfajor", sort: 3 },
  { slug: "cookie", category: "pasteleria", name: "Cookie con chips", description: "Grande, con chips de chocolate", price: 2200, icon: "cookie", sort: 4 },
  { slug: "budin-limon", category: "pasteleria", name: "Budín de limón", description: "Porción, con glaseado", price: 2600, icon: "budin", sort: 5 },
  { slug: "torta-chocolate", category: "pasteleria", name: "Torta de chocolate", description: "Porción húmeda con ganache", price: 4500, icon: "torta", sort: 6 },
  // No disponible: muestra la marca «no disponible» en la demo.
  { slug: "carrot-cake", category: "pasteleria", name: "Carrot cake", description: "Zanahoria, nueces y frosting", price: 4800, icon: "torta", available: false, sort: 7 },
  // Salado
  { slug: "tostado", category: "salado", name: "Tostado", description: "Jamón y queso", price: 4200, icon: "tostado", sort: 1 },
  { slug: "tostadas-palta", category: "salado", name: "Tostadas con palta", description: "Pan de masa madre, palta y huevo", price: 5200, icon: "tostadas", sort: 2 },
  { slug: "tostadas-mermelada", category: "salado", name: "Tostadas con mermelada", description: "Con queso crema y mermelada casera", price: 3200, icon: "tostadas", sort: 3 },
  { slug: "yogur-granola", category: "salado", name: "Yogur con granola", description: "Yogur natural, granola y frutas", price: 3800, icon: "yogur", sort: 4 },
];

// En orden cronológico (de más viejo a más nuevo) dentro de cada cliente.
const SEED_ORDERS: SeedOrder[] = [
  { customer: "sofia@gmail.com", daysAgo: 9, at: "09:15", items: [{ product: "cappuccino", quantity: 1 }, { product: "tostado", quantity: 1 }] },
  { customer: "sofia@gmail.com", daysAgo: 5, at: "08:40", items: [{ product: "flat-white", quantity: 1 }, { product: "alfajor-maicena", quantity: 1 }] },
  { customer: "sofia@gmail.com", daysAgo: 2, at: "09:05", items: [{ product: "latte", quantity: 1 }, { product: "medialuna", quantity: 2 }] },
  { customer: "martin.gomez@gmail.com", daysAgo: 6, at: "10:20", items: [{ product: "espresso", quantity: 2 }] },
  { customer: "martin.gomez@gmail.com", daysAgo: 1, at: "13:10", items: [{ product: "americano", quantity: 1 }, { product: "tostadas-palta", quantity: 1 }] },
  { customer: "lucia.fernandez@gmail.com", daysAgo: 3, at: "16:30", items: [{ product: "chai-latte", quantity: 1 }, { product: "budin-limon", quantity: 1 }] },
  { customer: "julian.rossi@gmail.com", daysAgo: 8, at: "11:45", items: [{ product: "cold-brew", quantity: 1 }, { product: "cookie", quantity: 2 }] },
  { customer: "julian.rossi@gmail.com", daysAgo: 4, at: "18:10", items: [{ product: "licuado-banana", quantity: 1 }, { product: "yogur-granola", quantity: 1 }] },
  {
    customer: "camila.diaz@gmail.com",
    daysAgo: 1,
    at: "17:40",
    items: [{ product: "mocha", quantity: 2 }, { product: "torta-chocolate", quantity: 1 }, { product: "agua", quantity: 1 }],
  },
];

export const SEED = {
  users: SEED_USERS,
  categories: SEED_CATEGORIES,
  products: SEED_PRODUCTS,
  orders: SEED_ORDERS,
} as const;

const MINUTE = 60_000;

/**
 * Carga la semilla sin duplicar ni pisar: INSERT OR IGNORE por clave natural
 * (email / slug). Lo que ya existe (p. ej. precios editados por admin) se conserva.
 * Los pedidos de ejemplo (sin clave natural) se cargan solo para clientes sin ningún pedido;
 * copian nombre, precio e ícono actuales del producto y quedan `entregado`.
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
      "INSERT OR IGNORE INTO products (slug, category_id, name, description, price, icon, available, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    for (const p of SEED.products) {
      const c = catId.get(p.category) as { id: number } | undefined;
      if (!c) continue;
      insProd.run(p.slug, c.id, p.name, p.description, p.price, p.icon, p.available === false ? 0 : 1, p.sort);
    }

    // Pedidos de ejemplo: solo para clientes que todavía no tienen ningún pedido.
    const userRow = db.prepare("SELECT id FROM users WHERE email = ?");
    const hasOrders = db.prepare("SELECT 1 FROM orders WHERE user_id = ? LIMIT 1");
    const prodRow = db.prepare("SELECT id, name, price, icon FROM products WHERE slug = ?");
    const insOrder = db.prepare(
      "INSERT INTO orders (user_id, status, total, created_at, paid_at, ready_at, finished_at) VALUES (?, 'entregado', ?, ?, ?, ?, ?)",
    );
    const insItem = db.prepare(
      "INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, icon) VALUES (?, ?, ?, ?, ?, ?)",
    );
    // Se decide por cliente antes de insertar nada (si no, el 2.º pedido de un cliente se saltearía).
    const eligible = new Map<string, number>();
    for (const email of new Set(SEED.orders.map((o) => o.customer))) {
      const u = userRow.get(email) as { id: number } | undefined;
      if (u && !hasOrders.get(u.id)) eligible.set(email, u.id);
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (const o of SEED.orders) {
      const userId = eligible.get(o.customer);
      if (userId === undefined) continue;
      const lines = o.items
        .map((it) => ({ p: prodRow.get(it.product) as { id: number; name: string; price: number; icon: string } | undefined, q: it.quantity }))
        .filter((l): l is { p: { id: number; name: string; price: number; icon: string }; q: number } => !!l.p);
      if (lines.length === 0) continue;
      const total = lines.reduce((s, l) => s + l.p.price * l.q, 0);
      // Pago al minuto de crearlo, listo a los 6 y entregado a los 8.
      const [hh, mm] = o.at.split(":").map(Number);
      const created = today.getTime() - o.daysAgo * 24 * 60 * MINUTE + ((hh + 3) * 60 + mm) * MINUTE;
      const iso = (t: number) => new Date(t).toISOString();
      const id = Number(
        insOrder.run(userId, total, iso(created), iso(created + MINUTE), iso(created + 6 * MINUTE), iso(created + 8 * MINUTE))
          .lastInsertRowid,
      );
      for (const l of lines) insItem.run(id, l.p.id, l.p.name, l.p.price, l.q, l.p.icon);
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
