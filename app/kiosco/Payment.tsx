"use client";
import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import type { Order } from "@/lib/contracts";
import { Brand, Button, formatPrice, orderNumber } from "@/components/ui";

/** Texto que codifica el QR simulado (no lo procesa ninguna billetera real). */
export function paymentPayload(order: Order): string {
  return `vibecoffee://pago?pedido=${order.id}&importe=${order.total}`;
}

/** Paso (d): pago con QR simulado. El importe es el que calculó el servidor. */
export function Payment({
  order,
  onPaid,
  onCancel,
  busy,
  error,
}: {
  order: Order;
  onPaid: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const payload = paymentPayload(order);

  useEffect(() => {
    let cancelled = false;
    toDataURL(payload, { width: 520, margin: 1, errorCorrectionLevel: "M", color: { dark: "#1f2a1f", light: "#ffffff" } })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [payload]);

  const count = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="k-pay">
      <header className="k-menu__head">
        <Brand />
        <span className="vc-muted">Pedido {orderNumber(order.id)}</span>
      </header>

      <h1 className="k-pay__title">Pagá con QR</h1>
      <p className="k-pay__sub">Pago simulado: no hace falta escanear, aprobalo acá abajo.</p>

      <div className="k-pay__amount" aria-label={`Total a pagar ${formatPrice(order.total)}`}>
        <span>Total</span>
        <strong>{formatPrice(order.total)}</strong>
        <small>
          {count} {count === 1 ? "producto" : "productos"}
        </small>
      </div>

      <div className="k-pay__qr">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`Código QR para pagar ${formatPrice(order.total)}`} width={300} height={300} />
        ) : (
          <span className="k-spinner" aria-label="Generando QR" />
        )}
      </div>

      <ul className="k-pay__items">
        {order.items.map((i) => (
          <li key={i.productId}>
            <span>
              {i.quantity} × {i.name}
            </span>
            <span>{formatPrice(i.unitPrice * i.quantity)}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="k-alert" role="alert">
          {error}
        </p>
      )}

      <div className="k-pay__actions">
        <Button block onClick={onPaid} disabled={busy}>
          {busy ? "Procesando…" : "Simular pago aprobado"}
        </Button>
        <Button block variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar y volver al menú
        </Button>
      </div>
      <p className="k-pay__note vc-muted">Demo: el pago es simulado, no se cobra nada.</p>
    </div>
  );
}
