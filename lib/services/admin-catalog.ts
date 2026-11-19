// Administración del catálogo (solo servidor, rol admin). Contrato: lib/contracts.ts §«Contratos de la tarea 2».
// Orden de chequeo: sesión → rol → existencia → validación.
import { getDb } from "@/lib/db";
import {
  ADMIN_LIMITS,
  AppError,
  ICON_KEYS,
  type Catalog,
  type Category,
  type IconKey,
  type Product,
  type SessionUser,
} from "@/lib/contracts";
import { requireRole } from "@/lib/services/auth";
import { toProduct } from "@/lib/services/catalog";

type ProductRow = Parameters<typeof toProduct>[0];
type Body = Record<string, unknown>;

const PRODUCT_COLS = "id, slug, category_id, name, description, price, icon, available, sort";

const invalid = (msg: string) => new AppError("VALIDATION", msg);

/** Acepta número o el string crudo de la URL; se valida DESPUÉS de sesión y rol. */
function validId(raw: unknown, notFound: string): number {
  const id = typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : raw;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new AppError("NOT_FOUND", notFound);
  }
  return id;
}

function asBody(input: unknown): Body {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Datos inválidos");
  }
  return input as Body;
}

/**
 * Texto recortado de largo min..max. Sin caracteres de control (\p{Cc}); `multiline` permite solo
 * saltos de línea (\r\n se normaliza a \n). Un texto con solo invisibles (\p{Cf}, p. ej. U+200B) cuenta como vacío.
 */
function text(v: unknown, label: string, min: number, max: number, multiline = false): string {
  if (typeof v !== "string") throw invalid(`${label}: tiene que ser texto`);
  const s = (multiline ? v.replace(/\r\n?/g, "\n") : v).trim();
  const control = multiline ? /(?!\n)\p{Cc}/u : /\p{Cc}/u;
  if (control.test(s)) {
    throw invalid(`${label}: no puede tener ${multiline ? "caracteres de control" : "saltos de línea ni caracteres de control"}`);
  }
  if (s.replace(/\p{Cf}/gu, "").trim().length < min) throw invalid(`${label}: no puede quedar vacío`);
  if (s.length > max) throw invalid(`${label}: máximo ${max} caracteres`);
  return s;
}

function sortValue(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) {
    throw invalid("Orden: tiene que ser un número entero desde 0");
  }
  return v;
}

function priceValue(v: unknown): number {
  const { minPrice, maxPrice } = ADMIN_LIMITS;
  if (typeof v !== "number" || !Number.isInteger(v) || v < minPrice || v > maxPrice) {
    throw invalid(`Precio: tiene que ser un número entero de pesos entre ${minPrice} y ${maxPrice.toLocaleString("es-AR")}`);
  }
  return v;
}

function iconValue(v: unknown): IconKey {
  if (typeof v !== "string" || !(ICON_KEYS as readonly string[]).includes(v)) throw invalid("Ícono inválido");
  return v as IconKey;
}

function boolValue(v: unknown, label: string): boolean {
  if (typeof v !== "boolean") throw invalid(`${label}: tiene que ser verdadero o falso`);
  return v;
}

function categoryIdValue(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v <= 0 || !loadCategory(v)) {
    throw invalid("Categoría inexistente");
  }
  return v;
}

/** Slug a partir del nombre: minúsculas, sin acentos, guiones; único en la tabla (sufijo -2, -3…). */
function uniqueSlug(table: "categories" | "products", name: string, fallback: string, exceptId?: number): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || fallback;
  const taken = getDb().prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id IS NOT ?`);
  let slug = base;
  for (let n = 2; taken.get(slug, exceptId ?? null); n++) slug = `${base}-${n}`;
  return slug;
}

function loadCategory(id: number): Category | null {
  return (getDb().prepare("SELECT id, slug, name, sort FROM categories WHERE id = ?").get(id) as Category | undefined) ?? null;
}

function loadProduct(id: number): Product | null {
  const row = getDb().prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?`).get(id) as ProductRow | undefined;
  return row ? toProduct(row) : null;
}

function nextCategorySort(): number {
  const r = getDb().prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM categories").get() as { n: number };
  return r.n;
}

function nextProductSort(categoryId: number): number {
  const r = getDb()
    .prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM products WHERE category_id = ?")
    .get(categoryId) as { n: number };
  return r.n;
}

// ---- Catálogo completo ----

export function getAdminCatalog(actor: SessionUser | null): Catalog {
  requireRole(actor, "admin");
  const db = getDb();
  const categories = db.prepare("SELECT id, slug, name, sort FROM categories ORDER BY sort, id").all() as Category[];
  const products = (
    db
      .prepare(
        `SELECT p.id, p.slug, p.category_id, p.name, p.description, p.price, p.icon, p.available, p.sort
         FROM products p JOIN categories c ON c.id = p.category_id
         ORDER BY c.sort, c.id, p.sort, p.id`,
      )
      .all() as ProductRow[]
  ).map(toProduct);
  return { categories, products };
}

