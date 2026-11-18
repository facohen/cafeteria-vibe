import { describe, expect, it } from "vitest";
import { getCatalog } from "@/lib/services/catalog";
import { createOrder, finishOrder, getOrder, listKitchenOrders, markReady, payOrder } from "@/lib/services/orders";
import { customerActor, kitchenActor, productId, sampleInput, useFreshDb, db } from "./helpers";

useFreshDb();

describe("recorrido principal", () => {
  it("cliente pide, paga, cocina marca listo y el cliente termina", () => {
    const cliente = customerActor();
    expect(cliente.role).toBe("cliente");

    const catalog = getCatalog(cliente);
    expect(catalog.categories.map((c) => c.slug)).toEqual(["cafes", "frias", "pasteleria"]);
    const latte = catalog.products.find((p) => p.slug === "latte")!;
    expect(latte.price).toBe(3400);
    expect(latte.available).toBe(true);

    const order = createOrder(cliente, {
      items: [
        { productId: productId("latte"), quantity: 2, price: 1 },
        { productId: productId("medialuna"), quantity: 1, price: 1 },
      ],
    } as never);
    expect(order.status).toBe("pendiente_pago");
    expect(order.total).toBe(2 * 3400 + 1200);
    expect(order.userId).toBe(cliente.id);
    expect(order.customerName).toBe(cliente.name);
    expect(order.paidAt).toBeNull();
    expect(order.readyAt).toBeNull();
    expect(order.finishedAt).toBeNull();
    expect(order.items).toHaveLength(2);
    const li = order.items.find((i) => i.productId === productId("latte"))!;
    expect(li).toMatchObject({ name: "Latte", unitPrice: 3400, quantity: 2, icon: "latte" });
    const mi = order.items.find((i) => i.productId === productId("medialuna"))!;
    expect(mi).toMatchObject({ unitPrice: 1200, quantity: 1 });

    // persistido con el total calculado
    const row = db().prepare("SELECT total, status FROM orders WHERE id = ?").get(order.id) as { total: number; status: string };
    expect(row).toEqual({ total: 8000, status: "pendiente_pago" });

    const cocina = kitchenActor();
    expect(listKitchenOrders(cocina).map((o) => o.id)).not.toContain(order.id);

    const paid = payOrder(cliente, order.id);
    expect(paid.status).toBe("pagado");
    expect(paid.paidAt).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(paid.paidAt!))).toBe(false);

    const kitchen = listKitchenOrders(cocina);
    expect(kitchen.map((o) => o.id)).toContain(order.id);
    expect(kitchen.find((o) => o.id === order.id)!.status).toBe("pagado");

    const ready = markReady(cocina, order.id);
    expect(ready.status).toBe("listo");
    expect(ready.readyAt).toEqual(expect.any(String));

    const seen = getOrder(cliente, order.id);
    expect(seen.status).toBe("listo");
    expect(seen.readyAt).toEqual(expect.any(String));
    expect(seen.total).toBe(8000);

    const done = finishOrder(cliente, order.id);
    expect(done.status).toBe("entregado");
    expect(done.finishedAt).toEqual(expect.any(String));
    expect(getOrder(cliente, order.id).status).toBe("entregado");
  });

  it("el precio unitario queda histórico aunque cambie el precio del producto", () => {
    const cliente = customerActor();
    const order = createOrder(cliente, sampleInput());
    db().prepare("UPDATE products SET price = 9999 WHERE slug = 'latte'").run();
    const again = getOrder(cliente, order.id);
    expect(again.total).toBe(8000);
    expect(again.items.find((i) => i.productId === productId("latte"))!.unitPrice).toBe(3400);
  });

  it("listKitchenOrders: pagado y listo, del más viejo al más nuevo", () => {
    const cliente = customerActor();
    const cocina = kitchenActor();
    const a = createOrder(cliente, sampleInput());
    const b = createOrder(cliente, sampleInput());
    const c = createOrder(cliente, sampleInput());
    payOrder(cliente, a.id);
    payOrder(cliente, b.id);
    markReady(cocina, a.id);
    const ids = listKitchenOrders(cocina).map((o) => o.id);
    expect(ids).toEqual([a.id, b.id]);
    expect(ids).not.toContain(c.id);
  });

  it("los pedidos entregados y cancelados no aparecen en cocina", () => {
    const cliente = customerActor();
    const cocina = kitchenActor();
    const a = createOrder(cliente, sampleInput());
    payOrder(cliente, a.id);
    markReady(cocina, a.id);
    finishOrder(cliente, a.id);
    const b = createOrder(cliente, sampleInput());
    // cancelOrder se importa en transitions; acá alcanza con un pedido sin pagar
    const ids = listKitchenOrders(cocina).map((o) => o.id);
    expect(ids).not.toContain(a.id);
    expect(ids).not.toContain(b.id);
  });
});
