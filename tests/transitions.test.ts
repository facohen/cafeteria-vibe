import { describe, expect, it } from "vitest";
import {
  cancelOrder,
  createOrder,
  finishOrder,
  getOrder,
  listKitchenOrders,
  markReady,
  payOrder,
} from "@/lib/services/orders";
import { customerActor, expectCode, kitchenActor, sampleInput, useFreshDb } from "./helpers";

useFreshDb();

function setup() {
  const cliente = customerActor();
  const cocina = kitchenActor();
  const order = createOrder(cliente, sampleInput());
  return { cliente, cocina, order };
}

describe("transiciones válidas adicionales", () => {
  it("cancelar un pedido pendiente_pago → cancelado", () => {
    const { cliente, order } = setup();
    expect(cancelOrder(cliente, order.id).status).toBe("cancelado");
    expect(getOrder(cliente, order.id).status).toBe("cancelado");
  });
});

describe("transiciones inválidas → INVALID_TRANSITION", () => {
  it("markReady sobre pendiente_pago", () => {
    const { cliente, cocina, order } = setup();
    expectCode(() => markReady(cocina, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).status).toBe("pendiente_pago");
  });

  it("pagar dos veces", () => {
    const { cliente, order } = setup();
    const paid = payOrder(cliente, order.id);
    expectCode(() => payOrder(cliente, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).paidAt).toBe(paid.paidAt);
  });

  it("pagar un cancelado", () => {
    const { cliente, cocina, order } = setup();
    cancelOrder(cliente, order.id);
    expectCode(() => payOrder(cliente, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).status).toBe("cancelado");
    expect(listKitchenOrders(cocina).map((o) => o.id)).not.toContain(order.id);
  });

  it("finish antes de listo (pendiente_pago y pagado)", () => {
    const { cliente, order } = setup();
    expectCode(() => finishOrder(cliente, order.id), "INVALID_TRANSITION");
    payOrder(cliente, order.id);
    expectCode(() => finishOrder(cliente, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).status).toBe("pagado");
  });

  it("cancelar un pagado", () => {
    const { cliente, order } = setup();
    payOrder(cliente, order.id);
    expectCode(() => cancelOrder(cliente, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).status).toBe("pagado");
  });

  it("cancelar dos veces y cancelar un listo", () => {
    const { cliente, cocina, order } = setup();
    cancelOrder(cliente, order.id);
    expectCode(() => cancelOrder(cliente, order.id), "INVALID_TRANSITION");
    const o2 = createOrder(cliente, sampleInput());
    payOrder(cliente, o2.id);
    markReady(cocina, o2.id);
    expectCode(() => cancelOrder(cliente, o2.id), "INVALID_TRANSITION");
  });

  it("markReady dos veces", () => {
    const { cliente, cocina, order } = setup();
    payOrder(cliente, order.id);
    const r = markReady(cocina, order.id);
    expectCode(() => markReady(cocina, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).readyAt).toBe(r.readyAt);
  });

  it("finish dos veces y markReady sobre entregado", () => {
    const { cliente, cocina, order } = setup();
    payOrder(cliente, order.id);
    markReady(cocina, order.id);
    finishOrder(cliente, order.id);
    expectCode(() => finishOrder(cliente, order.id), "INVALID_TRANSITION");
    expectCode(() => markReady(cocina, order.id), "INVALID_TRANSITION");
    expect(getOrder(cliente, order.id).status).toBe("entregado");
  });

  it("markReady sobre cancelado", () => {
    const { cliente, cocina, order } = setup();
    cancelOrder(cliente, order.id);
    expectCode(() => markReady(cocina, order.id), "INVALID_TRANSITION");
  });

  it("un pedido sin pagar nunca es listable ni marcable listo", () => {
    const { cliente, cocina } = setup();
    const others = [createOrder(cliente, sampleInput()), createOrder(cliente, sampleInput())];
    for (const o of others) {
      expect(listKitchenOrders(cocina).some((k) => k.id === o.id)).toBe(false);
      expectCode(() => markReady(cocina, o.id), "INVALID_TRANSITION");
    }
    expect(listKitchenOrders(cocina).every((k) => k.status === "pagado" || k.status === "listo")).toBe(true);
    expect(listKitchenOrders(cocina)).toHaveLength(0);
  });
});
