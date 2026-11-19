// Tarea 2 — «Pedí lo de siempre» (CA-18, CA-19, CA-20). Contrato: getLastOrder en lib/services/orders.ts.
import { describe, expect, it } from "vitest";
import type { Order, SessionUser } from "@/lib/contracts";
import {
  cancelOrder,
  createOrder,
  finishOrder,
  getLastOrder,
  markReady,
  payOrder,
} from "@/lib/services/orders";
import { getCatalog } from "@/lib/services/catalog";
import {
  CUSTOMERS_WITH_HISTORY,
  CUSTOMER_WITHOUT_HISTORY,
  adminActor,
  createCustomer,
  customerActor,
  db,
  expectCode,
  kitchenActor,
  productId,
  useFreshDb,
} from "./helpers";

useFreshDb();

const ELIGIBLE = ["pagado", "listo", "entregado"];

/** Pedidos elegibles del usuario según la base, más reciente primero. */
function eligibleFromDb(uid: number) {
  return db()
    .prepare(
      `SELECT id, created_at FROM orders WHERE user_id = ? AND status IN ('pagado','listo','entregado')
       ORDER BY created_at DESC, id DESC`,
    )
    .all(uid) as { id: number; created_at: string }[];
}

function one(actor: SessionUser, slug = "latte", quantity = 1): Order {
  return createOrder(actor, { items: [{ productId: productId(slug), quantity }] });
}

function repeat(actor: SessionUser, last: Order): Order {
  return createOrder(actor, { items: last.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) });
}

describe("permisos", () => {
  it("sin sesión → UNAUTHENTICATED; cocina y admin → FORBIDDEN", () => {
    expectCode(() => getLastOrder(null), "UNAUTHENTICATED");
    expectCode(() => getLastOrder(kitchenActor()), "FORBIDDEN");
    expectCode(() => getLastOrder(adminActor()), "FORBIDDEN");
  });
});

