// Tarea 2 — reglas que salieron de la revisión de código: actor admin viejo, siempre un admin activo,
// nombres invisibles o con caracteres de control, y la semilla de pedidos de demo para clientes sin «de siempre».
import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/contracts";
import { seed } from "@/lib/db";
import { createUser, deactivateUser, listUsers, updateUser } from "@/lib/services/users";
import { createCategory, createProduct, updateCategory, updateProduct } from "@/lib/services/admin-catalog";
import { cancelOrder, createOrder, getLastOrder } from "@/lib/services/orders";
import {
  ADMIN_EMAIL,
  CUSTOMER_EMAIL,
  CUSTOMER_WITHOUT_HISTORY,
  adminActor,
  count,
  customerActor,
  db,
  expectCode,
  productId,
  staffActor,
  useFreshDb,
  userId,
} from "./helpers";

useFreshDb();

const activeAdmins = () => count("users", "role = 'admin' AND active = 1");

/** Segundo admin creado por el admin de la semilla; devuelve los actores de ambos (resueltos ahora). */
function twoAdmins(): { a1: SessionUser; a2: SessionUser } {
  const a1 = adminActor();
  createUser(a1, { email: "admin2@vibecoffee.local", name: "Admin Dos", role: "admin" });
  return { a1, a2: staffActor("admin2@vibecoffee.local") };
}

describe("users: actor admin viejo (resuelto antes del cambio)", () => {
  it("admin degradado a cocina: su actor viejo da FORBIDDEN en createUser, updateUser y deactivateUser", () => {
    const { a1, a2 } = twoAdmins();
    updateUser(a1, a2.id, { role: "cocina" });
    const before = db().prepare("SELECT id, email, name, role, active FROM users ORDER BY id").all();
    expectCode(() => createUser(a2, { email: "colado@gmail.com", name: "Colado", role: "admin" }), "FORBIDDEN");
    expectCode(() => updateUser(a2, a2.id, { role: "admin" }), "FORBIDDEN");
    expectCode(() => updateUser(a2, a1.id, { role: "cliente" }), "FORBIDDEN");
    expectCode(() => deactivateUser(a2, a1.id), "FORBIDDEN");
    expect(db().prepare("SELECT id, email, name, role, active FROM users ORDER BY id").all()).toEqual(before);
  });

  it("admin dado de baja: su actor viejo da FORBIDDEN en createUser, updateUser y deactivateUser", () => {
    const { a1, a2 } = twoAdmins();
    deactivateUser(a1, a2.id);
    const before = db().prepare("SELECT id, email, name, role, active FROM users ORDER BY id").all();
    expectCode(() => createUser(a2, { email: "colado@gmail.com", name: "Colado", role: "admin" }), "FORBIDDEN");
    expectCode(() => updateUser(a2, a2.id, { active: true }), "FORBIDDEN");
    expectCode(() => updateUser(a2, userId(CUSTOMER_EMAIL), { name: "X" }), "FORBIDDEN");
    expectCode(() => deactivateUser(a2, a1.id), "FORBIDDEN");
    expect(db().prepare("SELECT id, email, name, role, active FROM users ORDER BY id").all()).toEqual(before);
  });

  it("nunca quedan 0 admins activos: dos admins que se bajan mutuamente con actores viejos", () => {
    const { a1, a2 } = twoAdmins();
    expect(activeAdmins()).toBe(2);
    deactivateUser(a1, a2.id);
    expect(() => deactivateUser(a2, a1.id)).toThrow();
    expect(() => updateUser(a2, a1.id, { role: "cliente" })).toThrow();
    expect(() => updateUser(a2, a1.id, { active: false })).toThrow();
    expect(activeAdmins()).toBe(1);
    expect(listUsers(a1).find((u) => u.id === a1.id)).toMatchObject({ role: "admin", active: true });
  });

  it("nunca quedan 0 admins activos: degradar al otro y que el otro degrade con su actor viejo", () => {
    const { a1, a2 } = twoAdmins();
    updateUser(a2, a1.id, { role: "cocina" });
    expect(() => updateUser(a1, a2.id, { role: "cocina" })).toThrow();
    expect(() => deactivateUser(a1, a2.id)).toThrow();
    expect(activeAdmins()).toBe(1);
  });

  it("con un solo admin no hay forma de dejarlo sin admins", () => {
    const a1 = adminActor();
    expect(() => updateUser(a1, a1.id, { role: "cocina" })).toThrow();
    expect(() => updateUser(a1, a1.id, { active: false })).toThrow();
    expect(() => deactivateUser(a1, a1.id)).toThrow();
    expect(activeAdmins()).toBe(1);
  });
});

