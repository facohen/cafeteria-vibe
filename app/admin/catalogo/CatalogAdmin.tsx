"use client";
// Administración del catálogo: productos por categoría (disponibilidad de un toque, precio rápido),
// formulario de producto y gestión de categorías. Todo se valida de nuevo en el servidor.
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, Button, Card, formatPrice } from "@/components/ui";
import { ProductIcon } from "@/components/icons";
import { ADMIN_LIMITS, ICON_KEYS, type Catalog, type Category, type IconKey, type Product } from "@/lib/contracts";

const ICON_LABEL: Record<IconKey, string> = {
  espresso: "Espresso",
  cortado: "Cortado",
  latte: "Latte",
  cappuccino: "Cappuccino",
  te: "Té",
  jugo: "Jugo",
  medialuna: "Medialuna",
  tostado: "Tostado",
  budin: "Budín",
  generico: "Genérico",
  americano: "Americano",
  mocha: "Mocha",
  frio: "Frío",
  chocolate: "Chocolate",
  limonada: "Limonada",
  agua: "Agua",
  alfajor: "Alfajor",
  cookie: "Cookie",
  muffin: "Muffin",
};

type Msg = { kind: "ok" | "error"; text: string } | null;
type FormState = { mode: "new"; categoryId?: number } | { mode: "edit"; product: Product } | null;
type ApiErr = Error & { status?: number };