// ---- Categorías ----

export function createCategory(actor: SessionUser | null, input: unknown): Category {
  requireRole(actor, "admin");
  const body = asBody(input);
  const name = text(body.name, "Nombre", 1, ADMIN_LIMITS.categoryNameMax);
  const sort = body.sort === undefined ? null : sortValue(body.sort);
  const db = getDb();
  const id = db.transaction(() => {
    const slug = uniqueSlug("categories", name, "categoria");
    const info = db
      .prepare("INSERT INTO categories (slug, name, sort) VALUES (?, ?, ?)")
      .run(slug, name, sort ?? nextCategorySort());
    return Number(info.lastInsertRowid);
  })();
  return loadCategory(id)!;
}

export function updateCategory(actor: SessionUser | null, id: unknown, patch: unknown): Category {
  requireRole(actor, "admin");
  const catId = validId(id, "Categoría no encontrada");
  const current = loadCategory(catId);
  if (!current) throw new AppError("NOT_FOUND", "Categoría no encontrada");
  const body = asBody(patch);
  // El slug se mantiene estable al renombrar (es un identificador, no un texto visible).
  const name = body.name === undefined ? current.name : text(body.name, "Nombre", 1, ADMIN_LIMITS.categoryNameMax);
  const sort = body.sort === undefined ? current.sort : sortValue(body.sort);
  getDb().prepare("UPDATE categories SET name = ?, sort = ? WHERE id = ?").run(name, sort, catId);
  return loadCategory(catId)!;
}

export function deleteCategory(actor: SessionUser | null, id: unknown): void {
  requireRole(actor, "admin");
  const catId = validId(id, "Categoría no encontrada");
  if (!loadCategory(catId)) throw new AppError("NOT_FOUND", "Categoría no encontrada");
  const db = getDb();
  db.transaction(() => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM products WHERE category_id = ?").get(catId) as { n: number };
    if (n > 0) {
      throw invalid(
        `La categoría tiene ${n} producto${n === 1 ? "" : "s"}: movelos a otra categoría antes de borrarla`,
      );
    }
    db.prepare("DELETE FROM categories WHERE id = ?").run(catId);
  })();
}

// ---- Productos ----

export function createProduct(actor: SessionUser | null, input: unknown): Product {
  requireRole(actor, "admin");
  const body = asBody(input);
  const categoryId = categoryIdValue(body.categoryId);
  const name = text(body.name, "Nombre", 1, ADMIN_LIMITS.productNameMax);
  const description =
    body.description === undefined ? "" : text(body.description, "Descripción", 0, ADMIN_LIMITS.descriptionMax, true);
  const price = priceValue(body.price);
  const icon = iconValue(body.icon);
  const available = body.available === undefined ? true : boolValue(body.available, "Disponible");
  const sort = body.sort === undefined ? null : sortValue(body.sort);
  const db = getDb();
  const id = db.transaction(() => {
    const slug = uniqueSlug("products", name, "producto");
    const info = db
      .prepare(
        `INSERT INTO products (slug, category_id, name, description, price, icon, available, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(slug, categoryId, name, description, price, icon, available ? 1 : 0, sort ?? nextProductSort(categoryId));
    return Number(info.lastInsertRowid);
  })();
  return loadProduct(id)!;
}

export function updateProduct(actor: SessionUser | null, id: unknown, patch: unknown): Product {
  requireRole(actor, "admin");
  const prodId = validId(id, "Producto no encontrado");
  const current = loadProduct(prodId);
  if (!current) throw new AppError("NOT_FOUND", "Producto no encontrado");
  const body = asBody(patch);
  const categoryId = body.categoryId === undefined ? current.categoryId : categoryIdValue(body.categoryId);
  const name = body.name === undefined ? current.name : text(body.name, "Nombre", 1, ADMIN_LIMITS.productNameMax);
  const description =
    body.description === undefined
      ? current.description
      : text(body.description, "Descripción", 0, ADMIN_LIMITS.descriptionMax, true);
  const price = body.price === undefined ? current.price : priceValue(body.price);
  const icon = body.icon === undefined ? current.icon : iconValue(body.icon);
  const available = body.available === undefined ? current.available : boolValue(body.available, "Disponible");
  const db = getDb();
  db.transaction(() => {
    // Si cambia de categoría sin orden explícito, va al final de la nueva.
    const sort =
      body.sort !== undefined
        ? sortValue(body.sort)
        : categoryId !== current.categoryId
          ? nextProductSort(categoryId)
          : current.sort;
    db.prepare(
      `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, icon = ?, available = ?, sort = ?
       WHERE id = ?`,
    ).run(categoryId, name, description, price, icon, available ? 1 : 0, sort, prodId);
  })();
  return loadProduct(prodId)!;
}