describe("users: nombres", () => {
  it("nombre solo con U+200B (o mezclado con espacios) → VALIDATION en alta y edición", () => {
    const admin = adminActor();
    for (const name of ["\u200B", "\u200B\u200B\u200B", " \u200B ", "\u200B \u200B"]) {
      expectCode(() => createUser(admin, { email: "nuevo@gmail.com", name, role: "cliente" }), "VALIDATION");
      expectCode(() => updateUser(admin, userId(CUSTOMER_EMAIL), { name }), "VALIDATION");
    }
    expect(count("users", "email = 'nuevo@gmail.com'")).toBe(0);
  });

  it("« Ana » se guarda «Ana» (alta y edición)", () => {
    const admin = adminActor();
    const u = createUser(admin, { email: "ana@gmail.com", name: " Ana ", role: "cliente" });
    expect(u.name).toBe("Ana");
    expect(db().prepare("SELECT name FROM users WHERE id = ?").get(u.id)).toEqual({ name: "Ana" });
    expect(updateUser(admin, userId(CUSTOMER_EMAIL), { name: "  Ana  " }).name).toBe("Ana");
    expect(updateUser(admin, userId(ADMIN_EMAIL), { name: " Ana " }).name).toBe("Ana");
  });
});

describe("admin-catalog: nombres con control o invisibles → VALIDATION", () => {
  const BAD_NAMES = ["Café\ncon leche", "Café\r\ncon leche", "Tab\there", "Be\u0007ll", "Nu\u0000l", "De\u007Fl", "\u200B", "\u200B \u200B"];

  it("categorías: alta y edición", () => {
    const admin = adminActor();
    const before = db().prepare("SELECT * FROM categories ORDER BY id").all();
    const cafes = (db().prepare("SELECT id FROM categories WHERE slug = 'cafes'").get() as { id: number }).id;
    for (const name of BAD_NAMES) {
      expectCode(() => createCategory(admin, { name }), "VALIDATION");
      expectCode(() => updateCategory(admin, cafes, { name }), "VALIDATION");
    }
    expect(db().prepare("SELECT * FROM categories ORDER BY id").all()).toEqual(before);
  });

  it("productos: alta y edición", () => {
    const admin = adminActor();
    const before = db().prepare("SELECT * FROM products ORDER BY id").all();
    const cafes = (db().prepare("SELECT id FROM categories WHERE slug = 'cafes'").get() as { id: number }).id;
    const latte = productId("latte");
    for (const name of BAD_NAMES) {
      expectCode(() => createProduct(admin, { categoryId: cafes, name, price: 1000, icon: "latte" }), "VALIDATION");
      expectCode(() => updateProduct(admin, latte, { name }), "VALIDATION");
    }
    expect(db().prepare("SELECT * FROM products ORDER BY id").all()).toEqual(before);
  });

  it("saltos de línea o espacios solo al principio o al final se recortan: se guarda «Café»", () => {
    const admin = adminActor();
    const cafes = (db().prepare("SELECT id FROM categories WHERE slug = 'cafes'").get() as { id: number }).id;
    const c = createCategory(admin, { name: "Café\r\n" });
    expect(c.name).toBe("Café");
    expect(updateCategory(admin, c.id, { name: "\n Café \t" }).name).toBe("Café");
    const p = createProduct(admin, { categoryId: cafes, name: "Café\r\n", price: 1000, icon: "latte" });
    expect(p.name).toBe("Café");
    expect(updateProduct(admin, p.id, { name: "\r\nCafé\n" }).name).toBe("Café");
    expect(db().prepare("SELECT name FROM products WHERE id = ?").get(p.id)).toEqual({ name: "Café" });
  });

  it("nombres normales con acentos y signos siguen funcionando", () => {
    const admin = adminActor();
    const cafes = (db().prepare("SELECT id FROM categories WHERE slug = 'cafes'").get() as { id: number }).id;
    expect(createCategory(admin, { name: "Tés & infusiones (¡nuevo!)" }).name).toBe("Tés & infusiones (¡nuevo!)");
    expect(createProduct(admin, { categoryId: cafes, name: "Café «doble»", price: 1000, icon: "latte" }).name).toBe("Café «doble»");
  });
});