export default function CatalogAdmin({ initial }: { initial: Catalog }) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog>(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [form, setForm] = useState<FormState>(null);
  const [showCats, setShowCats] = useState(false);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);
  // Cambios de disponibilidad en vuelo: se reaplican sobre cualquier recarga para que un GET
  // concurrente (de otra acción) no pise el estado optimista.
  const pending = useRef<Map<number, boolean>>(new Map());
  // Solo se aplica la respuesta de la recarga más reciente (evita que una vieja pise a una nueva).
  const reloadSeq = useRef(0);

  useEffect(() => {
    if (msg?.kind !== "ok") return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (form) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [form]);

  function fail(e: unknown) {
    const err = e as ApiErr;
    if (err.status === 401) {
      router.replace("/personal");
      return;
    }
    setMsg({ kind: "error", text: err.message || "No se pudo guardar" });
  }

  async function reload() {
    const seq = ++reloadSeq.current;
    const fresh = await api<Catalog>("/api/admin/catalog");
    if (seq !== reloadSeq.current) return;
    const pend = pending.current;
    setCatalog(
      pend.size === 0
        ? fresh
        : { ...fresh, products: fresh.products.map((p) => (pend.has(p.id) ? { ...p, available: pend.get(p.id)! } : p)) },
    );
  }

  /**
   * Ejecuta un cambio y SIEMPRE recarga el catálogo (también si falló a mitad, p. ej. el orden de
   * categorías con varios PATCH), para que la pantalla refleje la base. Devuelve true si el cambio salió bien.
   */
  async function run(fn: () => Promise<unknown>, okText: string): Promise<boolean> {
    let ok = false;
    try {
      await fn();
      ok = true;
    } catch (e) {
      fail(e);
    }
    try {
      await reload();
      if (ok) setMsg({ kind: "ok", text: okText });
    } catch (e) {
      if (ok) fail(e); // si el cambio ya falló, se deja ese error a la vista
    }
    return ok;
  }

  function setBusyId(id: number, on: boolean) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function toggleAvailable(p: Product) {
    const available = !p.available;
    setBusyId(p.id, true);
    // Optimista: cambia ya; al terminar (bien o mal) se recarga desde la base.
    pending.current.set(p.id, available);
    setCatalog((c) => ({ ...c, products: c.products.map((x) => (x.id === p.id ? { ...x, available } : x)) }));
    let ok = false;
    try {
      await api(`/api/admin/products/${p.id}`, { method: "PATCH", json: { available } });
      ok = true;
    } catch (e) {
      fail(e);
    }
    pending.current.delete(p.id);
    try {
      await reload();
      if (ok) setMsg({ kind: "ok", text: `${p.name}: ${available ? "disponible" : "no disponible"}` });
    } catch (e) {
      if (ok) fail(e);
      else setCatalog((c) => ({ ...c, products: c.products.map((x) => (x.id === p.id ? { ...x, available: p.available } : x)) }));
    } finally {
      setBusyId(p.id, false);
    }
  }

  const savePrice = (p: Product, price: number | null) =>
    run(
      () => api(`/api/admin/products/${p.id}`, { method: "PATCH", json: { price } }),
      `${p.name}: nuevo precio ${formatPrice(price ?? 0)}`,
    );

  const total = catalog.products.length;
  const off = catalog.products.filter((p) => !p.available).length;

  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="ad-title">Catálogo</h1>
          <p className="vc-muted adc-sub">
            {total} producto{total === 1 ? "" : "s"} en {catalog.categories.length} categoría
            {catalog.categories.length === 1 ? "" : "s"}
            {off > 0 && ` · ${off} no disponible${off === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="ad-actions">
          <Button variant="secondary" size="sm" onClick={() => setShowCats((v) => !v)} aria-expanded={showCats}>
            {showCats ? "Cerrar categorías" : "Categorías"}
          </Button>
          <Button size="sm" onClick={() => setForm({ mode: "new" })} disabled={catalog.categories.length === 0}>
            + Nuevo producto
          </Button>
        </div>
      </div>

      {showCats && <CategoriesPanel catalog={catalog} run={run} />}

      {form && (
        <div ref={formRef} className="adc-anchor">
          <ProductForm
            key={form.mode === "edit" ? `e${form.product.id}` : `n${form.categoryId ?? ""}`}
            state={form}
            categories={catalog.categories}
            onCancel={() => setForm(null)}
            onSaved={async (text) => {
              setForm(null);
              try {
                await reload();
                setMsg({ kind: "ok", text });
              } catch (e) {
                fail(e); // no tapar el error con el aviso de éxito
              }
            }}
            onAuthLost={() => router.replace("/personal")}
          />
        </div>
      )}

      {catalog.categories.length === 0 && (
        <Card className="adc-empty">
          <p className="vc-muted">Todavía no hay categorías. Creá la primera desde «Categorías».</p>
        </Card>
      )}

      {catalog.categories.map((cat) => {
        const items = catalog.products.filter((p) => p.categoryId === cat.id);
        return (
          <section key={cat.id} className="adc-cat" aria-labelledby={`adc-cat-${cat.id}`}>
            <div className="adc-cat__head">
              <h2 id={`adc-cat-${cat.id}`} className="ad-section-title">
                {cat.name} <span className="vc-muted adc-count">{items.length}</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setForm({ mode: "new", categoryId: cat.id })}>
                + Agregar acá
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="vc-muted adc-none">Sin productos todavía.</p>
            ) : (
              <ul className="adc-list">
                {items.map((p) => (
                  <li key={p.id} className={`adc-item ${p.available ? "" : "adc-item--off"}`}>
                    <ProductIcon icon={p.icon} size={56} />
                    <div className="adc-item__text">
                      <span className="adc-item__name">{p.name}</span>
                      {p.description && <span className="vc-muted adc-item__desc">{p.description}</span>}
                    </div>
                    <PriceEditor product={p} onSave={savePrice} />
                    <Switch
                      on={p.available}
                      disabled={busy.has(p.id)}
                      label={`${p.name} disponible`}
                      onToggle={() => toggleAvailable(p)}
                    />
                    <Button variant="secondary" size="sm" onClick={() => setForm({ mode: "edit", product: p })}>
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {msg && (
        <div className={`adc-toast adc-toast--${msg.kind}`} role={msg.kind === "error" ? "alert" : "status"}>
          <span>{msg.text}</span>
          <button type="button" className="adc-toast__close" onClick={() => setMsg(null)} aria-label="Cerrar aviso">
            ×
          </button>
        </div>
      )}
    </>
  );
}

// ---- Interruptor de disponibilidad (un toque) ----

function Switch({ on, disabled, label, onToggle }: { on: boolean; disabled?: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`adc-switch ${on ? "adc-switch--on" : ""}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <span className="adc-switch__track" aria-hidden>
        <span className="adc-switch__knob" />
      </span>
      <span className="adc-switch__text">{on ? "Disponible" : "No disponible"}</span>
    </button>
  );
}

// ---- Precio rápido ----

