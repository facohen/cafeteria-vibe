// Regresión: la semilla se aplica una sola vez por SEED_VERSION (tabla meta); lo que admin cambie o
// borre no reaparece, y una base sin marca (tarea 1) se completa sin pisar nada.
import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { SCHEMA, SEED, SEED_VERSION, hashPassword, seed, STAFF_DEMO_PASSWORD, type DB } from "@/lib/db";
import { deleteCategory, updateProduct } from "@/lib/services/catalog-admin";
import { updateUser } from "@/lib/services/users";
import { adminActor, db, useFreshDb } from "./helpers";

useFreshDb();

const n = (d: DB, sql: string, ...args: unknown[]) => (d.prepare(sql).get(...args) as { n: number }).n;
const count = (t: string, d: DB = db()) => n(d, `SELECT COUNT(*) AS n FROM ${t}`);
const marker = (d: DB = db()) =>
  (d.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get() as { value: string } | undefined)?.value;
const userId = (email: string) => (db().prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number }).id;
const ordersOf = (email: string, d: DB = db()) =>
  n(d, "SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.user_id WHERE u.email = ?", email);
const snapshot = (t: string, d: DB = db()) => d.prepare(`SELECT * FROM ${t} ORDER BY id`).all();
const TABLES = ["users", "categories", "products", "orders", "order_items"];

describe("marca de versión", () => {
  it("openDb deja la marca seed_version = SEED_VERSION", () => {
    expect(SEED_VERSION).toBe("2");
    expect(marker()).toBe(SEED_VERSION);
  });
});

describe("con la marca puesta, lo que admin cambia o borra no reaparece", () => {
  it("(a) cambiar el email de admin@vibecoffee.local: seed() no lo vuelve a crear", () => {
    const admin = adminActor();
    updateUser(admin, admin.id, { email: "jefa@vibecoffee.local" });
    const users = count("users");
    seed(db());
    seed(db());
    expect(n(db(), "SELECT COUNT(*) AS n FROM users WHERE email = 'admin@vibecoffee.local'")).toBe(0);
    expect(count("users")).toBe(users);
  });

  it("(b) cambiar el email de sofia@gmail.com: seed() no la vuelve a crear ni agrega pedidos", () => {
    updateUser(adminActor(), userId("sofia@gmail.com"), { email: "sofi.m@gmail.com" });
    const before = Object.fromEntries(TABLES.map((t) => [t, count(t)]));
    seed(db());
    expect(n(db(), "SELECT COUNT(*) AS n FROM users WHERE email = 'sofia@gmail.com'")).toBe(0);
    expect(Object.fromEntries(TABLES.map((t) => [t, count(t)]))).toEqual(before);
  });

  it("(c) borrar una categoría sembrada (tras vaciarla): seed() no la vuelve a crear", () => {
    const admin = adminActor();
    const cafes = (db().prepare("SELECT id FROM categories WHERE slug = 'cafes'").get() as { id: number }).id;
    const frios = (db().prepare("SELECT id FROM categories WHERE slug = 'cafes-frios'").get() as { id: number }).id;
    const prods = db().prepare("SELECT id FROM products WHERE category_id = ?").all(frios) as { id: number }[];
    expect(prods.length).toBeGreaterThan(0);
    for (const p of prods) updateProduct(admin, p.id, { categoryId: cafes });
    deleteCategory(admin, frios);
    const products = snapshot("products");
    seed(db());
    seed(db());
    expect(n(db(), "SELECT COUNT(*) AS n FROM categories WHERE slug = 'cafes-frios'")).toBe(0);
    expect(snapshot("products")).toEqual(products); // los productos movidos siguen donde los dejó admin
  });

  it("con la marca, seed() no toca nada aunque falten filas sembradas", () => {
    db().prepare("DELETE FROM users WHERE email = 'valentina.lopez@gmail.com'").run();
    db().prepare("DELETE FROM products WHERE slug = 'te-negro'").run();
    seed(db());
    expect(n(db(), "SELECT COUNT(*) AS n FROM users WHERE email = 'valentina.lopez@gmail.com'")).toBe(0);
    expect(n(db(), "SELECT COUNT(*) AS n FROM products WHERE slug = 'te-negro'")).toBe(0);
  });
});

