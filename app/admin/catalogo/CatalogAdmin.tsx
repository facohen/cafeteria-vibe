"use client";

import { useState } from "react";
import { api, Button } from "@/components/ui";
import type { Catalog, Category, Product } from "@/lib/contracts";
import CategoryColumn from "./CategoryColumn";
import ProductCard from "./ProductCard";
import ProductPanel from "./ProductPanel";

type ApiErr = Error & { status?: number };

/** Pantalla de catálogo: columna de categorías + tarjetas de productos de la categoría elegida. */
export default function CatalogAdmin({ initial }: { initial: Catalog }) {
  const [catalog, setCatalog] = useState<Catalog>(initial);
  const [selectedId, setSelectedId] = useState<number | null>(initial.categories[0]?.id ?? null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const selected = catalog.categories.find((c) => c.id === selectedId) ?? null;
  const products = catalog.products.filter((p) => p.categoryId === selected?.id);

  async function reload(): Promise<Catalog> {
    const fresh = await api<Catalog>("/api/admin/catalog");
    setCatalog(fresh);
    return fresh;
  }

  /** Corre una operación contra la API; si la sesión ya no sirve, vuelve a la entrada del personal. */
  async function run<T>(fn: () => Promise<T>, ok?: string, local?: boolean): Promise<T | undefined> {
    setError(null);
    setNotice(null);
    try {
      const r = await fn();
      await reload();
      if (ok) setNotice(ok);
      return r;
    } catch (e) {
      const err = e as ApiErr;
      if (err.status === 401 || err.status === 403) {
        window.location.href = "/personal";
        return undefined;
      }
      if (!local) setError(err.message);
      // Puede haber quedado a medias (p. ej. reordenar): refrescar para mostrar lo real.
      reload().catch(() => {});
      throw err;
    }
  }

  async function toggle(p: Product) {
    setBusyId(p.id);
    try {
      await run(
        () => api(`/api/admin/products/${p.id}`, { method: "PATCH", json: { available: !p.available } }),
        `«${p.name}» ${p.available ? "ya no se ofrece en el kiosco" : "vuelve a estar disponible"}`,
      );
    } catch {
      /* el error ya se muestra */
    } finally {
      setBusyId(null);
    }
  }

  function onCategoryCreated(c: Category) {
    setSelectedId(c.id);
  }

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>Catálogo</h1>
          <p className="vc-muted ac-sub">Los cambios se ven en el kiosco al volver a abrir el menú.</p>
        </div>
        <Button onClick={() => setEditing("new")} disabled={catalog.categories.length === 0}>
          + Nuevo producto
        </Button>
      </div>

      {(error || notice) && (
        <div className={`ac-msg ${error ? "ac-msg--error" : ""}`} role={error ? "alert" : "status"}>
          <span className={error ? "vc-error" : "ad-ok"}>{error ?? notice}</span>
          <button className="ac-msg__close" onClick={() => (setError(null), setNotice(null))} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}

      <div className="ac-layout">
        <CategoryColumn
          categories={catalog.categories}
          products={catalog.products}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          run={run}
          onCreated={onCategoryCreated}
          onDeleted={(id) => {
            if (id === selectedId) setSelectedId(catalog.categories.find((c) => c.id !== id)?.id ?? null);
          }}
        />

        <section className="ac-products" aria-label="Productos">
          {selected ? (
            <>
              <div className="ac-products__head">
                <h2>{selected.name}</h2>
                <span className="vc-muted">
                  {products.length} producto{products.length === 1 ? "" : "s"} ·{" "}
                  {products.filter((p) => p.available).length} disponible
                  {products.filter((p) => p.available).length === 1 ? "" : "s"}
                </span>
              </div>
              {products.length === 0 ? (
                <div className="ac-empty">
                  <p>Esta categoría todavía no tiene productos.</p>
                  <Button variant="secondary" size="sm" onClick={() => setEditing("new")}>
                    + Agregar el primero
                  </Button>
                </div>
              ) : (
                <div className="ac-grid">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      busy={busyId === p.id}
                      onToggle={() => toggle(p)}
                      onEdit={() => setEditing(p)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="ac-empty">
              <p>Creá una categoría para empezar a cargar productos.</p>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <ProductPanel
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          categories={catalog.categories}
          defaultCategoryId={selected?.id ?? catalog.categories[0]?.id ?? 0}
          onClose={() => setEditing(null)}
          onSaved={(p, isNew) => {
            setEditing(null);
            setSelectedId(p.categoryId);
            setNotice(isNew ? `Listo, agregaste «${p.name}»` : `Guardaste los cambios de «${p.name}»`);
          }}
          run={run}
        />
      )}
    </>
  );
}

/** `local`: el error lo muestra quien llama (p. ej. el panel), no el aviso general. Siempre relanza. */
export type RunFn = <T>(fn: () => Promise<T>, ok?: string, local?: boolean) => Promise<T | undefined>;
