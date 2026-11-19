// Tarea 2 — semilla completa (CA-22): datos de demo e idempotencia sin pisar cambios del admin.
import { describe, expect, it } from "vitest";
import { ICON_KEYS } from "@/lib/contracts";
import { seed } from "@/lib/db";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";
import { getLastOrder } from "@/lib/services/orders";
import { deactivateUser, updateUser } from "@/lib/services/users";
import { updateProduct } from "@/lib/services/admin-catalog";
import {
  ADMIN_EMAIL,
  CUSTOMERS_WITH_HISTORY,
  CUSTOMER_WITHOUT_HISTORY,
  KITCHEN_EMAIL,
  STAFF_DEMO_PASSWORD,
  adminActor,
  count,
  customerActor,
  db,
  expectCode,
  productId,
  useFreshDb,
  userId,
} from "./helpers";

useFreshDb();

const TASK1_SLUGS = ["espresso", "cortado", "latte", "cappuccino", "te-verde", "jugo-naranja", "medialuna", "tostado"];
const TABLES = ["users", "categories", "products", "orders", "order_items"] as const;

function counts() {
  return Object.fromEntries(TABLES.map((t) => [t, count(t)]));
}

describe("datos de demo", () => {
  it("5 clientes activos sin contraseña que entran al kiosco", () => {
    for (const email of [...CUSTOMERS_WITH_HISTORY, CUSTOMER_WITHOUT_HISTORY]) {
      const row = db().prepare("SELECT role, active, password_hash FROM users WHERE email = ?").get(email) as
        | { role: string; active: number; password_hash: string | null }
        | undefined;
      expect(row, `${email} debería existir`).toBeDefined();
      expect(row).toMatchObject({ role: "cliente", active: 1, password_hash: null });
      expect(getSessionUser(loginCustomer(email).token)?.email).toBe(email);
    }
  });

  it("cocina y admin entran con cafe1234", () => {
    expect(loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).user.role).toBe("cocina");
    expect(loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD).user.role).toBe("admin");
  });

  it("conserva los productos de la tarea 1 y tiene al menos uno no disponible", () => {
    for (const slug of TASK1_SLUGS) expect(productId(slug)).toEqual(expect.any(Number));
    expect(count("products", "available = 0")).toBeGreaterThanOrEqual(1);
  });

  it("productos válidos según el contrato (precio, ícono, categoría, largos)", () => {
    const rows = db()
      .prepare("SELECT p.slug, p.name, p.description, p.price, p.icon, c.id AS cat FROM products p LEFT JOIN categories c ON c.id = p.category_id")
      .all() as { slug: string; name: string; description: string; price: number; icon: string; cat: number | null }[];
    for (const r of rows) {
      expect(r.cat, `${r.slug} sin categoría`).not.toBeNull();
      expect(Number.isInteger(r.price) && r.price >= 1 && r.price <= 1_000_000, `${r.slug} precio ${r.price}`).toBe(true);
      expect(ICON_KEYS as readonly string[], `${r.slug} ícono ${r.icon}`).toContain(r.icon);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.name.length).toBeLessThanOrEqual(60);
      expect(r.description.length).toBeLessThanOrEqual(200);
    }
  });

  it("los 4 clientes con historial tienen pedidos entregado y «lo de siempre»; camila ninguno", () => {
    for (const email of CUSTOMERS_WITH_HISTORY) {
      expect(count("orders", "user_id = ? AND status = 'entregado'", userId(email)), email).toBeGreaterThanOrEqual(1);
      const last = getLastOrder(customerActor(email));
      expect(last, email).not.toBeNull();
      expect(last!.userId).toBe(userId(email));
    }
    expect(count("orders", "user_id = ?", userId(CUSTOMER_WITHOUT_HISTORY))).toBe(0);
    expect(getLastOrder(customerActor(CUSTOMER_WITHOUT_HISTORY))).toBeNull();
  });

  it("pedidos de la semilla coherentes: con ítems, total = suma, de clientes, ítems con producto existente", () => {
    const orders = db()
      .prepare("SELECT o.id, o.total, u.role FROM orders o JOIN users u ON u.id = o.user_id")
      .all() as { id: number; total: number; role: string }[];
    expect(orders.length).toBeGreaterThanOrEqual(CUSTOMERS_WITH_HISTORY.length);
    for (const o of orders) {
      expect(o.role).toBe("cliente");
      const items = db()
        .prepare("SELECT i.unit_price, i.quantity, p.id AS pid FROM order_items i LEFT JOIN products p ON p.id = i.product_id WHERE i.order_id = ?")
        .all(o.id) as { unit_price: number; quantity: number; pid: number | null }[];
      expect(items.length, `pedido ${o.id} sin ítems`).toBeGreaterThan(0);
      for (const i of items) expect(i.pid).not.toBeNull();
      expect(o.total, `total del pedido ${o.id}`).toBe(items.reduce((s, i) => s + i.unit_price * i.quantity, 0));
    }
  });
});

describe("semilla idempotente", () => {
  it("correr seed() varias veces no cambia los conteos de ninguna tabla", () => {
    const before = counts();
    seed(db());
    seed(db());
    seed(db());
    expect(counts()).toEqual(before);
  });

  it("no pisa un precio editado, una disponibilidad cambiada ni un nombre editado", () => {
    const admin = adminActor();
    const latte = productId("latte");
    updateProduct(admin, latte, { price: 9999, name: "Latte grande" });
    const off = db().prepare("SELECT id FROM products WHERE available = 0 LIMIT 1").get() as { id: number };
    updateProduct(admin, off.id, { available: true });
    updateProduct(admin, productId("espresso"), { available: false });
    updateUser(admin, userId("sofia@gmail.com"), { name: "Sofi" });
    const before = counts();
    seed(db());
    seed(db());
    expect(db().prepare("SELECT price, name FROM products WHERE id = ?").get(latte)).toEqual({ price: 9999, name: "Latte grande" });
    expect(db().prepare("SELECT available FROM products WHERE id = ?").get(off.id)).toEqual({ available: 1 });
    expect(db().prepare("SELECT available FROM products WHERE slug = 'espresso'").get()).toEqual({ available: 0 });
    expect(db().prepare("SELECT name FROM users WHERE email = 'sofia@gmail.com'").get()).toEqual({ name: "Sofi" });
    expect(counts()).toEqual(before);
  });

  it("no reactiva un usuario dado de baja (ni cliente ni personal)", () => {
    const admin = adminActor();
    deactivateUser(admin, userId("lucas@gmail.com"));
    deactivateUser(admin, userId(KITCHEN_EMAIL));
    seed(db());
    seed(db());
    expect(db().prepare("SELECT active FROM users WHERE email = 'lucas@gmail.com'").get()).toEqual({ active: 0 });
    expect(db().prepare("SELECT active FROM users WHERE email = ?").get(KITCHEN_EMAIL)).toEqual({ active: 0 });
    expectCode(() => loginCustomer("lucas@gmail.com"), "UNAUTHENTICATED");
    expectCode(() => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("seed() no agrega pedidos ni cambia el último pedido de un cliente", () => {
    const before = counts();
    const sofia = customerActor("sofia@gmail.com");
    const last = getLastOrder(sofia)!;
    seed(db());
    expect(counts()).toEqual(before);
    expect(getLastOrder(sofia)!.id).toBe(last.id);
  });
});
