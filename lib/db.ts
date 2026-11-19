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

// Datos de demo (tarea 2): catálogo completo, clientes y pedidos anteriores para «Pedí lo de siempre».
// Los 3 usuarios, 3 categorías y 8 productos de la tarea 1 se conservan tal cual (las pruebas los usan).
interface SeedUser {
  email: string;
  name: string;
  role: "cliente" | "cocina" | "admin";
}
interface SeedCategory {
  slug: string;
  name: string;
  sort: number;
}
interface SeedProduct {
  slug: string;
  category: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  sort: number;
  /** Por defecto disponible. */
  available?: boolean;
}
/** Pedido anterior (entregado) de un cliente de demo; las fechas son relativas al momento de la semilla. */
interface SeedOrder {
  email: string;
  /** Días antes de hoy (>= 1). */
  daysAgo: number;
  /** Hora UTC del pedido, "HH:MM" (Argentina = UTC-3). */
  time: string;
  items: { slug: string; quantity: number }[];
}

export const SEED: {
  users: readonly SeedUser[];
  categories: readonly SeedCategory[];
  products: readonly SeedProduct[];
  orders: readonly SeedOrder[];
} = {
  users: [
    { email: "sofia@gmail.com", name: "Sofía Martínez", role: "cliente" },
    { email: "cocina@vibecoffee.local", name: "Cocina Vibe", role: "cocina" },
    { email: "admin@vibecoffee.local", name: "Admin Vibe", role: "admin" },
    { email: "lucas@gmail.com", name: "Lucas Fernández", role: "cliente" },
    { email: "valentina@gmail.com", name: "Valentina Gómez", role: "cliente" },
    { email: "martin@gmail.com", name: "Martín López", role: "cliente" },
    { email: "camila@gmail.com", name: "Camila Ruiz", role: "cliente" },
  ],
  categories: [
    { slug: "cafes", name: "Cafés", sort: 1 },
    { slug: "frias", name: "Tés y jugos", sort: 2 },
    { slug: "pasteleria", name: "Pastelería", sort: 3 },
    // Sin categorías nuevas: tests/flow.test.ts (tarea 1) exige exactamente estas tres.
  ],
  products: [
    // Tarea 1 (no cambiar: las pruebas usan slugs, precios e íconos).
    { slug: "espresso", category: "cafes", name: "Espresso", description: "Corto e intenso", price: 2200, icon: "espresso", sort: 1 },
    { slug: "cortado", category: "cafes", name: "Cortado", description: "Espresso con un toque de leche", price: 2600, icon: "cortado", sort: 2 },
    { slug: "latte", category: "cafes", name: "Latte", description: "Espresso y mucha leche cremosa", price: 3400, icon: "latte", sort: 3 },
    { slug: "cappuccino", category: "cafes", name: "Cappuccino", description: "Espuma, cacao y espresso", price: 3500, icon: "cappuccino", sort: 4 },
    { slug: "te-verde", category: "frias", name: "Té verde", description: "En hebras, caliente", price: 2400, icon: "te", sort: 1 },
    { slug: "jugo-naranja", category: "frias", name: "Jugo de naranja", description: "Exprimido en el momento", price: 3000, icon: "jugo", sort: 2 },
    { slug: "medialuna", category: "pasteleria", name: "Medialuna", description: "De manteca", price: 1200, icon: "medialuna", sort: 1 },
    { slug: "tostado", category: "pasteleria", name: "Tostado", description: "Jamón y queso", price: 4200, icon: "tostado", sort: 2 },
    // Tarea 2: catálogo completo.
    { slug: "americano", category: "cafes", name: "Americano", description: "Espresso alargado con agua caliente", price: 2800, icon: "americano", sort: 5 },
    { slug: "lagrima", category: "cafes", name: "Lágrima", description: "Leche caliente con unas gotas de café", price: 3000, icon: "latte", sort: 6 },
    { slug: "mocha", category: "cafes", name: "Mocha", description: "Espresso, chocolate y crema", price: 3900, icon: "mocha", sort: 7 },
    { slug: "chocolate-caliente", category: "cafes", name: "Chocolate caliente", description: "Con malvaviscos", price: 3600, icon: "chocolate", sort: 8 },
    { slug: "te-frutos-rojos", category: "frias", name: "Té de frutos rojos", description: "Infusión frutal, caliente", price: 2400, icon: "te", sort: 3 },
    { slug: "limonada", category: "frias", name: "Limonada", description: "Con menta y jengibre", price: 3200, icon: "limonada", sort: 4 },
    { slug: "alfajor-maicena", category: "pasteleria", name: "Alfajor de maicena", description: "Con dulce de leche y coco", price: 1500, icon: "alfajor", sort: 3 },
    { slug: "cookie-chips", category: "pasteleria", name: "Cookie", description: "Con chips de chocolate", price: 1800, icon: "cookie", sort: 4 },
    { slug: "muffin-arandanos", category: "pasteleria", name: "Muffin de arándanos", description: "Esponjoso, recién horneado", price: 2400, icon: "muffin", sort: 5 },
    { slug: "budin-limon", category: "pasteleria", name: "Budín de limón", description: "Con glaseado (hoy se terminó)", price: 2600, icon: "budin", sort: 6, available: false },
    { slug: "cafe-frio", category: "cafes", name: "Café frío", description: "Cold brew con hielo", price: 3800, icon: "frio", sort: 9 },
    { slug: "latte-helado", category: "cafes", name: "Latte helado", description: "Espresso, leche fría y hielo", price: 4000, icon: "frio", sort: 10 },
    { slug: "agua-sin-gas", category: "frias", name: "Agua sin gas", description: "Botella de 500 ml", price: 1800, icon: "agua", sort: 5 },
    { slug: "agua-con-gas", category: "frias", name: "Agua con gas", description: "Botella de 500 ml", price: 1800, icon: "agua", sort: 6 },
    { slug: "sandwich-miga", category: "pasteleria", name: "Sándwich de miga", description: "Triple de jamón y queso", price: 3600, icon: "tostado", sort: 7 },
    { slug: "medialuna-jyq", category: "pasteleria", name: "Medialuna con jamón y queso", description: "Tibia, de manteca", price: 2600, icon: "medialuna", sort: 8 },
  ],
  // El último pedido de cada cliente es su «de siempre». Camila no tiene pedidos (cliente nuevo).
  orders: [
    { email: "sofia@gmail.com", daysAgo: 6, time: "11:40", items: [{ slug: "latte", quantity: 1 }, { slug: "medialuna", quantity: 1 }] },
    { email: "sofia@gmail.com", daysAgo: 3, time: "12:05", items: [{ slug: "cappuccino", quantity: 1 }, { slug: "medialuna", quantity: 2 }] },
    { email: "sofia@gmail.com", daysAgo: 1, time: "11:55", items: [{ slug: "cappuccino", quantity: 1 }, { slug: "medialuna", quantity: 2 }] },
    { email: "lucas@gmail.com", daysAgo: 5, time: "15:20", items: [{ slug: "espresso", quantity: 2 }] },
    { email: "lucas@gmail.com", daysAgo: 2, time: "15:10", items: [{ slug: "americano", quantity: 1 }, { slug: "tostado", quantity: 1 }] },
    { email: "valentina@gmail.com", daysAgo: 4, time: "18:30", items: [{ slug: "limonada", quantity: 1 }, { slug: "cookie-chips", quantity: 1 }] },
    { email: "valentina@gmail.com", daysAgo: 1, time: "19:15", items: [{ slug: "te-verde", quantity: 1 }, { slug: "muffin-arandanos", quantity: 1 }] },
    { email: "martin@gmail.com", daysAgo: 2, time: "13:45", items: [{ slug: "cafe-frio", quantity: 1 }, { slug: "alfajor-maicena", quantity: 2 }] },
  ],
};