describe("semilla: pedidos de demo para clientes sin pedido pagado/listo/entregado", () => {
  const TABLES = ["users", "categories", "products", "orders", "order_items"];
  const counts = () => Object.fromEntries(TABLES.map((t) => [t, count(t)]));

  function wipeOrders(uid: number) {
    db().prepare("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)").run(uid);
    db().prepare("DELETE FROM orders WHERE user_id = ?").run(uid);
  }

  it("cliente de demo con solo pendiente_pago y cancelado recibe sus pedidos de demo; sigue idempotente", () => {
    const lucasId = userId("lucas@gmail.com");
    wipeOrders(lucasId);
    const lucas = customerActor("lucas@gmail.com");
    const pend = createOrder(lucas, { items: [{ productId: productId("latte"), quantity: 1 }] });
    cancelOrder(lucas, createOrder(lucas, { items: [{ productId: productId("medialuna"), quantity: 1 }] }).id);
    expect(getLastOrder(lucas)).toBeNull();

    seed(db());
    const last = getLastOrder(lucas);
    expect(last).not.toBeNull();
    expect(last!.userId).toBe(lucasId);
    expect(["pagado", "listo", "entregado"]).toContain(last!.status);
    // los suyos siguen
    expect(count("orders", "id = ? AND status = 'pendiente_pago'", pend.id)).toBe(1);
    expect(count("orders", "user_id = ? AND status = 'cancelado'", lucasId)).toBe(1);

    const after = counts();
    seed(db());
    seed(db());
    expect(counts()).toEqual(after);
    expect(getLastOrder(lucas)!.id).toBe(last!.id);
  });

  it("cliente de demo sin ningún pedido (borrados) vuelve a recibir los suyos; los demás no se duplican", () => {
    const valId = userId("valentina@gmail.com");
    const othersBefore = count("orders", "user_id <> ?", valId);
    const valBefore = count("orders", "user_id = ?", valId);
    wipeOrders(valId);
    seed(db());
    expect(count("orders", "user_id = ?", valId)).toBe(valBefore);
    expect(count("orders", "user_id <> ?", valId)).toBe(othersBefore);
    expect(getLastOrder(customerActor("valentina@gmail.com"))).not.toBeNull();
  });

  it("un cliente con un pedido pagado propio (no de demo) no recibe pedidos de demo; camila sigue sin pedidos de demo", () => {
    const martinId = userId("martin@gmail.com");
    wipeOrders(martinId);
    db()
      .prepare("INSERT INTO orders (user_id, status, total, created_at, paid_at) VALUES (?, 'pagado', 100, strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))")
      .run(martinId);
    seed(db());
    expect(count("orders", "user_id = ?", martinId)).toBe(1);
    expect(count("orders", "user_id = ?", userId(CUSTOMER_WITHOUT_HISTORY))).toBe(0);
  });
});
