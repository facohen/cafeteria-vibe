// Tarea 2 — «Pedí lo de siempre» (CA-18, CA-19, CA-20) contra el contrato de lib/contracts.ts.
import { describe, expect, it } from "vitest";
import {
  cancelOrder,
  createOrder,
  finishOrder,
  getLastOrder,
  markReady,
  payOrder,
} from "@/lib/services/orders";
import { updateProduct } from "@/lib/services/catalog-admin";
import { loginCustomer, loginStaff } from "@/lib/services/auth";
import {
  KITCHEN_EMAIL,
  STAFF_DEMO_PASSWORD,
  adminActor,
  createCustomer,
  customerActor,
  db,
  expectCode,
  kitchenActor,
  productId,
  sampleInput,
  useFreshDb,
} from "./helpers";
import { call, noParams, req } from "./http-helpers";

useFreshDb();

/** Cliente nuevo, sin pedidos (los de la semilla pueden tener pedidos anteriores). */
function freshCustomer(email = "nuevo@gmail.com", name = "Cliente Nuevo") {
  createCustomer(email, name);
  return customerActor(email);
}

describe("permisos", () => {
  it("sin sesión → UNAUTHENTICATED; cocina y admin → FORBIDDEN", () => {
    expectCode(() => getLastOrder(null), "UNAUTHENTICATED");
    expectCode(() => getLastOrder(kitchenActor()), "FORBIDDEN");
    expectCode(() => getLastOrder(adminActor()), "FORBIDDEN");
  });
});

describe("solo pedidos propios y válidos", () => {
  it("cliente sin pedidos → null", () => {
    expect(getLastOrder(freshCustomer())).toBeNull();
  });

  it("ignora pendiente_pago y cancelado", () => {
    const c = freshCustomer();
    createOrder(c, sampleInput()); // pendiente_pago
    expect(getLastOrder(c)).toBeNull();
    const cancelled = createOrder(c, sampleInput());
    cancelOrder(c, cancelled.id);
    expect(getLastOrder(c)).toBeNull();
  });

  it("devuelve el último propio pagado / listo / entregado", () => {
    const c = freshCustomer();
    const kitchen = kitchenActor();
    const first = createOrder(c, sampleInput());
    payOrder(c, first.id);
    let last = getLastOrder(c)!;
    expect(last).toMatchObject({ id: first.id, status: "pagado", userId: c.id });
    expect(last.items).toHaveLength(2);

    // un pedido posterior pendiente o cancelado no lo reemplaza
    createOrder(c, { items: [{ productId: productId("espresso"), quantity: 1 }] });
    const cancelled = createOrder(c, { items: [{ productId: productId("tostado"), quantity: 1 }] });
    cancelOrder(c, cancelled.id);
    expect(getLastOrder(c)?.id).toBe(first.id);

    markReady(kitchen, first.id);
    expect(getLastOrder(c)).toMatchObject({ id: first.id, status: "listo" });
    finishOrder(c, first.id);
    expect(getLastOrder(c)).toMatchObject({ id: first.id, status: "entregado" });

    // uno nuevo pagado pasa a ser el último
    const second = createOrder(customerActor("nuevo@gmail.com"), { items: [{ productId: productId("cortado"), quantity: 3 }] });
    payOrder(customerActor("nuevo@gmail.com"), second.id);
    last = getLastOrder(customerActor("nuevo@gmail.com"))!;
    expect(last.id).toBe(second.id);
    expect(last.items).toEqual([expect.objectContaining({ productId: productId("cortado"), quantity: 3 })]);
  });

  it("el más reciente por created_at (no por id)", () => {
    const c = freshCustomer();
    const a = createOrder(c, sampleInput());
    payOrder(c, a.id);
    const b = createOrder(c, { items: [{ productId: productId("espresso"), quantity: 1 }] });
    payOrder(c, b.id);
    // a pasa a ser el más reciente por fecha
    db().prepare("UPDATE orders SET created_at = '2999-01-01T00:00:00.000Z' WHERE id = ?").run(a.id);
    expect(getLastOrder(c)?.id).toBe(a.id);
  });

  it("nunca devuelve el pedido de otro cliente (CA-20)", () => {
    const ana = freshCustomer("ana@gmail.com", "Ana");
    const beto = freshCustomer("beto@gmail.com", "Beto");
    const betoOrder = createOrder(beto, sampleInput());
    payOrder(beto, betoOrder.id);
    expect(getLastOrder(ana)).toBeNull();

    const anaOrder = createOrder(ana, { items: [{ productId: productId("te-verde"), quantity: 1 }] });
    payOrder(ana, anaOrder.id);
    // Beto paga después: el de Ana sigue siendo el de Ana
    const betoLater = createOrder(beto, sampleInput());
    payOrder(beto, betoLater.id);
    expect(getLastOrder(ana)).toMatchObject({ id: anaOrder.id, userId: ana.id });
    expect(getLastOrder(beto)).toMatchObject({ id: betoLater.id, userId: beto.id });
  });

  it("el pedido anterior de la semilla de Sofía no aparece para otro cliente", () => {
    const other = freshCustomer();
    const sofia = customerActor();
    const sofiaLast = getLastOrder(sofia);
    if (sofiaLast) expect(sofiaLast.userId).toBe(sofia.id);
    expect(getLastOrder(other)).toBeNull();
  });
});

