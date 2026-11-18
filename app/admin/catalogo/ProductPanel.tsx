"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ProductIcon } from "@/components/icons";
import { api, Button } from "@/components/ui";
import { ADMIN_LIMITS, ICON_KEYS, ICON_LABEL, type Category, type IconKey, type Product } from "@/lib/contracts";
import type { RunFn } from "./CatalogAdmin";

/**
 * Panel para crear o editar un producto. La validación real la hace el servidor; acá solo se
 * convierten los números y se muestra el error que devuelve la API.
 */
export default function ProductPanel({
  product,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
  run,
}: {
  product: Product | null;
  categories: Category[];
  defaultCategoryId: number;
  onClose: () => void;
  onSaved: (p: Product, isNew: boolean) => void;
  run: RunFn;
}) {
  const isNew = product === null;
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCategoryId);
  const [sort, setSort] = useState(product ? String(product.sort) : "");
  const [icon, setIcon] = useState<IconKey>(product?.icon ?? "generico");
  const [available, setAvailable] = useState(product?.available ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** "3400" -> 3400; texto no numérico se manda tal cual para que el servidor lo rechace. */
  const num = (s: string): unknown => (s.trim() !== "" && !Number.isNaN(Number(s)) ? Number(s) : s);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = { name, description, price: num(price), categoryId, icon, available };
    if (sort.trim() !== "") body.sort = num(sort);
    setBusy(true);
    try {
      const r = await run(
        () =>
          isNew
            ? api<{ product: Product }>("/api/admin/products", { json: body })
            : api<{ product: Product }>(`/api/admin/products/${product.id}`, { method: "PATCH", json: body }),
        undefined,
        true,
      );
      if (r) onSaved(r.product, isNew);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ac-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ac-panel" role="dialog" aria-modal="true" aria-labelledby="ac-panel-title">
        <div className="ac-panel__head">
          <span className="ac-panel__preview">
            <ProductIcon icon={icon} size={64} />
          </span>
          <h2 id="ac-panel-title">{isNew ? "Nuevo producto" : `Editar «${product.name}»`}</h2>
          <button type="button" className="ac-iconbtn" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form className="ad-form" onSubmit={submit}>
          <label className="ad-field">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={ADMIN_LIMITS.productName.max}
              autoFocus={isNew}
              required
            />
          </label>
          <label className="ad-field">
            Descripción <span className="vc-muted ac-hint">(opcional, hasta {ADMIN_LIMITS.productDescription.max} caracteres)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={ADMIN_LIMITS.productDescription.max}
            />
          </label>
          <div className="ac-row">
            <label className="ad-field">
              Precio ($)
              <input
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="3400"
                required
              />
            </label>
            <label className="ad-field">
              Categoría
              <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="ad-field">
              Orden
              <input
                inputMode="numeric"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                placeholder="Al final"
              />
            </label>
          </div>

          <fieldset className="ac-icons">
            <legend>Ícono</legend>
            <div className="ac-icons__grid" role="radiogroup" aria-label="Ícono">
              {ICON_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={icon === k}
                  className={`ac-iconopt ${icon === k ? "ac-iconopt--on" : ""}`}
                  onClick={() => setIcon(k)}
                >
                  <ProductIcon icon={k} size={48} />
                  <span>{ICON_LABEL[k]}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            role="switch"
            aria-checked={available}
            className={`ad-switch ${available ? "ad-switch--on" : ""}`}
            onClick={() => setAvailable(!available)}
          >
            <span className="ad-switch__track" aria-hidden />
            {available ? "Disponible en el kiosco" : "No disponible en el kiosco"}
          </button>

          {error && (
            <p className="vc-error" role="alert">
              {error}
            </p>
          )}

          <div className="ad-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando…" : isNew ? "Agregar producto" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