/** ISO UTC (como el SCHEMA) de `daysAgo` días antes de `now`, a la hora UTC "HH:MM", más `plusMin` minutos. */
function seedTimestamp(now: Date, daysAgo: number, time: string, plusMin: number): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, h, m + plusMin));
  return d.toISOString();
}

/**
 * Carga la semilla sin duplicar ni pisar: INSERT OR IGNORE por clave natural
 * (email / slug). Lo que ya existe (p. ej. precios editados por admin) se conserva.
 * Pedidos de demo: se insertan para un cliente solo si todavía no tiene ningún pedido pagado,
 * listo o entregado (así una base con solo pendientes/cancelados también recibe su «de siempre»).
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
      const c = catId.get(p.category) as { id: number };
      insProd.run(p.slug, c.id, p.name, p.description, p.price, p.icon, p.available === false ? 0 : 1, p.sort);
    }
    seedOrders(db);
  });
  tx();
}

/** Pedidos entregados de días anteriores; copian nombre, precio e ícono actuales del producto. */
function seedOrders(db: DB): void {
  const userByEmail = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'cliente'");
  // Solo cuentan pedidos que sirven para «Pedí lo de siempre» (no pendiente_pago ni cancelado).
  const hasOrders = db.prepare(
    "SELECT 1 FROM orders WHERE user_id = ? AND status IN ('pagado','listo','entregado') LIMIT 1",
  );
  const prodBySlug = db.prepare("SELECT id, name, price, icon FROM products WHERE slug = ?");
  const insOrder = db.prepare(
    "INSERT INTO orders (user_id, status, total, created_at, paid_at, ready_at, finished_at) VALUES (?, 'entregado', ?, ?, ?, ?, ?)",
  );
  const insItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, icon) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const now = new Date();
  // Se decide por cliente antes de insertar: así los varios pedidos de un mismo cliente entran juntos.
  const skip = new Map<string, boolean>();
  for (const o of SEED.orders) {
    if (!skip.has(o.email)) {
      const u = userByEmail.get(o.email) as { id: number } | undefined;
      skip.set(o.email, !u || hasOrders.get(u.id) !== undefined);
    }
    if (skip.get(o.email)) continue;
    const u = userByEmail.get(o.email) as { id: number };
    const lines = o.items.map((it) => {
      const p = prodBySlug.get(it.slug) as { id: number; name: string; price: number; icon: string } | undefined;
      if (!p) throw new Error(`semilla: producto ${it.slug} no existe`);
      return { ...p, quantity: it.quantity };
    });
    const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    const at = (min: number) => seedTimestamp(now, o.daysAgo, o.time, min);
    const orderId = Number(insOrder.run(u.id, total, at(0), at(1), at(6), at(9)).lastInsertRowid);
    for (const l of lines) insItem.run(orderId, l.id, l.name, l.price, l.quantity, l.icon);
  }
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