describe("repetir lo de siempre", () => {
  it("se repite con los precios actuales", () => {
    const c = freshCustomer();
    const o = createOrder(c, sampleInput());
    payOrder(c, o.id);
    updateProduct(adminActor(), productId("latte"), { price: 4000 });
    const last = getLastOrder(c)!;
    const again = createOrder(c, { items: last.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) });
    expect(again.status).toBe("pendiente_pago");
    expect(again.total).toBe(2 * 4000 + 1200);
    expect(again.userId).toBe(c.id);
  });

  it("si un producto ya no está disponible → VALIDATION; vuelve a funcionar al reponerlo", () => {
    const c = freshCustomer();
    const admin = adminActor();
    const o = createOrder(c, sampleInput());
    payOrder(c, o.id);
    updateProduct(admin, productId("medialuna"), { available: false });
    const last = getLastOrder(c)!;
    const input = { items: last.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) };
    expectCode(() => createOrder(c, input), "VALIDATION");
    updateProduct(admin, productId("medialuna"), { available: true });
    expect(createOrder(c, input).total).toBe(2 * 3400 + 1200);
  });
});

describe("HTTP GET /api/orders/last", () => {
  it("401 sin sesión; 401 con solo la cookie del personal; 403 cocina en la cookie del kiosco", async () => {
    const route = await import("@/app/api/orders/last/route");
    let r = await call(route.GET(req("/api/orders/last"), noParams));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("UNAUTHENTICATED");
    const kitchen = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
    r = await call(route.GET(req("/api/orders/last", { staffToken: kitchen }), noParams));
    expect(r.status).toBe(401);
    r = await call(route.GET(req("/api/orders/last", { token: kitchen }), noParams));
    expect(r.status).toBe(403);
  });

  it("200 { order: null } sin pedidos; { order } propio después de pagar", async () => {
    const route = await import("@/app/api/orders/last/route");
    createCustomer("nuevo@gmail.com");
    const { token } = loginCustomer("nuevo@gmail.com");
    let r = await call(route.GET(req("/api/orders/last", { token }), noParams));
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ order: null });
    const c = customerActor("nuevo@gmail.com");
    const o = createOrder(c, sampleInput());
    payOrder(c, o.id);
    r = await call(route.GET(req("/api/orders/last", { token }), noParams));
    expect(r.status).toBe(200);
    expect(r.body.order).toMatchObject({ id: o.id, userId: c.id, status: "pagado" });
  });
});