function PriceEditor({ product, onSave }: { product: Product; onSave: (p: Product, price: number | null) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(product.price));
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        className="adc-price"
        onClick={() => {
          setValue(String(product.price));
          setEditing(true);
        }}
        aria-label={`Cambiar precio de ${product.name} (${formatPrice(product.price)})`}
      >
        {formatPrice(product.price)}
        <span className="adc-price__hint" aria-hidden>
          editar
        </span>
      </button>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const price = value.trim() === "" ? NaN : Number(value);
    if (price === product.price) {
      setEditing(false);
      return;
    }
    setSaving(true);
    // El servidor valida entero y rango; si rechaza, el aviso muestra el motivo y queda abierto.
    const ok = await onSave(product, Number.isFinite(price) ? price : null);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <form className="adc-price-form" onSubmit={submit}>
      <span aria-hidden className="adc-price-form__sign">$</span>
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        min={ADMIN_LIMITS.minPrice}
        max={ADMIN_LIMITS.maxPrice}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        aria-label={`Nuevo precio de ${product.name}`}
      />
      <Button size="sm" type="submit" disabled={saving}>
        {saving ? "…" : "OK"}
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
        Cancelar
      </Button>
    </form>
  );
}

// ---- Formulario de producto (alta y edición) ----

function ProductForm({
  state,
  categories,
  onCancel,
  onSaved,
  onAuthLost,
}: {
  state: NonNullable<FormState>;
  categories: Category[];
  onCancel: () => void;
  onSaved: (text: string) => void;
  onAuthLost: () => void;
}) {
  const editing = state.mode === "edit" ? state.product : null;
  const [categoryId, setCategoryId] = useState<number>(
    editing?.categoryId ?? (state.mode === "new" ? state.categoryId : undefined) ?? categories[0]?.id ?? 0,
  );
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [icon, setIcon] = useState<IconKey>(editing?.icon ?? "generico");
  const [available, setAvailable] = useState(editing?.available ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = price.trim() === "" ? NaN : Number(price);
    const full = {
      categoryId,
      name,
      description,
      price: Number.isFinite(n) ? n : null, // el servidor rechaza vacío / no numérico
      icon,
      available,
    };
    // En edición solo se mandan los campos que cambiaron respecto del producto al abrir el formulario,
    // para no deshacer cambios hechos mientras tanto (interruptor o precio rápido).
    let body: Partial<typeof full> = full;
    if (editing) {
      body = {};
      if (categoryId !== editing.categoryId) body.categoryId = categoryId;
      if (name !== editing.name) body.name = name;
      if (description !== editing.description) body.description = description;
      if (full.price !== editing.price) body.price = full.price;
      if (icon !== editing.icon) body.icon = icon;
      if (available !== editing.available) body.available = available;
      if (Object.keys(body).length === 0) return onCancel();
    }
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/admin/products/${editing.id}`, { method: "PATCH", json: body });
        onSaved(`Guardaste ${name.trim()}`);
      } else {
        await api("/api/admin/products", { method: "POST", json: body });
        onSaved(`Agregaste ${name.trim()}`);
      }
    } catch (err) {
      const e2 = err as ApiErr;
      if (e2.status === 401) return onAuthLost();
      setError(e2.message || "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <Card className="adc-form">
      <form onSubmit={submit} className="adc-form__inner">
        <h2 className="ad-section-title">{editing ? `Editar ${editing.name}` : "Nuevo producto"}</h2>
        <div className="ad-form">
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
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={ADMIN_LIMITS.productNameMax}
              placeholder="Ej.: Flat white"
              autoFocus={!editing}
            />
          </label>
          <label className="ad-field">
            Precio (pesos)
            <input
              type="number"
              inputMode="numeric"
              min={ADMIN_LIMITS.minPrice}
              max={ADMIN_LIMITS.maxPrice}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="3400"
            />
          </label>
        </div>
        <label className="ad-field">
          Descripción <span className="vc-muted adc-optional">(opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={ADMIN_LIMITS.descriptionMax}
            placeholder="Una línea que ayude a elegir"
          />
        </label>

        <fieldset className="adc-icons">
          <legend className="ad-field">Ícono</legend>
          <div className="adc-icons__grid">
            {ICON_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={`adc-icon ${icon === k ? "adc-icon--on" : ""}`}
                aria-pressed={icon === k}
                onClick={() => setIcon(k)}
              >
                <ProductIcon icon={k} size={52} />
                <span>{ICON_LABEL[k]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="ad-check">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          Disponible en el kiosco
        </label>

        {error && (
          <p className="ad-msg vc-error" role="alert">
            {error}
          </p>
        )}
        <div className="adc-form__actions">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar producto"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---- Categorías: alta, renombrar, orden, borrar si está vacía ----

function CategoriesPanel({
  catalog,
  run,
}: {
  catalog: Catalog;
  run: (fn: () => Promise<unknown>, okText: string) => Promise<boolean>;
}) {
  const [newName, setNewName] = useState("");
  const [moving, setMoving] = useState(false);
  const cats = catalog.categories;

  async function add(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const ok = await run(() => api("/api/admin/categories", { method: "POST", json: { name: newName } }), `Agregaste la categoría ${name}`);
    if (ok) setNewName("");
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= cats.length) return;
    const order = [...cats];
    [order[index], order[target]] = [order[target], order[index]];
    setMoving(true);
    // Renumera 0..n-1 y solo manda las que cambian.
    await run(async () => {
      for (let i = 0; i < order.length; i++) {
        if (order[i].sort !== i) {
          await api(`/api/admin/categories/${order[i].id}`, { method: "PATCH", json: { sort: i } });
        }
      }
    }, "Orden actualizado");
    setMoving(false);
  }

  return (
    <Card className="adc-cats">
      <h2 className="ad-section-title">Categorías</h2>
      <p className="vc-muted adc-sub">El orden es el mismo que ve el cliente en el kiosco.</p>
      <ul className="adc-cats__list">
        {cats.map((c, i) => (
          <CategoryRow
            key={`${c.id}:${c.name}`}
            category={c}
            count={catalog.products.filter((p) => p.categoryId === c.id).length}
            first={i === 0}
            last={i === cats.length - 1}
            moving={moving}
            onMove={(d) => move(i, d)}
            run={run}
          />
        ))}
      </ul>
      <form className="adc-cats__add" onSubmit={add}>
        <label className="ad-field">
          Nueva categoría
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={ADMIN_LIMITS.categoryNameMax}
            placeholder="Ej.: Sin TACC"
          />
        </label>
        <Button type="submit" size="sm">
          Agregar categoría
        </Button>
      </form>
    </Card>
  );
}

function CategoryRow({
  category,
  count,
  first,
  last,
  moving,
  onMove,
  run,
}: {
  category: Category;
  count: number;
  first: boolean;
  last: boolean;
  moving: boolean;
  onMove: (delta: -1 | 1) => void;
  run: (fn: () => Promise<unknown>, okText: string) => Promise<boolean>;
}) {
  const [name, setName] = useState(category.name);
  const [confirming, setConfirming] = useState(false);
  const changed = name.trim() !== category.name;

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!changed) return;
    await run(
      () => api(`/api/admin/categories/${category.id}`, { method: "PATCH", json: { name } }),
      `Renombraste la categoría a ${name.trim()}`,
    );
  }

  return (
    <li className="adc-catrow">
      <div className="adc-catrow__order">
        <Button variant="secondary" size="sm" type="button" disabled={first || moving} onClick={() => onMove(-1)} aria-label={`Subir ${category.name}`}>
          ↑
        </Button>
        <Button variant="secondary" size="sm" type="button" disabled={last || moving} onClick={() => onMove(1)} aria-label={`Bajar ${category.name}`}>
          ↓
        </Button>
      </div>
      <form className="adc-catrow__name" onSubmit={rename}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={ADMIN_LIMITS.categoryNameMax}
          aria-label={`Nombre de la categoría ${category.name}`}
        />
        {changed && (
          <Button type="submit" size="sm">
            Guardar
          </Button>
        )}
      </form>
      <span className="vc-muted adc-catrow__count">
        {count} producto{count === 1 ? "" : "s"}
      </span>
      <div className="adc-catrow__del">
        {confirming ? (
          <>
            <span className="adc-catrow__ask">¿Borrar «{category.name}»?</span>
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={async () => {
                await run(() => api(`/api/admin/categories/${category.id}`, { method: "DELETE" }), `Borraste la categoría ${category.name}`);
                setConfirming(false);
              }}
            >
              Sí, borrar
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setConfirming(false)}>
              No
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={count > 0}
            title={count > 0 ? "Solo se puede borrar una categoría vacía" : undefined}
            onClick={() => setConfirming(true)}
          >
            Borrar
          </Button>
        )}
      </div>
    </li>
  );
}
