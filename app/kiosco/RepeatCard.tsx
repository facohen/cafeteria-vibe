"use client";
// «Pedí lo de siempre»: tarjeta grande arriba del menú con el último pedido pagado del cliente.
// Un toque crea el mismo pedido (productId + quantity; los precios los pone el servidor) y va al QR.
import type { Catalog, Order } from "@/lib/contracts";
import { formatPrice } from "@/components/ui";
import { ProductIcon } from "@/components/icons";

export const REPEAT_UNAVAILABLE_MSG = "Algo de tu pedido de siempre no está disponible hoy. Armá tu pedido.";

export function RepeatCard({
  order,
  catalog,
  onRepeat,
  busy,
  notice,
}: {
  order: Order;
  catalog: Catalog;
  onRepeat: () => void;
  busy: boolean;
  notice: string | null;
}) {
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const count = order.items.reduce((s, it) => s + it.quantity, 0);
  // Estimación con los precios de HOY (el total real lo calcula el servidor al crear el pedido).
  const allKnown = order.items.every((it) => byId.get(it.productId)?.available);
  const estimate = allKnown
    ? order.items.reduce((s, it) => s + it.quantity * (byId.get(it.productId)?.price ?? 0), 0)
    : null;
  // Si el catálogo de hoy ya muestra algo sin stock (o borrado), avisamos sin esperar al toque.
  const shown = notice ?? (allKnown ? null : REPEAT_UNAVAILABLE_MSG);
  const summary = order.items.map((it) => `${it.quantity} ${it.name}`).join(", ");

  return (
    <section className={`k-repeat ${shown ? "is-off" : ""}`} aria-label="Pedí lo de siempre">
      <button
        type="button"
        className="k-repeat__tap"
        onClick={onRepeat}
        disabled={busy || !!shown}
        aria-label={`Pedí lo de siempre: ${summary}. Tocá para pagar.`}
      >
        <span className="k-repeat__text">
          <span className="k-repeat__kicker">Lo de la última vez</span>
          <strong className="k-repeat__title">Pedí lo de siempre</strong>
          <span className="k-repeat__items">
            {order.items.map((it) => (
              <span key={it.productId} className="k-repeat__item">
                <ProductIcon icon={it.icon} size={56} />
                <span>
                  {it.quantity > 1 && <b className="k-repeat__qty">{it.quantity}×</b>} {it.name}
                </span>
              </span>
            ))}
          </span>
        </span>
        {!shown && (
          <span className="k-repeat__cta">
            <span className="k-repeat__go" aria-hidden>
              →
            </span>
            <span className="k-repeat__ctaText">{busy ? "Un momento…" : "Tocá y pagá"}</span>
            {estimate !== null && (
              <span className="k-repeat__price">
                {formatPrice(estimate)}
                <small>
                  {count} {count === 1 ? "producto" : "productos"}
                </small>
              </span>
            )}
          </span>
        )}
      </button>
      {shown && (
        <p className="k-repeat__notice vc-badge--warn" role="alert">
          {shown}
        </p>
      )}
    </section>
  );
}
