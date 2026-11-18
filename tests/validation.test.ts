import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/contracts";
import { createOrder } from "@/lib/services/orders";
import { customerActor, db, expectCode, productId, useFreshDb } from "./helpers";

useFreshDb();

const orderCount = () => (db().prepare("SELECT COUNT(*) AS n FROM orders").get() as { n: number }).n;

function expectInvalid(input: unknown) {
  const cliente = customerActor();
  const before = orderCount();
  expectCode(() => createOrder(cliente, input as never), "VALIDATION");
  expect(orderCount()).toBe(before);
}

describe("createOrder: estructura de items → VALIDATION", () => {
  it("items vacío", () => expectInvalid({ items: [] }));
  it("items no es array", () => {
    expectInvalid({ items: "latte" });
    expectInvalid({ items: { productId: 1, quantity: 1 } });
    expectInvalid({});
  });
  it("más de 30 líneas", () => {
    const ids = [
      "espresso", "cortado", "latte", "cappuccino", "te-verde", "jugo-naranja", "medialuna", "tostado",
    ].map(productId);
    // 31 líneas con cantidad 1; ningún producto repetido suma > 20
    const items = Array.from({ length: LIMITS.maxLines + 1 }, (_, i) => ({ productId: ids[i % ids.length], quantity: 1 }));
    expectInvalid({ items });
  });
  it("exactamente 30 líneas es válido", () => {
    const ids = ["espresso", "cortado", "latte", "cappuccino", "te-verde", "jugo-naranja", "medialuna", "tostado"].map(productId);
    const items = Array.from({ length: LIMITS.maxLines }, (_, i) => ({ productId: ids[i % ids.length], quantity: 1 }));
    const o = createOrder(customerActor(), { items });
    expect(o.status).toBe("pendiente_pago");
  });
});

describe("createOrder: productId → VALIDATION", () => {
  it("inexistente", () => expectInvalid({ items: [{ productId: 99999, quantity: 1 }] }));
  it("no entero", () => expectInvalid({ items: [{ productId: 1.5, quantity: 1 }] }));
  it("string", () => expectInvalid({ items: [{ productId: String(productId("latte")), quantity: 1 }] }));
  it("ausente o null", () => {
    expectInvalid({ items: [{ quantity: 1 }] });
    expectInvalid({ items: [{ productId: null, quantity: 1 }] });
  });
  it("producto no disponible", () => {
    db().prepare("UPDATE products SET available = 0 WHERE slug = 'latte'").run();
    expectInvalid({ items: [{ productId: productId("latte"), quantity: 1 }] });
  });
  it("una línea mala invalida todo el pedido", () =>
    expectInvalid({
      items: [
        { productId: productId("medialuna"), quantity: 1 },
        { productId: 99999, quantity: 1 },
      ],
    }));
});

describe("createOrder: quantity → VALIDATION", () => {
  for (const q of [0, -1, 21, 1.5, "2", null, undefined]) {
    it(`quantity ${JSON.stringify(q) ?? "undefined"}`, () =>
      expectInvalid({ items: [{ productId: productId("latte"), quantity: q }] }));
  }
  it("límites 1 y 20 son válidos", () => {
    const cliente = customerActor();
    expect(createOrder(cliente, { items: [{ productId: productId("latte"), quantity: 1 }] }).total).toBe(3400);
    expect(createOrder(cliente, { items: [{ productId: productId("medialuna"), quantity: 20 }] }).total).toBe(24000);
  });
  it("mismo productId repetido sumando > 20", () =>
    expectInvalid({
      items: [
        { productId: productId("latte"), quantity: 15 },
        { productId: productId("latte"), quantity: 6 },
      ],
    }));
  it("mismo productId repetido sumando 20 es válido y el total suma ambas líneas", () => {
    const o = createOrder(customerActor(), {
      items: [
        { productId: productId("latte"), quantity: 15 },
        { productId: productId("latte"), quantity: 5 },
      ],
    });
    expect(o.total).toBe(20 * 3400);
    expect(o.items.reduce((s, i) => s + i.quantity, 0)).toBe(20);
  });
});

describe("createOrder: precios desde la base", () => {
  it("ignora price/total/unitPrice falsos del input", () => {
    const o = createOrder(customerActor(), {
      total: 1,
      items: [{ productId: productId("tostado"), quantity: 2, price: 1, unitPrice: 1 }],
    } as never);
    expect(o.total).toBe(2 * 4200);
    expect(o.items[0].unitPrice).toBe(4200);
  });
  it("usa el precio actual de la base", () => {
    db().prepare("UPDATE products SET price = 5000 WHERE slug = 'latte'").run();
    const o = createOrder(customerActor(), { items: [{ productId: productId("latte"), quantity: 1 }] });
    expect(o.total).toBe(5000);
  });
});
