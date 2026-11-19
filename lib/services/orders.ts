// Pedidos (solo servidor). Contrato: docs/TECNICO.md §Contratos.
// Orden de chequeo: sesión → rol → existencia → propiedad → transición.
import { getDb } from "@/lib/db";
import {
  AppError,
  LIMITS,
  type IconKey,
  type Order,
  type OrderItem,
  type OrderStatus,
  type SessionUser,
} from "@/lib/contracts";
import { requireRole } from "@/lib/services/auth";

interface OrderRow {
  id: number;
  user_id: number;
  customer_name: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  paid_at: string | null;
  ready_at: string | null;
  finished_at: string | null;
}

interface ItemRow {
  order_id: number;
  product_id: number;
  name: string;
  unit_price: number;
  quantity: number;
  icon: IconKey;
}

const ORDER_SELECT = `SELECT o.id, o.user_id, u.name AS customer_name, o.status, o.total,
  o.created_at, o.paid_at, o.ready_at, o.finished_at
  FROM orders o JOIN users u ON u.id = o.user_id`;

function toItem(r: ItemRow): OrderItem {
  return { productId: r.product_id, name: r.name, unitPrice: r.unit_price, quantity: r.quantity, icon: r.icon };
}

function hydrate(rows: OrderRow[]): Order[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const items = db
    .prepare(
      `SELECT order_id, product_id, name, unit_price, quantity, icon FROM order_items
       WHERE order_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
    )
    .all(...ids) as ItemRow[];
  const byOrder = new Map<number, OrderItem[]>();
  for (const it of items) {
    const list = byOrder.get(it.order_id) ?? [];
    list.push(toItem(it));
    byOrder.set(it.order_id, list);
  }
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    customerName: r.customer_name,
    status: r.status,
    total: r.total,
    items: byOrder.get(r.id) ?? [],
    createdAt: r.created_at,
    paidAt: r.paid_at,
    readyAt: r.ready_at,
    finishedAt: r.finished_at,
  }));
}

function loadOrder(id: number): Order | null {
  const row = getDb().prepare(`${ORDER_SELECT} WHERE o.id = ?`).get(id) as OrderRow | undefined;
  return row ? hydrate([row])[0] : null;
}

/** Acepta número o el string crudo de la URL; se valida DESPUÉS de sesión y rol. */
function validId(raw: unknown): number {
  const id = typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : raw;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError("NOT_FOUND", "Pedido no encontrado");
  }
  return id;
}

/** Existencia y propiedad (tras sesión y rol). */
function loadOwned(actor: SessionUser, id: unknown): Order {
  const order = loadOrder(validId(id));
  if (!order) throw new AppError("NOT_FOUND", "Pedido no encontrado");
  if (order.userId !== actor.id) throw new AppError("FORBIDDEN", "Este pedido no es tuyo");
  return order;
}

const now = () => new Date().toISOString();

/** Transición atómica: solo cambia si el estado actual es `from`. */
function transition(id: number, from: OrderStatus, to: OrderStatus, stampCol: string | null): Order {
  const db = getDb();
  const sql = stampCol
    ? `UPDATE orders SET status = ?, ${stampCol} = ? WHERE id = ? AND status = ?`
    : `UPDATE orders SET status = ? WHERE id = ? AND status = ?`;
  const info = stampCol ? db.prepare(sql).run(to, now(), id, from) : db.prepare(sql).run(to, id, from);
  if (info.changes !== 1) {
    throw new AppError("INVALID_TRANSITION", `El pedido no está en estado «${from}»`);
  }
  return loadOrder(id)!;
}

function ownerTransition(
  actor: SessionUser | null,
  id: unknown,
  from: OrderStatus,
  to: OrderStatus,
  stampCol: string | null,
): Order {
  const a = requireRole(actor, "cliente");
  const order = loadOwned(a, id);
  if (order.status !== from) throw new AppError("INVALID_TRANSITION", `El pedido no está en estado «${from}»`);
  return transition(order.id, from, to, stampCol);
}

function parseItems(input: unknown): Map<number, number> {
  const v = (msg: string) => new AppError("VALIDATION", msg);
  if (typeof input !== "object" || input === null || Array.isArray(input)) throw v("Pedido inválido");
  const items = (input as { items?: unknown }).items;
  if (!Array.isArray(items)) throw v("items debe ser una lista");
  if (items.length < 1) throw v("El pedido está vacío");
  if (items.length > LIMITS.maxLines) throw v(`Máximo ${LIMITS.maxLines} líneas por pedido`);
  const qty = new Map<number, number>();
  for (const line of items) {
    if (typeof line !== "object" || line === null || Array.isArray(line)) throw v("Línea de pedido inválida");
    const { productId, quantity } = line as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== "number" || !Number.isInteger(productId) || productId <= 0) {
      throw v("productId inválido");
    }
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < LIMITS.minQuantity ||
      quantity > LIMITS.maxQuantity
    ) {
      throw v(`La cantidad debe ser un entero entre ${LIMITS.minQuantity} y ${LIMITS.maxQuantity}`);
    }
    const sum = (qty.get(productId) ?? 0) + quantity;
    if (sum > LIMITS.maxQuantity) throw v(`Máximo ${LIMITS.maxQuantity} unidades por producto`);
    qty.set(productId, sum);
  }
  return qty;
}

export function createOrder(actor: SessionUser | null, input: unknown): Order {
  const a = requireRole(actor, "cliente");
  const qty = parseItems(input);
  const db = getDb();
  const getProduct = db.prepare("SELECT id, name, price, icon, available FROM products WHERE id = ?");
  const lines: { productId: number; name: string; price: number; icon: string; quantity: number }[] = [];
  for (const [productId, quantity] of qty) {
    const p = getProduct.get(productId) as
      | { id: number; name: string; price: number; icon: string; available: number }
      | undefined;
    if (!p) throw new AppError("VALIDATION", `El producto ${productId} no existe`);
    if (p.available !== 1) throw new AppError("VALIDATION", `«${p.name}» no está disponible`);
    lines.push({ productId, name: p.name, price: p.price, icon: p.icon, quantity });
  }
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const id = db.transaction(() => {
    const info = db
      .prepare("INSERT INTO orders (user_id, status, total, created_at) VALUES (?, 'pendiente_pago', ?, ?)")
      .run(a.id, total, now());
    const orderId = Number(info.lastInsertRowid);
    const ins = db.prepare(
      "INSERT INTO order_items (order_id, product_id, name, unit_price, quantity, icon) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const l of lines) ins.run(orderId, l.productId, l.name, l.price, l.quantity, l.icon);
    return orderId;
  })();
  return loadOrder(id)!;
}

export function getOrder(actor: SessionUser | null, id: unknown): Order {
  const a = requireRole(actor, "cliente");
  return loadOwned(a, id);
}

export function payOrder(actor: SessionUser | null, id: unknown): Order {
  return ownerTransition(actor, id, "pendiente_pago", "pagado", "paid_at");
}

export function cancelOrder(actor: SessionUser | null, id: unknown): Order {
  return ownerTransition(actor, id, "pendiente_pago", "cancelado", null);
}

export function finishOrder(actor: SessionUser | null, id: unknown): Order {
  return ownerTransition(actor, id, "listo", "entregado", "finished_at");
}

export function listKitchenOrders(actor: SessionUser | null): Order[] {
  requireRole(actor, "cocina");
  const rows = getDb()
    .prepare(`${ORDER_SELECT} WHERE o.status IN ('pagado','listo') ORDER BY o.created_at, o.id`)
    .all() as OrderRow[];
  return hydrate(rows);
}

export function markReady(actor: SessionUser | null, id: unknown): Order {
  requireRole(actor, "cocina");
  const order = loadOrder(validId(id));
  if (!order) throw new AppError("NOT_FOUND", "Pedido no encontrado");
  if (order.status !== "pagado") throw new AppError("INVALID_TRANSITION", "Solo un pedido pagado puede marcarse listo");
  return transition(order.id, "pagado", "listo", "ready_at");
}

/**
 * «Pedí lo de siempre»: pedido más reciente DEL PROPIO cliente que se llegó a pagar
 * (pagado | listo | entregado). Nunca pendiente_pago ni cancelado. null si no tiene ninguno.
 */
export function getLastOrder(actor: SessionUser | null): Order | null {
  const a = requireRole(actor, "cliente");
  const row = getDb()
    .prepare(
      `${ORDER_SELECT} WHERE o.user_id = ? AND o.status IN ('pagado','listo','entregado')
       ORDER BY o.created_at DESC, o.id DESC LIMIT 1`,
    )
    .get(a.id) as OrderRow | undefined;
  return row ? hydrate([row])[0] : null;
}