describe("(d) base sin marca (de la tarea 1): seed() completa lo que falta sin pisar y deja la marca", () => {
  it("sobre la base actual sin la fila meta: repone usuarios/categorías/productos borrados, conserva ediciones", () => {
    db().prepare("DELETE FROM meta WHERE key = 'seed_version'").run();
    // borrar filas sembradas sin pedidos
    db().prepare("DELETE FROM users WHERE email = 'valentina.lopez@gmail.com'").run();
    db().prepare("DELETE FROM products WHERE slug IN ('te-negro', 'latte-helado', 'carrot-cake')").run();
    // ediciones que no deben pisarse
    db().prepare("UPDATE products SET price = 9999, name = 'Latte editado', available = 0 WHERE slug = 'latte'").run();
    db().prepare("UPDATE products SET available = 1 WHERE slug = 'agua'").run();
    db().prepare("UPDATE users SET name = 'Sofi', active = 0 WHERE email = 'sofia@gmail.com'").run();
    db().prepare("UPDATE categories SET name = 'Cafecitos' WHERE slug = 'cafes'").run();
    const kept = {
      latte: db().prepare("SELECT * FROM products WHERE slug = 'latte'").get(),
      agua: db().prepare("SELECT * FROM products WHERE slug = 'agua'").get(),
      sofia: db().prepare("SELECT * FROM users WHERE email = 'sofia@gmail.com'").get(),
      cocina: db().prepare("SELECT * FROM users WHERE email = 'cocina@vibecoffee.local'").get(),
      cafes: db().prepare("SELECT * FROM categories WHERE slug = 'cafes'").get(),
    };
    const orders = snapshot("orders");
    const items = snapshot("order_items");

    seed(db());

    expect(marker()).toBe(SEED_VERSION);
    expect(n(db(), "SELECT COUNT(*) AS n FROM users WHERE email = 'valentina.lopez@gmail.com' AND role = 'cliente'")).toBe(1);
    expect(n(db(), "SELECT COUNT(*) AS n FROM products WHERE slug IN ('te-negro', 'latte-helado', 'carrot-cake')")).toBe(3);
    expect(db().prepare("SELECT available FROM products WHERE slug = 'carrot-cake'").get()).toEqual({ available: 0 });
    expect(db().prepare("SELECT * FROM products WHERE slug = 'latte'").get()).toEqual(kept.latte);
    expect(db().prepare("SELECT * FROM products WHERE slug = 'agua'").get()).toEqual(kept.agua);
    expect(db().prepare("SELECT * FROM users WHERE email = 'sofia@gmail.com'").get()).toEqual(kept.sofia);
    expect(db().prepare("SELECT * FROM users WHERE email = 'cocina@vibecoffee.local'").get()).toEqual(kept.cocina);
    expect(db().prepare("SELECT * FROM categories WHERE slug = 'cafes'").get()).toEqual(kept.cafes);
    // los clientes ya tenían pedidos: no se agregan más
    expect(snapshot("orders")).toEqual(orders);
    expect(snapshot("order_items")).toEqual(items);
    expect(count("users")).toBe(SEED.users.length);
    expect(count("categories")).toBe(SEED.categories.length);
    expect(count("products")).toBe(SEED.products.length);

    // y después, con la marca, ya no repone nada
    db().prepare("DELETE FROM users WHERE email = 'valentina.lopez@gmail.com'").run();
    seed(db());
    expect(n(db(), "SELECT COUNT(*) AS n FROM users WHERE email = 'valentina.lopez@gmail.com'")).toBe(0);
  });

  it("sobre una base armada como la de la tarea 1 (sin tabla meta poblada)", () => {
    const old = new Database(":memory:");
    old.pragma("foreign_keys = ON");
    old.exec(SCHEMA);
    const hash = hashPassword(STAFF_DEMO_PASSWORD);
    const insU = old.prepare("INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)");
    insU.run("sofia@gmail.com", "Sofía Editada", "cliente", null);
    insU.run("cocina@vibecoffee.local", "Cocina Vibe", "cocina", hash);
    insU.run("admin@vibecoffee.local", "Admin Vibe", "admin", hash);
    const insC = old.prepare("INSERT INTO categories (slug, name, sort) VALUES (?, ?, ?)");
    insC.run("cafes", "Cafés", 1);
    insC.run("frias", "Tés y jugos", 2);
    insC.run("pasteleria", "Pastelería", 3);
    const cat = (slug: string) => (old.prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as { id: number }).id;
    const insP = old.prepare("INSERT INTO products (slug, category_id, name, description, price, icon, sort) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insP.run("latte", cat("cafes"), "Latte", "", 9999, "latte", 3);
    insP.run("tostado", cat("pasteleria"), "Tostado", "Jamón y queso", 4200, "tostado", 2);
    // un pedido real de Sofía de la tarea 1
    const sofiaId = (old.prepare("SELECT id FROM users WHERE email = 'sofia@gmail.com'").get() as { id: number }).id;
    const oid = Number(old.prepare("INSERT INTO orders (user_id, status, total) VALUES (?, 'entregado', 9999)").run(sofiaId).lastInsertRowid);
    old.prepare("INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, icon) VALUES (?, ?, 'Latte', 9999, 1, 'latte')").run(
      oid,
      (old.prepare("SELECT id FROM products WHERE slug = 'latte'").get() as { id: number }).id,
    );
    expect(marker(old)).toBeUndefined();

    seed(old);

    expect(marker(old)).toBe(SEED_VERSION);
    for (const u of SEED.users) expect(n(old, "SELECT COUNT(*) AS n FROM users WHERE email = ?", u.email), u.email).toBe(1);
    for (const c of SEED.categories) expect(n(old, "SELECT COUNT(*) AS n FROM categories WHERE slug = ?", c.slug), c.slug).toBe(1);
    for (const p of SEED.products) expect(n(old, "SELECT COUNT(*) AS n FROM products WHERE slug = ?", p.slug), p.slug).toBe(1);
    expect(old.prepare("SELECT price FROM products WHERE slug = 'latte'").get()).toEqual({ price: 9999 });
    expect(old.prepare("SELECT category_id FROM products WHERE slug = 'tostado'").get()).toEqual({ category_id: cat("pasteleria") });
    expect(old.prepare("SELECT name FROM users WHERE email = 'sofia@gmail.com'").get()).toEqual({ name: "Sofía Editada" });
    expect(old.prepare("SELECT password_hash FROM users WHERE email = 'cocina@vibecoffee.local'").get()).toEqual({ password_hash: hash });
    // Sofía ya tenía un pedido: no recibe los de ejemplo; los demás clientes con pedidos en SEED.orders sí
    expect(ordersOf("sofia@gmail.com", old)).toBe(1);
    for (const email of new Set(SEED.orders.map((o) => o.customer))) {
      if (email === "sofia@gmail.com") continue;
      expect(ordersOf(email, old), email).toBe(SEED.orders.filter((o) => o.customer === email).length);
    }
    expect(ordersOf("valentina.lopez@gmail.com", old)).toBe(0);
    // idempotente
    const before = TABLES.map((t) => count(t, old));
    seed(old);
    expect(TABLES.map((t) => count(t, old))).toEqual(before);
    old.close();
  });
});

describe("(e) los pedidos de ejemplo solo van a usuarios con rol cliente", () => {
  it("un cliente sembrado pasado a cocina (sin pedidos, sin marca) no recibe pedidos; uno que sigue cliente sí", () => {
    const martin = "martin.gomez@gmail.com";
    const lucia = "lucia.fernandez@gmail.com";
    expect(SEED.orders.some((o) => o.customer === martin)).toBe(true);
    expect(SEED.orders.some((o) => o.customer === lucia)).toBe(true);
    db().prepare("DELETE FROM orders WHERE user_id IN (?, ?)").run(userId(martin), userId(lucia));
    db().prepare("UPDATE users SET role = 'cocina', password_hash = ? WHERE email = ?").run(hashPassword(STAFF_DEMO_PASSWORD), martin);
    db().prepare("DELETE FROM meta WHERE key = 'seed_version'").run();
    seed(db());
    expect(ordersOf(martin)).toBe(0);
    expect(n(db(), "SELECT COUNT(*) AS n FROM orders o JOIN users u ON u.id = o.user_id WHERE u.role <> 'cliente'")).toBe(0);
    expect(ordersOf(lucia)).toBe(SEED.orders.filter((o) => o.customer === lucia).length);
    expect(n(db(), "SELECT COUNT(*) AS n FROM order_items WHERE order_id NOT IN (SELECT id FROM orders)")).toBe(0);
  });
});
