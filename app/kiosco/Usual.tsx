"use client";
import type { Order } from "@/lib/contracts";
import { ProductIcon } from "@/components/icons";

/** «1 Latte · 2× Medialuna» (sin precios: el total cobrable lo da el servidor en el QR). */
export function usualSummary(order: Order): string {
  return order.items.map((it) => (it.quantity > 1 ? `${it.quantity}× ${it.name}` : it.name)).join(" · ");
}

/** «Pedí lo de siempre»: repite el último pedido y va directo al pago. */
export function Usual({ order, onRepeat, busy }: { order: Order; onRepeat: () => void; busy: boolean }) {
  const icons = order.items.slice(0, 4);
  const summary = usualSummary(order);
  return (
    <button
      type="button"
      className="k-usual"
      onClick={onRepeat}
      disabled={busy}
      aria-label={`Pedí lo de siempre: ${summary}. Tocá para ir directo al pago.`}
    >
      <span className="k-usual__icons" aria-hidden>
        {icons.map((it) => (
          <span key={it.productId} className="k-usual__icon">
            <ProductIcon icon={it.icon} size={72} />
            {it.quantity > 1 && <span className="k-usual__qty">{it.quantity}</span>}
          </span>
        ))}
        {order.items.length > icons.length && <span className="k-usual__more">+{order.items.length - icons.length}</span>}
      </span>
      <span className="k-usual__text">
        <span className="k-usual__kicker">Pedí lo de siempre</span>
        <span className="k-usual__summary">{summary}</span>
      </span>
      <span className="k-usual__cta">{busy ? "Un momento…" : "Pedir y pagar →"}</span>
    </button>
  );
}
