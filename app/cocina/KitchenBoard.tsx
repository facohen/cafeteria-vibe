"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand, Button, Card, api, orderNumber } from "@/components/ui";
import { ProductIcon } from "@/components/icons";
import type { Order } from "@/lib/contracts";
import LogoutButton from "../personal/LogoutButton";
import "../personal/staff.css";

const POLL_MS = 2000;
const HIGHLIGHT_MS = 8000;

function hour(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export default function KitchenBoard({ userName }: { userName: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [marking, setMarking] = useState<Set<number>>(new Set());
  const known = useRef<Set<number> | null>(null);
  const timers = useRef<number[]>([]);

  const handleAuthError = useCallback(
    (err: unknown) => {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        router.replace("/personal");
        return true;
      }
      return false;
    },
    [router],
  );

  const load = useCallback(async () => {
    try {
      const data = await api<{ orders: Order[] }>("/api/kitchen/orders");
      setOnline(true);
      // Pedidos nuevos (solo después de la primera carga) se resaltan unos segundos.
      if (known.current) {
        const prev = known.current;
        const added = data.orders.filter((o) => o.status === "pagado" && !prev.has(o.id)).map((o) => o.id);
        if (added.length) {
          setFresh((s) => new Set([...s, ...added]));
          const t = window.setTimeout(() => {
            setFresh((s) => {
              const next = new Set(s);
              added.forEach((id) => next.delete(id));
              return next;
            });
          }, HIGHLIGHT_MS);
          timers.current.push(t);
        }
      }
      known.current = new Set(data.orders.map((o) => o.id));
      setOrders(data.orders);
    } catch (err) {
      if (!handleAuthError(err)) setOnline(false);
    }
  }, [handleAuthError]);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const tick = async () => {
      await load();
      if (alive) timer = window.setTimeout(tick, POLL_MS);
    };
    tick();
    const pending = timers.current;
    return () => {
      alive = false;
      window.clearTimeout(timer);
      pending.forEach((t) => window.clearTimeout(t));
    };
  }, [load]);

  async function markReady(id: number) {
    setError(null);
    setMarking((s) => new Set(s).add(id));
    // Optimista: pasa a «Listos» enseguida; si falla, se revierte con el refetch.
    setOrders((list) => list?.map((o) => (o.id === id ? { ...o, status: "listo", readyAt: new Date().toISOString() } : o)) ?? list);
    try {
      const { order } = await api<{ order: Order }>(`/api/kitchen/orders/${id}/ready`, { method: "POST" });
      setOrders((list) => list?.map((o) => (o.id === id ? order : o)) ?? list);
    } catch (err) {
      if (handleAuthError(err)) return;
      setError(`No se pudo marcar ${orderNumber(id)}: ${(err as Error).message}`);
      await load();
    } finally {
      setMarking((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  const preparing = (orders ?? []).filter((o) => o.status === "pagado");
  const ready = (orders ?? [])
    .filter((o) => o.status === "listo")
    .sort((a, b) => (b.readyAt ?? "").localeCompare(a.readyAt ?? ""));

  return (
    <div className="st-page">
      <header className="st-top">
        <Brand subtitle="Cocina" />
        <div className="st-top__right">
          <span className={`st-live ${online ? "" : "st-live--off"}`} aria-live="polite">
            <span className="st-live__dot" aria-hidden />
            {online ? "En vivo" : "Sin conexión"}
          </span>
          <span className="vc-muted" style={{ fontWeight: 700 }}>
            {userName}
          </span>
          <LogoutButton />
        </div>
      </header>

      {fresh.size > 0 && (
        <p className="st-banner" role="status">
          {fresh.size === 1 ? "¡Entró un pedido nuevo!" : `¡Entraron ${fresh.size} pedidos nuevos!`}
        </p>
      )}
      {error && (
        <p className="st-banner st-banner--error" role="alert">
          {error}
        </p>
      )}

      <main className="st-board">
        <section className="st-col" aria-label="En preparación">
          <div className="st-col__head">
            <h2>En preparación</h2>
            <span className="st-count">{preparing.length}</span>
          </div>
          {orders === null && <p className="st-empty">Cargando pedidos…</p>}
          {orders !== null && preparing.length === 0 && <p className="st-empty">No hay pedidos para preparar.</p>}
          {preparing.map((o) => (
            <OrderCard key={o.id} order={o} isNew={fresh.has(o.id)}>
              <Button block onClick={() => markReady(o.id)} disabled={marking.has(o.id)}>
                Marcar listo
              </Button>
            </OrderCard>
          ))}
        </section>

        <section className="st-col st-col--ready" aria-label="Listos">
          <div className="st-col__head">
            <h2>Listos</h2>
            <span className="st-count">{ready.length}</span>
          </div>
          {orders !== null && ready.length === 0 && <p className="st-empty">Todavía no hay pedidos listos.</p>}
          {ready.map((o) => (
            <OrderCard key={o.id} order={o} isNew={false} />
          ))}
        </section>
      </main>
    </div>
  );
}

function OrderCard({ order, isNew, children }: { order: Order; isNew: boolean; children?: React.ReactNode }) {
  const isReady = order.status === "listo";
  return (
    <Card className={`st-order ${isNew ? "st-order--new" : ""} ${isReady ? "st-order--ready" : ""}`} data-order-id={order.id}>
      <div className="st-order__head">
        <span className="st-order__num">
          {orderNumber(order.id)}
          {isNew && <span className="st-new-tag">Nuevo</span>}
        </span>
        <span className="st-order__time">{isReady ? `Listo ${hour(order.readyAt)}` : hour(order.paidAt ?? order.createdAt)}</span>
      </div>
      <p className="st-order__who">{order.customerName}</p>
      <ul className="st-items">
        {order.items.map((it) => (
          <li key={it.productId} className="st-item">
            <span className="st-item__icon">
              <ProductIcon icon={it.icon} size={28} />
            </span>
            <span className="st-item__qty">{it.quantity} ×</span>
            <span>{it.name}</span>
          </li>
        ))}
      </ul>
      {children}
    </Card>
  );
}
