"use client";
// KIOSCO DEL CLIENTE — una sola página con pasos:
//   bienvenida -> Google simulado -> menú + carrito -> pago QR -> estado/aviso -> terminar.
// Habla solo con la API HTTP de lib/contracts.ts. El total que se cobra es el que devuelve el servidor.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Catalog, Order, Product, User } from "@/lib/contracts";
import { LIMITS } from "@/lib/contracts";
import { api } from "@/components/ui";
import { Welcome } from "./Welcome";
import { AccountPicker } from "./AccountPicker";
import { Menu, type Cart } from "./Menu";
import { Payment } from "./Payment";
import { OrderStatusView } from "./OrderStatusView";
import "./kiosco.css";

type Step = "loading" | "welcome" | "menu" | "pay" | "status";
type ApiErr = Error & { status?: number; code?: string };

/** Pedido en curso, para retomarlo si se recarga la página (solo en este navegador/pestaña). */
const ORDER_KEY = "vc_kiosk_order";
const POLL_MS = 2000;

function saveOrderId(id: number | null) {
  try {
    if (id === null) sessionStorage.removeItem(ORDER_KEY);
    else sessionStorage.setItem(ORDER_KEY, String(id));
  } catch {
    /* almacenamiento no disponible: no se retoma, sin romper el flujo */
  }
}
function readOrderId(): number | null {
  try {
    const v = Number(sessionStorage.getItem(ORDER_KEY));
    return Number.isInteger(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export default function Kiosk() {
  const [step, setStep] = useState<Step>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const busyRef = useRef(false);

  const resetToWelcome = useCallback((msg?: string) => {
    saveOrderId(null);
    setUser(null);
    setCatalog(null);
    setCart({});
    setOrder(null);
    setError(null);
    setOffline(false);
    setPickerOpen(false);
    setLoggingIn(null);
    setNotice(msg ?? null);
    setStep("welcome");
  }, []);

  /**
   * Muestra el mensaje de la API. Si la sesión ya no vale (401) o ya no es la del cliente dueño
   * (403: la sesión ya no es la del cliente dueño del pedido), vuelve a la
   * bienvenida en vez de seguir reintentando.
   */
  const handleError = useCallback(
    (e: unknown) => {
      const err = e as ApiErr;
      if (err?.status === 401) {
        resetToWelcome("Tu sesión se cerró. Tocá para empezar de nuevo.");
        return;
      }
      if (err?.status === 403) {
        saveOrderId(null);
        resetToWelcome(
          "Tu sesión ya no puede ver este pedido. Tocá para empezar de nuevo.",
        );
        return;
      }
      setError(err?.message || "Algo salió mal. Probá de nuevo.");
    },
    [resetToWelcome],
  );

  /** Ejecuta una acción con bloqueo anti doble toque. */
  const run = useCallback(
    async (fn: () => Promise<void>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      try {
        await fn();
      } catch (e) {
        handleError(e);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [handleError],
  );

  /** Carga catálogo y saca del carrito lo que se quedó sin stock. */
  const loadCatalog = useCallback(async () => {
    const cat = await api<Catalog>("/api/catalog");
    setCatalog(cat);
    const unavailable = new Set(cat.products.filter((p) => !p.available).map((p) => p.id));
    const known = new Set(cat.products.map((p) => p.id));
    setCart((prev) => {
      const next: Cart = {};
      for (const [id, q] of Object.entries(prev)) {
        const pid = Number(id);
        if (known.has(pid) && !unavailable.has(pid)) next[pid] = q;
      }
      return next;
    });
    return cat;
  }, []);

  // Al cargar: si hay sesión de cliente, directo al menú (o al pedido en curso). Personal -> bienvenida.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user: me } = await api<{ user: User | null }>("/api/me");
        if (cancelled) return;
        if (!me || me.role !== "cliente") {
          setStep("welcome");
          return;
        }
        const cat = await api<Catalog>("/api/catalog");
        if (cancelled) return;
        setUser(me);
        setCatalog(cat);
        const savedId = readOrderId();
        if (savedId) {
          try {
            const { order: o } = await api<{ order: Order }>(`/api/orders/${savedId}`);
            if (cancelled) return;
            if (o.status === "pendiente_pago") {
              setOrder(o);
              setStep("pay");
              return;
            }
            if (o.status === "pagado" || o.status === "listo") {
              setOrder(o);
              setStep("status");
              return;
            }
          } catch {
            /* pedido ajeno o inexistente: se ignora */
          }
          saveOrderId(null);
        }
        setStep("menu");
      } catch {
        if (!cancelled) setStep("welcome");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Polling cada 2 s mientras el pedido está en preparación.
  const orderId = order?.id;
  const orderStatus = order?.status;
  useEffect(() => {
    if (step !== "status" || !orderId || orderStatus !== "pagado") return;
    let inFlight = false;
    let stopped = false;
    const t = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const { order: o } = await api<{ order: Order }>(`/api/orders/${orderId}`);
        if (!stopped) {
          setOrder(o);
          setOffline(false);
        }
      } catch (e) {
        if (stopped) return;
        const err = e as ApiErr;
        if (err.status === 401 || err.status === 403) handleError(err);
        else if (err.status) setError(err.message);
        else setOffline(true); // error de red: seguimos reintentando
      } finally {
        inFlight = false;
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [step, orderId, orderStatus, handleError]);

  // ---- Acciones ----

  async function login(email: string) {
    if (loggingIn) return;
    setLoggingIn(email);
    setError(null);
    try {
      const { user: u } = await api<{ user: User }>("/api/auth/google", { json: { email } });
      setUser(u);
      setCart({});
      setOrder(null);
      await loadCatalog();
      setNotice(null);
      setPickerOpen(false);
      setStep("menu");
    } catch (e) {
      setError((e as Error).message || "No pudimos entrar con esa cuenta.");
    } finally {
      setLoggingIn(null);
    }
  }

  function addProduct(p: Product) {
    if (!p.available) return;
    setError(null);
    const current = cart[p.id] ?? 0;
    if (current >= LIMITS.maxQuantity) {
      setError(`Podés pedir hasta ${LIMITS.maxQuantity} unidades de cada producto.`);
      return;
    }
    if (current === 0 && Object.keys(cart).length >= LIMITS.maxLines) {
      setError(`Podés pedir hasta ${LIMITS.maxLines} productos distintos.`);
      return;
    }
    setCart({ ...cart, [p.id]: current + 1 });
  }

  function changeQuantity(productId: number, quantity: number) {
    setError(null);
    const q = Math.min(LIMITS.maxQuantity, Math.max(0, quantity));
    const next = { ...cart };
    if (q === 0) delete next[productId];
    else next[productId] = q;
    setCart(next);
  }

  function checkout() {
    return run(async () => {
      const items = Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ productId: Number(id), quantity: q }));
      if (items.length === 0) return;
      try {
        const { order: o } = await api<{ order: Order }>("/api/orders", { json: { items } });
        setOrder(o);
        saveOrderId(o.id);
        setStep("pay");
      } catch (e) {
        const err = e as ApiErr;
        // Si algo cambió (p. ej. un producto se quedó sin stock), refrescamos el menú y mostramos el motivo.
        if (err.code === "VALIDATION") {
          const cat = await loadCatalog().catch(() => null);
          const removed = cat?.products.filter((p) => !p.available && cart[p.id]).map((p) => p.name) ?? [];
          if (removed.length > 0) {
            throw Object.assign(new Error(`${err.message}. Lo sacamos de tu pedido: revisalo y volvé a tocar «Pagar».`), {
              status: err.status,
            });
          }
        }
        throw err;
      }
    });
  }

  function pay() {
    if (!order) return;
    return run(async () => {
      const { order: o } = await api<{ order: Order }>(`/api/orders/${order.id}/pay`, { method: "POST" });
      setOrder(o);
      setCart({});
      setStep("status");
    });
  }

  function cancelPayment() {
    if (!order) return;
    return run(async () => {
      try {
        await api<{ order: Order }>(`/api/orders/${order.id}/cancel`, { method: "POST" });
      } catch (e) {
        const err = e as ApiErr;
        // Ya no estaba pendiente (p. ej. se pagó): mostramos su estado real.
        if (err.code === "INVALID_TRANSITION") {
          const { order: o } = await api<{ order: Order }>(`/api/orders/${order.id}`);
          setOrder(o);
          if (o.status === "pagado" || o.status === "listo") {
            setCart({});
            setStep("status");
            return;
          }
        } else throw err;
      }
      saveOrderId(null);
      setOrder(null);
      setStep("menu"); // el carrito se conserva para corregirlo
    });
  }

  function finish() {
    return run(async () => {
      if (order?.status === "listo") {
        try {
          await api(`/api/orders/${order.id}/finish`, { method: "POST" });
        } catch (e) {
          if ((e as ApiErr).status === 401) throw e;
          // Otro error: igual liberamos el kiosco; el pedido queda «listo» en cocina.
        }
      }
      await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      resetToWelcome();
    });
  }

  function logout() {
    return run(async () => {
      await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      resetToWelcome();
    });
  }

  // ---- Render ----

  return (
    <main className="vc-kiosk k-root">
      {step === "loading" && (
        <div className="k-loading">
          <span className="k-spinner" aria-label="Cargando" />
        </div>
      )}

      {step === "welcome" && (
        <Welcome
          notice={notice}
          onStart={() => {
            setError(null);
            setPickerOpen(true);
          }}
        />
      )}

      {step === "menu" && user && catalog && (
        <Menu
          user={user}
          catalog={catalog}
          cart={cart}
          onAdd={addProduct}
          onChange={changeQuantity}
          onPay={checkout}
          onLogout={logout}
          busy={busy}
          error={error}
          onDismissError={() => setError(null)}
        />
      )}

      {step === "pay" && order && (
        <Payment order={order} onPaid={pay} onCancel={cancelPayment} busy={busy} error={error} />
      )}

      {step === "status" && order && (
        <OrderStatusView order={order} onFinish={finish} busy={busy} error={error} offline={offline} />
      )}

      {pickerOpen && step === "welcome" && (
        <AccountPicker
          onPick={login}
          onClose={() => {
            if (!loggingIn) setPickerOpen(false);
          }}
          busyEmail={loggingIn}
          error={error}
        />
      )}
    </main>
  );
}