describe("pedidos de la semilla", () => {
  it("los 4 clientes con historial tienen un último pedido propio y elegible, el más reciente", () => {
    for (const email of CUSTOMERS_WITH_HISTORY) {
      const actor = customerActor(email);
      const last = getLastOrder(actor);
      expect(last, `${email} debería tener «lo de siempre»`).not.toBeNull();
      expect(last!.userId).toBe(actor.id);
      expect(ELIGIBLE).toContain(last!.status);
      expect(last!.items.length).toBeGreaterThan(0);
      const fromDb = eligibleFromDb(actor.id);
      expect(fromDb.map((r) => r.id)).toContain(last!.id);
      for (const r of fromDb) expect(last!.createdAt >= r.created_at).toBe(true);
      expect(last!.total).toBe(last!.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
    }
  });

  it("los últimos pedidos de clientes distintos son distintos", () => {
    const ids = CUSTOMERS_WITH_HISTORY.map((e) => getLastOrder(customerActor(e))!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("camila (sin pedidos) → null", () => {
    expect(getLastOrder(customerActor(CUSTOMER_WITHOUT_HISTORY))).toBeNull();
  });
});

describe("solo pedidos propios y elegibles", () => {
  it("nunca devuelve un pedido de otro cliente, aunque sea el más reciente de todos", () => {
    const sofia = customerActor("sofia@gmail.com");
    const lucas = customerActor("lucas@gmail.com");
    const camila = customerActor(CUSTOMER_WITHOUT_HISTORY);
    const sofiaBefore = getLastOrder(sofia)!.id;
    const deLucas = payOrder(lucas, one(lucas, "cappuccino", 3).id);
    markReady(kitchenActor(), deLucas.id);
    expect(getLastOrder(sofia)!.id).toBe(sofiaBefore);
    expect(getLastOrder(camila)).toBeNull();
    expect(getLastOrder(lucas)!.id).toBe(deLucas.id);
  });

  it("cliente nuevo: null; con pedidos solo pendiente_pago o cancelado sigue null", () => {
    createCustomer("nueva@gmail.com", "Nueva");
    const nueva = customerActor("nueva@gmail.com");
    expect(getLastOrder(nueva)).toBeNull();
    one(nueva); // queda pendiente_pago
    cancelOrder(nueva, one(nueva, "espresso").id);
    expect(getLastOrder(nueva)).toBeNull();
  });

  it("ignora pendiente_pago y cancelado más recientes; toma pagado, listo y entregado", () => {
    const camila = customerActor(CUSTOMER_WITHOUT_HISTORY);
    const kitchen = kitchenActor();
    const a = payOrder(camila, one(camila, "latte", 2).id);
    expect(getLastOrder(camila)).toMatchObject({ id: a.id, status: "pagado" });
    one(camila, "espresso"); // pendiente_pago más nuevo
    cancelOrder(camila, one(camila, "cortado").id); // cancelado más nuevo
    expect(getLastOrder(camila)!.id).toBe(a.id);
    markReady(kitchen, a.id);
    expect(getLastOrder(camila)).toMatchObject({ id: a.id, status: "listo" });
    finishOrder(camila, a.id);
    expect(getLastOrder(camila)).toMatchObject({ id: a.id, status: "entregado" });

    // evitar empate de created_at (mismo milisegundo) con el pedido siguiente
    db().prepare("UPDATE orders SET created_at = '2020-01-01T00:00:00.000Z' WHERE id = ?").run(a.id);
    const b = payOrder(camila, one(camila, "medialuna", 3).id);
    expect(getLastOrder(camila)!.id).toBe(b.id);
    expect(getLastOrder(camila)!.items).toEqual([expect.objectContaining({ productId: productId("medialuna"), quantity: 3 })]);
  });

  it("un pedido nuevo pagado de un cliente con historial pasa a ser su último", () => {
    const sofia = customerActor("sofia@gmail.com");
    const nuevo = payOrder(sofia, one(sofia, "tostado", 2).id);
    expect(getLastOrder(sofia)!.id).toBe(nuevo.id);
  });
});

describe("repetir «lo de siempre»", () => {
  it("createOrder con sus items crea un pedido pendiente_pago con los precios actuales", () => {
    const sofia = customerActor("sofia@gmail.com");
    const last = getLastOrder(sofia)!;
    const p = last.items[0].productId;
    const nuevoPrecio = last.items[0].unitPrice + 777;
    db().prepare("UPDATE products SET price = ? WHERE id = ?").run(nuevoPrecio, p);
    // si la semilla dejó algún producto del pedido no disponible, habilitarlo para esta prueba
    for (const i of last.items) db().prepare("UPDATE products SET available = 1 WHERE id = ?").run(i.productId);
    const prices = new Map(getCatalog(sofia).products.map((x) => [x.id, x.price]));
    const again = repeat(sofia, last);
    expect(again.status).toBe("pendiente_pago");
    expect(again.userId).toBe(sofia.id);
    expect(again.items.map((i) => [i.productId, i.quantity])).toEqual(last.items.map((i) => [i.productId, i.quantity]));
    for (const i of again.items) expect(i.unitPrice).toBe(prices.get(i.productId));
    expect(again.items.find((i) => i.productId === p)!.unitPrice).toBe(nuevoPrecio);
    expect(again.total).toBe(again.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
    // el pedido viejo conserva su copia
    expect(getLastOrder(sofia)!.id).toBe(last.id);
    expect(getLastOrder(sofia)!.items[0].unitPrice).toBe(last.items[0].unitPrice);
    // y va directo al pago
    expect(payOrder(sofia, again.id).status).toBe("pagado");
    expect(getLastOrder(sofia)!.id).toBe(again.id);
  });

  it("si un producto del pedido ya no está disponible, repetirlo falla con VALIDATION y no crea nada", () => {
    for (const email of CUSTOMERS_WITH_HISTORY) {
      const actor = customerActor(email);
      const last = getLastOrder(actor)!;
      const pid = last.items[last.items.length - 1].productId;
      const before = (db().prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?").get(actor.id) as { n: number }).n;
      db().prepare("UPDATE products SET available = 0 WHERE id = ?").run(pid);
      expectCode(() => repeat(actor, last), "VALIDATION");
      expect((db().prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?").get(actor.id) as { n: number }).n).toBe(before);
      db().prepare("UPDATE products SET available = 1 WHERE id = ?").run(pid);
    }
  });
});
