"use client";
import { useState } from "react";
import type { Catalog, Product, User } from "@/lib/contracts";
import { LIMITS } from "@/lib/contracts";
import { Brand, Button, formatPrice } from "@/components/ui";
import { ProductIcon } from "@/components/icons";

export type Cart = Record<number, number>; // productId -> cantidad

/** Paso (c): menú por categorías + carrito fijo abajo. */
export function Menu({
  user,
  catalog,
  cart,
  onAdd,
  onChange,
  onPay,
  onLogout,
  busy,
  error,
  onDismissError,
}: {
  user: User;
  catalog: Catalog;
  cart: Cart;
  onAdd: (p: Product) => void;
  onChange: (productId: number, quantity: number) => void;
  onPay: () => void;
  onLogout: () => void;
  busy: boolean;
  error: string | null;
  onDismissError: () => void;
}) {
  const categories = [...catalog.categories].sort((a, b) => a.sort - b.sort);
  const [catId, setCatId] = useState<number | null>(categories[0]?.id ?? null);
  const activeCat = categories.find((c) => c.id === catId) ?? categories[0];
  const products = catalog.products
    .filter((p) => p.categoryId === activeCat?.id)
    .sort((a, b) => a.sort - b.sort);

  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  const lines = Object.entries(cart)
    .map(([id, q]) => ({ product: byId.get(Number(id)), quantity: q }))
    .filter((l): l is { product: Product; quantity: number } => !!l.product && l.quantity > 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const estimate = lines.reduce((s, l) => s + l.quantity * l.product.price, 0);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="k-menu">
      <header className="k-menu__head">
        <Brand />
        <div className="k-menu__user">
          <span>
            Hola, <strong>{firstName}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={onLogout} disabled={busy}>
            Salir
          </Button>
        </div>
      </header>

      <h1 className="k-menu__title">¿Qué vas a tomar hoy?</h1>

      <div className="k-menu__body">
        <nav className="k-cats" aria-label="Categorías">
          {categories.map((c) => {
            const first = catalog.products.find((p) => p.categoryId === c.id);
            return (
              <button
                key={c.id}
                type="button"
                className={`k-cat ${c.id === activeCat?.id ? "is-active" : ""}`}
                aria-pressed={c.id === activeCat?.id}
                onClick={() => setCatId(c.id)}
              >
                <ProductIcon icon={first?.icon ?? "generico"} size={52} />
                <span>{c.name}</span>
              </button>
            );
          })}
        </nav>

        <section className="k-grid" aria-label={activeCat?.name ?? "Productos"}>
          {products.length === 0 && <p className="vc-muted">No hay productos en esta categoría.</p>}
          {products.map((p) => {
            const inCart = cart[p.id] ?? 0;
            const atMax = inCart >= LIMITS.maxQuantity;
            return (
              <button
                key={p.id}
                type="button"
                className={`k-product ${p.available ? "" : "is-off"} ${inCart ? "is-in" : ""}`}
                onClick={() => onAdd(p)}
                disabled={!p.available || atMax || busy}
                aria-label={`${p.name}, ${formatPrice(p.price)}${p.available ? "" : ", sin stock hoy"}`}
              >
                {inCart > 0 && <span className="k-product__qty">{inCart}</span>}
                <ProductIcon icon={p.icon} size={112} />
                <span className="k-product__name">{p.name}</span>
                {p.description && <span className="k-product__desc">{p.description}</span>}
                {p.available ? (
                  <span className="k-product__price">
                    {formatPrice(p.price)}
                    <span className="k-product__plus" aria-hidden>
                      +
                    </span>
                  </span>
                ) : (
                  <span className="k-product__off">Sin stock hoy</span>
                )}
              </button>
            );
          })}
        </section>
      </div>

      <section className="k-cart" aria-label="Tu pedido">
        {error && (
          <div className="k-alert" role="alert">
            <span>{error}</span>
            <button type="button" className="k-alert__x" onClick={onDismissError} aria-label="Cerrar aviso">
              ×
            </button>
          </div>
        )}
        {lines.length === 0 ? (
          <p className="k-cart__empty">Tocá un producto para sumarlo a tu pedido.</p>
        ) : (
          <ul className="k-cart__lines">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="k-line">
                <ProductIcon icon={product.icon} size={44} />
                <span className="k-line__name">
                  {product.name}
                  {!product.available && <em className="k-line__warn"> · ya no está disponible</em>}
                </span>
                <span className="k-stepper">
                  <button
                    type="button"
                    onClick={() => onChange(product.id, quantity - 1)}
                    aria-label={`Quitar un ${product.name}`}
                    disabled={busy}
                  >
                    −
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => onChange(product.id, quantity + 1)}
                    aria-label={`Sumar un ${product.name}`}
                    disabled={busy || quantity >= LIMITS.maxQuantity || !product.available}
                  >
                    +
                  </button>
                </span>
                <span className="k-line__price">{formatPrice(product.price * quantity)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="k-cart__bar">
          <div className="k-cart__sum">
            <span className="k-cart__count">
              {count} {count === 1 ? "producto" : "productos"}
            </span>
            <span className="k-cart__total">{formatPrice(estimate)}</span>
          </div>
          <Button className="k-cart__pay" onClick={onPay} disabled={count === 0 || busy}>
            {busy ? "Un momento…" : "Pagar"}
          </Button>
        </div>
      </section>
    </div>
  );
}
