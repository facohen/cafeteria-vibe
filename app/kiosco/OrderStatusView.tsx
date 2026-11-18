"use client";
import { useState } from "react";
import type { Order } from "@/lib/contracts";
import { Brand, Button, StatusBadge, formatPrice, orderNumber } from "@/components/ui";
import { ProductIcon } from "@/components/icons";

/**
 * Paso (e): número de pedido, estado en vivo y aviso de «listo».
 * «Terminar»:
 *  - listo      -> POST /finish (entregado) y cierra la sesión.
 *  - pagado     -> pide confirmación; si confirma solo cierra la sesión (el pedido sigue en cocina
 *                  y se retira en el mostrador con el número). No se puede «entregar» algo no listo.
 *  - otro       -> cierra la sesión.
 */
export function OrderStatusView({
  order,
  onFinish,
  busy,
  error,
  offline,
}: {
  order: Order;
  onFinish: () => void;
  busy: boolean;
  error: string | null;
  offline: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const ready = order.status === "listo";
  const preparing = order.status === "pagado";

  function handleFinish() {
    if (preparing && !confirming) {
      setConfirming(true);
      return;
    }
    onFinish();
  }

  return (
    <div className="k-status">
      <header className="k-menu__head">
        <Brand />
        <StatusBadge status={order.status} />
      </header>

      <div className={`k-status__number ${ready ? "is-ready" : ""}`}>
        <span>Tu número de pedido</span>
        <strong>{orderNumber(order.id)}</strong>
      </div>

      {ready ? (
        <div className="k-ready" role="alert" aria-live="assertive">
          <span className="k-ready__icon" aria-hidden>
            <svg viewBox="0 0 48 48" width="64" height="64" fill="none" stroke="#1f2a1f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 25l8 8 16-18" />
            </svg>
          </span>
          <strong>¡Tu pedido está listo!</strong>
          <span>Retiralo en el mostrador</span>
        </div>
      ) : preparing ? (
        <div className="k-preparing" aria-live="polite">
          <span className="k-preparing__cup" aria-hidden>
            <ProductIcon icon="generico" size={96} />
          </span>
          <strong>Estamos preparando tu pedido</strong>
          <span className="vc-muted">Te avisamos en esta pantalla cuando esté listo.</span>
          <span className="k-dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : (
        <div className="k-preparing">
          <strong>Estado: </strong>
          <StatusBadge status={order.status} />
        </div>
      )}

      <ul className="k-status__items">
        {order.items.map((i) => (
          <li key={i.productId}>
            <ProductIcon icon={i.icon} size={48} />
            <span className="k-status__name">
              {i.quantity} × {i.name}
            </span>
            <span>{formatPrice(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
        <li className="k-status__total">
          <span>Total pagado</span>
          <strong>{formatPrice(order.total)}</strong>
        </li>
      </ul>

      {offline && <p className="k-warn">Sin conexión con el local, reintentando…</p>}
      {error && (
        <p className="k-alert" role="alert">
          {error}
        </p>
      )}

      <div className="k-status__actions">
        {confirming && preparing ? (
          <div className="k-confirm">
            <p>
              Tu pedido sigue en preparación. Si terminás ahora, se cierra tu sesión y lo retirás en el mostrador
              con el número <strong>{orderNumber(order.id)}</strong>.
            </p>
            <Button block variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Seguir esperando
            </Button>
            <Button block onClick={handleFinish} disabled={busy}>
              Terminar igual
            </Button>
          </div>
        ) : (
          <Button block variant={ready ? "primary" : "secondary"} onClick={handleFinish} disabled={busy}>
            {busy ? "Cerrando…" : ready ? "Ya lo retiré · Terminar" : "Terminar"}
          </Button>
        )}
      </div>
    </div>
  );
}
