import { describe, expect, it } from "vitest";
import { getCatalog } from "@/lib/services/catalog";
import {
  cancelOrder,
  createOrder,
  finishOrder,
  getOrder,
  listKitchenOrders,
  markReady,
  payOrder,
} from "@/lib/services/orders";
import { adminActor, createCustomer, customerActor, expectCode, kitchenActor, sampleInput, useFreshDb } from "./helpers";

useFreshDb();

describe("sin sesión (actor null) → UNAUTHENTICATED", () => {
  it("en cada operación", () => {
    const cliente = customerActor();
    const order = createOrder(cliente, sampleInput());
    expectCode(() => getCatalog(null), "UNAUTHENTICATED");
    expectCode(() => createOrder(null, sampleInput()), "UNAUTHENTICATED");
    expectCode(() => getOrder(null, order.id), "UNAUTHENTICATED");
    expectCode(() => payOrder(null, order.id), "UNAUTHENTICATED");
    expectCode(() => cancelOrder(null, order.id), "UNAUTHENTICATED");
    expectCode(() => finishOrder(null, order.id), "UNAUTHENTICATED");
    expectCode(() => listKitchenOrders(null), "UNAUTHENTICATED");
    expectCode(() => markReady(null, order.id), "UNAUTHENTICATED");
  });

  it("sin sesión gana sobre id inexistente y entrada inválida", () => {
    expectCode(() => getOrder(null, 99999), "UNAUTHENTICATED");
    expectCode(() => markReady(null, 99999), "UNAUTHENTICATED");
    expectCode(() => createOrder(null, { items: [] }), "UNAUTHENTICATED");
  });
});

describe("rol incorrecto → FORBIDDEN", () => {
  it("cocina y admin no ven catálogo de cliente, ni crean, ven, pagan, cancelan o terminan pedidos", () => {
    const cliente = customerActor();
    const order = createOrder(cliente, sampleInput());
    for (const staff of [kitchenActor(), adminActor()]) {
      expectCode(() => getCatalog(staff), "FORBIDDEN");
      expectCode(() => createOrder(staff, sampleInput()), "FORBIDDEN");
      expectCode(() => getOrder(staff, order.id), "FORBIDDEN");
      expectCode(() => payOrder(staff, order.id), "FORBIDDEN");
      expectCode(() => cancelOrder(staff, order.id), "FORBIDDEN");
      expectCode(() => finishOrder(staff, order.id), "FORBIDDEN");
    }
    expect(getOrder(cliente, order.id).status).toBe("pendiente_pago");
  });

  it("cliente y admin no listan cocina ni marcan listo", () => {
    const cliente = customerActor();
    const order = createOrder(cliente, sampleInput());
    payOrder(cliente, order.id);
    for (const actor of [cliente, adminActor()]) {
      expectCode(() => listKitchenOrders(actor), "FORBIDDEN");
      expectCode(() => markReady(actor, order.id), "FORBIDDEN");
    }
    expect(getOrder(cliente, order.id).status).toBe("pagado");
  });

  it("rol se chequea antes que existencia: rol incorrecto con id inexistente → FORBIDDEN", () => {
    expectCode(() => markReady(customerActor(), 99999), "FORBIDDEN");
    expectCode(() => payOrder(kitchenActor(), 99999), "FORBIDDEN");
  });
});

describe("pedidos ajenos y existencia", () => {
  it("otro cliente no puede getOrder/pay/cancel/finish → FORBIDDEN", () => {
    const sofia = customerActor();
    createCustomer("juan@gmail.com", "Juan");
    const juan = customerActor("juan@gmail.com");
    const order = createOrder(sofia, sampleInput());
    expectCode(() => getOrder(juan, order.id), "FORBIDDEN");
    expectCode(() => payOrder(juan, order.id), "FORBIDDEN");
    expectCode(() => cancelOrder(juan, order.id), "FORBIDDEN");
    expect(getOrder(sofia, order.id).status).toBe("pendiente_pago");

    payOrder(sofia, order.id);
    markReady(kitchenActor(), order.id);
    expectCode(() => finishOrder(juan, order.id), "FORBIDDEN");
    expect(getOrder(sofia, order.id).status).toBe("listo");
  });

  it("propiedad se chequea antes que transición: ajeno en estado inválido → FORBIDDEN", () => {
    const sofia = customerActor();
    createCustomer("juan@gmail.com", "Juan");
    const juan = customerActor("juan@gmail.com");
    const order = createOrder(sofia, sampleInput());
    expectCode(() => finishOrder(juan, order.id), "FORBIDDEN");
  });

  it("id inexistente → NOT_FOUND", () => {
    const cliente = customerActor();
    const cocina = kitchenActor();
    expectCode(() => getOrder(cliente, 99999), "NOT_FOUND");
    expectCode(() => payOrder(cliente, 99999), "NOT_FOUND");
    expectCode(() => cancelOrder(cliente, 99999), "NOT_FOUND");
    expectCode(() => finishOrder(cliente, 99999), "NOT_FOUND");
    expectCode(() => markReady(cocina, 99999), "NOT_FOUND");
  });
});
