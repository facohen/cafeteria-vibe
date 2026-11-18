import { describe, expect, it } from "vitest";
import { SEED, seed } from "@/lib/db";
import { ICON_KEYS } from "@/lib/contracts";
import { getCatalog } from "@/lib/services/catalog";
import { createOrder, getLastOrder, listKitchenOrders } from "@/lib/services/orders";
import { CUSTOMER_EMAIL, customerActor, db, kitchenActor, sampleInput, useFreshDb } from "./helpers";

useFreshDb();

const count = (table: string) => (db().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("semilla idempotente", () => {
  it("openDb carga la semilla", () => {
    expect(count("users")).toBe(SEED.users.length);
    expect(count("categories")).toBe(SEED.categories.length);
    expect(count("products")).toBe(SEED.products.length);
  });

  it("correr seed dos veces no duplica usuarios, categorías ni productos", () => {
    seed(db());
    seed(db());
    expect(count("users")).toBe(SEED.users.length);
    expect(count("categories")).toBe(SEED.categories.length);
    expect(count("products")).toBe(SEED.products.length);
  });

  it("no pisa un precio editado ni la contraseña existente", () => {
    db().prepare("UPDATE products SET price = 9999 WHERE slug = 'latte'").run();
    const hashBefore = (db().prepare("SELECT password_hash FROM users WHERE email = 'cocina@vibecoffee.local'").get() as {
      password_hash: string;
    }).password_hash;
    seed(db());
    seed(db());
    expect((db().prepare("SELECT price FROM products WHERE slug = 'latte'").get() as { price: number }).price).toBe(9999);
    expect(
      (db().prepare("SELECT password_hash FROM users WHERE email = 'cocina@vibecoffee.local'").get() as { password_hash: string })
        .password_hash,
    ).toBe(hashBefore);
  });

  it("clientes sin contraseña; personal con hash", () => {
    const rows = db().prepare("SELECT role, password_hash FROM users").all() as { role: string; password_hash: string | null }[];
    for (const r of rows) {
      if (r.role === "cliente") expect(r.password_hash).toBeNull();
      else expect(r.password_hash).toEqual(expect.any(String));
    }
  });
});

// ---- Tarea 2: semilla completa (CA-22) ----

const TABLES = ["users", "categories", "products", "orders", "order_items"] as const;
const counts = () => Object.fromEntries(TABLES.map((t) => [t, count(t)]));
const snapshot = (table: string) => db().prepare(`SELECT * FROM ${table} ORDER BY id`).all();

describe("semilla completa (tarea 2)", () => {
  it("trae catálogo completo, varios clientes y pedidos anteriores", () => {
    expect(count("categories")).toBeGreaterThan(3);
    expect(count("products")).toBeGreaterThan(8);
    const clientes = (db().prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'cliente'").get() as { n: number }).n;
    expect(clientes).toBeGreaterThanOrEqual(2);
    expect(count("orders")).toBeGreaterThan(0);
    expect(count("order_items")).toBeGreaterThan(0);
    // todo ícono sembrado es válido y toda categoría sembrada tiene productos
    const icons = db().prepare("SELECT DISTINCT icon FROM products").all() as { icon: string }[];
    for (const { icon } of icons) expect(ICON_KEYS as readonly string[]).toContain(icon);
    const emptyCats = db().prepare("SELECT slug FROM categories c WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.category_id = c.id)").all();
    expect(emptyCats).toEqual([]);
  });

  it("correr seed dos veces no cambia ningún conteo ni dato", () => {
    const before = counts();
    const rows = Object.fromEntries(TABLES.map((t) => [t, snapshot(t)]));
    seed(db());
    seed(db());
    expect(counts()).toEqual(before);
    // incluye users.password_hash: la semilla no re-hashea contraseñas existentes
    for (const t of TABLES) expect(snapshot(t), t).toEqual(rows[t]);
  });

  it("los pedidos sembrados están entregados (nada en cocina) y sus totales cuadran", () => {
    const statuses = db().prepare("SELECT DISTINCT status FROM orders").all() as { status: string }[];
    expect(statuses).toEqual([{ status: "entregado" }]);
    expect(listKitchenOrders(kitchenActor())).toEqual([]);
    const bad = db()
      .prepare(
        `SELECT o.id FROM orders o WHERE o.total <> (SELECT COALESCE(SUM(unit_price * quantity), 0) FROM order_items i WHERE i.order_id = o.id)
         OR NOT EXISTS (SELECT 1 FROM order_items i WHERE i.order_id = o.id)`,
      )
      .all();
    expect(bad).toEqual([]);
    // solo clientes tienen pedidos
    const nonClient = db().prepare("SELECT o.id FROM orders o JOIN users u ON u.id = o.user_id WHERE u.role <> 'cliente'").all();
    expect(nonClient).toEqual([]);
    // fechas consistentes
    const noDates = db().prepare("SELECT id FROM orders WHERE paid_at IS NULL OR ready_at IS NULL OR finished_at IS NULL").all();
    expect(noDates).toEqual([]);
  });

  it("Sofía tiene pedido anterior («Pedí lo de siempre») y hay al menos un cliente sin pedidos", () => {
    const sofia = customerActor(CUSTOMER_EMAIL);
    const last = getLastOrder(sofia);
    expect(last).not.toBeNull();
    expect(last!.userId).toBe(sofia.id);
    expect(last!.status).toBe("entregado");
    const withoutOrders = db()
      .prepare("SELECT email FROM users u WHERE role = 'cliente' AND active = 1 AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)")
      .all() as { email: string }[];
    expect(withoutOrders.length).toBeGreaterThanOrEqual(1);
    expect(getLastOrder(customerActor(withoutOrders[0].email))).toBeNull();
  });

  it("no agrega pedidos sembrados de nuevo aunque el cliente haya pedido algo nuevo", () => {
    const sofia = customerActor(CUSTOMER_EMAIL);
    createOrder(sofia, sampleInput());
    const before = counts();
    seed(db());
    expect(counts()).toEqual(before);
  });

  it("no pisa precio, nombre ni disponibilidad editados, ni categorías editadas", () => {
    db().prepare("UPDATE products SET price = 7777, name = 'Latte editado', available = 0 WHERE slug = 'latte'").run();
    db().prepare("UPDATE products SET available = 1 WHERE slug = 'tostado'").run();
    db().prepare("UPDATE categories SET name = 'Cafecitos', sort = 99 WHERE slug = 'cafes'").run();
    const products = snapshot("products");
    const categories = snapshot("categories");
    seed(db());
    expect(snapshot("products")).toEqual(products);
    expect(snapshot("categories")).toEqual(categories);
    const latte = getCatalog(customerActor()).products.find((p) => p.slug === "latte")!;
    expect(latte).toMatchObject({ price: 7777, name: "Latte editado", available: false });
  });

  it("no pisa usuarios editados ni reactiva a los dados de baja", () => {
    db().prepare("UPDATE users SET name = 'Sofi Editada' WHERE email = ?").run(CUSTOMER_EMAIL);
    db().prepare("UPDATE users SET active = 0 WHERE email = 'cocina@vibecoffee.local'").run();
    const others = db().prepare("SELECT email FROM users WHERE role = 'cliente' AND email <> ?").all(CUSTOMER_EMAIL) as { email: string }[];
    if (others[0]) db().prepare("UPDATE users SET role = 'cocina', active = 0 WHERE email = ?").run(others[0].email);
    const users = snapshot("users");
    seed(db());
    seed(db());
    expect(snapshot("users")).toEqual(users);
  });
});
