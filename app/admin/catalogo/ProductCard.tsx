"use client";

import { ProductIcon } from "@/components/icons";
import { Button, formatPrice } from "@/components/ui";
import type { Product } from "@/lib/contracts";

/** Tarjeta de producto: ícono, nombre, precio, interruptor «Disponible» de un toque y «Editar». */
export default function ProductCard({
  product: p,
  busy,
  onToggle,
  onEdit,
}: {
  product: Product;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={`ac-card ${p.available ? "" : "ac-card--off"}`}>
      <div className="ac-card__top">
        <span className="ac-card__icon">
          <ProductIcon icon={p.icon} size={72} />
        </span>
        <div className="ac-card__info">
          <h3>{p.name}</h3>
          <span className="ac-card__price">{formatPrice(p.price)}</span>
          {p.description && <p className="vc-muted ac-card__desc">{p.description}</p>}
        </div>
      </div>
      <div className="ac-card__bottom">
        <button
          type="button"
          role="switch"
          aria-checked={p.available}
          className={`ad-switch ${p.available ? "ad-switch--on" : ""}`}
          onClick={onToggle}
          disabled={busy}
        >
          <span className="ad-switch__track" aria-hidden />
          {p.available ? "Disponible" : "No disponible"}
        </button>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </article>
  );
}
