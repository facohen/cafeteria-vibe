"use client";

import { useState, type FormEvent } from "react";
import { api, Button } from "@/components/ui";
import { ADMIN_LIMITS, type Category, type Product } from "@/lib/contracts";
import type { RunFn } from "./CatalogAdmin";

/** Columna de categorías: elegir, agregar, renombrar, reordenar y borrar (solo vacías, con aviso). */
export default function CategoryColumn({
  categories,
  products,
  selectedId,
  onSelect,
  run,
  onCreated,
  onDeleted,
}: {
  categories: Category[];
  products: Product[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  run: RunFn;
  onCreated: (c: Category) => void;
  onDeleted: (id: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<{ id: number; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const count = (id: number) => products.filter((p) => p.categoryId === id).length;

  async function guard(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* el aviso general muestra el error */
    } finally {
      setBusy(false);
    }
  }

  function add(e: FormEvent) {
    e.preventDefault();
    const name = newName;
    return guard(async () => {
      const r = await run(
        () => api<{ category: Category }>("/api/admin/categories", { json: { name } }),
        `Agregaste la categoría «${name.trim()}»`,
      );
      if (r) {
        setNewName("");
        onCreated(r.category);
      }
    });
  }

  function rename(e: FormEvent) {
    e.preventDefault();
    if (!renaming) return;
    const { id, name } = renaming;
    return guard(async () => {
      await run(
        () => api(`/api/admin/categories/${id}`, { method: "PATCH", json: { name } }),
        `Renombraste la categoría a «${name.trim()}»`,
      );
      setRenaming(null);
    });
  }

  /** Mueve una categoría un lugar y renumera el orden 0, 1, 2… (solo manda las que cambian). */
  function move(index: number, delta: -1 | 1) {
    const order = [...categories];
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    const changes = order.map((c, i) => ({ c, sort: i })).filter(({ c, sort }) => c.sort !== sort);
    return guard(() =>
      run(async () => {
        for (const { c, sort } of changes) {
          await api(`/api/admin/categories/${c.id}`, { method: "PATCH", json: { sort } });
        }
      }),
    );
  }

  function remove(c: Category) {
    return guard(async () => {
      await run(() => api(`/api/admin/categories/${c.id}`, { method: "DELETE" }), `Borraste la categoría «${c.name}»`);
      setConfirmDelete(null);
      onDeleted(c.id);
    });
  }

  return (
    <aside className="ac-cats" aria-label="Categorías">
      <h2>Categorías</h2>
      <ul className="ac-cats__list">
        {categories.map((c, i) => {
          const n = count(c.id);
          const on = c.id === selectedId;
          if (renaming?.id === c.id) {
            return (
              <li key={c.id} className="ac-cat ac-cat--on">
                <form className="ac-cat__rename" onSubmit={rename}>
                  <input
                    autoFocus
                    aria-label="Nuevo nombre de la categoría"
                    value={renaming.name}
                    maxLength={ADMIN_LIMITS.categoryName.max}
                    onChange={(e) => setRenaming({ id: c.id, name: e.target.value })}
                  />
                  <div className="ac-cat__tools">
                    <Button size="sm" type="submit" disabled={busy}>
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" type="button" onClick={() => setRenaming(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </li>
            );
          }
          return (
            <li key={c.id} className={`ac-cat ${on ? "ac-cat--on" : ""}`}>
              <button type="button" className="ac-cat__pick" onClick={() => onSelect(c.id)} aria-pressed={on}>
                <span className="ac-cat__name">{c.name}</span>
                <span className="ac-cat__count">{n}</span>
              </button>
              {on && (
                <div className="ac-cat__tools">
                  <button
                    type="button"
                    className="ac-iconbtn"
                    onClick={() => move(i, -1)}
                    disabled={busy || i === 0}
                    aria-label="Subir categoría"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="ac-iconbtn"
                    onClick={() => move(i, 1)}
                    disabled={busy || i === categories.length - 1}
                    aria-label="Bajar categoría"
                    title="Bajar"
                  >
                    ↓
                  </button>
                  <Button size="sm" variant="secondary" onClick={() => setRenaming({ id: c.id, name: c.name })}>
                    Renombrar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDelete(c.id)}>
                    Borrar
                  </Button>
                </div>
              )}
              {on && confirmDelete === c.id && (
                <div className="ac-confirm" role="alertdialog" aria-label="Confirmar borrado">
                  {n > 0 ? (
                    <>
                      <p>
                        No se puede borrar: «{c.name}» tiene {n} producto{n === 1 ? "" : "s"}. Pasalos a otra
                        categoría primero (o marcalos no disponibles).
                      </p>
                      <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(null)}>
                        Entendido
                      </Button>
                    </>
                  ) : (
                    <>
                      <p>¿Borrar «{c.name}»? No se puede deshacer.</p>
                      <div className="ac-cat__tools">
                        <Button size="sm" variant="danger" onClick={() => remove(c)} disabled={busy}>
                          Sí, borrar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                          No
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <form className="ac-cats__add" onSubmit={add}>
        <input
          aria-label="Nombre de la nueva categoría"
          placeholder="Nueva categoría"
          value={newName}
          maxLength={ADMIN_LIMITS.categoryName.max}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button size="sm" type="submit" disabled={busy || !newName.trim()}>
          Agregar
        </Button>
      </form>
    </aside>
  );
}
