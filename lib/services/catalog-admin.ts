// Administración del catálogo (solo servidor). Contrato: lib/contracts.ts «Contratos de la tarea 2»
// y docs/TECNICO.md §Contratos. Orden de chequeo: sesión → rol → id → existencia → cuerpo.
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

const bad = (msg: string) => new AppError("VALIDATION", msg);

/** Acepta número o el string crudo de la URL; se valida DESPUÉS de sesión y rol. */
function validId(raw: unknown, what: string): number {
  const id = typeof raw === "string" && /^\d{1,15}$/.test(raw) ? Number(raw) : raw;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) throw bad(`${what}: id inválido`);
  return id;
}

function asBody(input: unknown): Body {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw bad("El cuerpo debe ser un objeto JSON");
  }
  return input as Body;
}

function text(v: unknown, label: string, { min = 0, max }: { min?: number; max: number }): string {
  if (typeof v !== "string") throw bad(`${label}: tiene que ser texto`);
  const t = v.trim();
  if (t.length < min) throw bad(min <= 1 ? `${label}: no puede estar vacío` : `${label}: mínimo ${min} caracteres`);
  if (t.length > max) throw bad(`${label}: máximo ${max} caracteres`);
  return t;
}

function int(v: unknown, label: string, { min, max }: { min: number; max: number }): number {
  if (typeof v !== "number" || !Number.isInteger(v)) throw bad(`${label}: tiene que ser un número entero`);
  if (v < min || v > max) throw bad(`${label}: tiene que estar entre ${min} y ${max}`);
  return v;
}

function bool(v: unknown, label: string): boolean {
  if (typeof v !== "boolean") throw bad(`${label}: tiene que ser verdadero o falso`);
  return v;
}

function icon(v: unknown): IconKey {
  if (typeof v !== "string" || !(ICON_KEYS as readonly string[]).includes(v)) throw bad("Ícono inexistente");
  return v as IconKey;
}

const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k) && b[k] !== undefined;

/** Slug del nombre: minúsculas, sin acentos, guiones; único en la tabla con sufijo -2, -3... */
function uniqueSlug(table: "categories" | "products", name: string, fallback: string): string {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || fallback;
  const exists = getDb().prepare(`SELECT 1 FROM ${table} WHERE slug = ?`);
  let slug = base;
  for (let n = 2; exists.get(slug); n++) slug = `${base}-${n}`;
  return slug;
}

function loadCategory(id: number): Category | undefined {
  return getDb().prepare("SELECT id, slug, name, sort FROM categories WHERE id = ?").get(id) as Category | undefined;
}

function loadProduct(id: number): Product | undefined {
  const row = getDb().prepare(`SELECT ${PRODUCT_COLS} FROM products WHERE id = ?`).get(id) as ProductRow | undefined;
  return row && toProduct(row);
}

function categoryIdOf(v: unknown): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v <= 0 || !loadCategory(v)) {
    throw bad("La categoría no existe");
  }
  return v;
}

function nextCategorySort(): number {
  const r = getDb().prepare("SELECT MAX(sort) AS m FROM categories").get() as { m: number | null };
  return Math.min(r.m === null ? 0 : r.m + 1, ADMIN_LIMITS.sort.max);
}

function nextProductSort(categoryId: number): number {
  const r = getDb().prepare("SELECT MAX(sort) AS m FROM products WHERE category_id = ?").get(categoryId) as {
    m: number | null;
  };
  return Math.min(r.m === null ? 0 : r.m + 1, ADMIN_LIMITS.sort.max);
}

// ---------------------------------------------------------------------------------------------

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

export function createCategory(actor: SessionUser | null, input: unknown): Category {
  requireRole(actor, "admin");
  const b = asBody(input);
  const name = text(b.name, "Nombre", ADMIN_LIMITS.categoryName);
  const sort = has(b, "sort") ? int(b.sort, "Orden", ADMIN_LIMITS.sort) : nextCategorySort();
  const slug = uniqueSlug("categories", name, "categoria");
  const r = getDb().prepare("INSERT INTO categories (slug, name, sort) VALUES (?, ?, ?)").run(slug, name, sort);
  return loadCategory(Number(r.lastInsertRowid))!;
}

export function updateCategory(actor: SessionUser | null, id: unknown, patch: unknown): Category {
  requireRole(actor, "admin");
  const cid = validId(id, "Categoría");
  const current = loadCategory(cid);
  if (!current) throw new AppError("NOT_FOUND", "Categoría no encontrada");
  const b = asBody(patch);
  const name = has(b, "name") ? text(b.name, "Nombre", ADMIN_LIMITS.categoryName) : current.name;
  const sort = has(b, "sort") ? int(b.sort, "Orden", ADMIN_LIMITS.sort) : current.sort;
  getDb().prepare("UPDATE categories SET name = ?, sort = ? WHERE id = ?").run(name, sort, cid);
  return loadCategory(cid)!;
}

export function deleteCategory(actor: SessionUser | null, id: unknown): void {
  requireRole(actor, "admin");
  const cid = validId(id, "Categoría");
  if (!loadCategory(cid)) throw new AppError("NOT_FOUND", "Categoría no encontrada");
  const db = getDb();
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM products WHERE category_id = ?").get(cid) as { n: number };
  if (n > 0) {
    throw new AppError(
      "INVALID_TRANSITION",
      `La categoría tiene ${n} producto${n === 1 ? "" : "s"}: movelos a otra categoría antes de borrarla`,
    );
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(cid);
}

export function createProduct(actor: SessionUser | null, input: unknown): Product {
  requireRole(actor, "admin");
  const b = asBody(input);
  const name = text(b.name, "Nombre", ADMIN_LIMITS.productName);
  const description = has(b, "description")
    ? text(b.description, "Descripción", ADMIN_LIMITS.productDescription)
    : "";
  const price = int(b.price, "Precio", ADMIN_LIMITS.price);
  const ic = has(b, "icon") ? icon(b.icon) : "generico";
  const available = has(b, "available") ? bool(b.available, "Disponible") : true;
  const categoryId = categoryIdOf(b.categoryId);
  const sort = has(b, "sort") ? int(b.sort, "Orden", ADMIN_LIMITS.sort) : nextProductSort(categoryId);
  const slug = uniqueSlug("products", name, "producto");
  const r = getDb()
    .prepare(
      `INSERT INTO products (slug, category_id, name, description, price, icon, available, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(slug, categoryId, name, description, price, ic, available ? 1 : 0, sort);
  return loadProduct(Number(r.lastInsertRowid))!;
}

export function updateProduct(actor: SessionUser | null, id: unknown, patch: unknown): Product {
  requireRole(actor, "admin");
  const pid = validId(id, "Producto");
  const cur = loadProduct(pid);
  if (!cur) throw new AppError("NOT_FOUND", "Producto no encontrado");
  const b = asBody(patch);
  const name = has(b, "name") ? text(b.name, "Nombre", ADMIN_LIMITS.productName) : cur.name;
  const description = has(b, "description")
    ? text(b.description, "Descripción", ADMIN_LIMITS.productDescription)
    : cur.description;
  const price = has(b, "price") ? int(b.price, "Precio", ADMIN_LIMITS.price) : cur.price;
  const ic = has(b, "icon") ? icon(b.icon) : cur.icon;
  const available = has(b, "available") ? bool(b.available, "Disponible") : cur.available;
  const categoryId = has(b, "categoryId") ? categoryIdOf(b.categoryId) : cur.categoryId;
  // Si cambia de categoría sin orden explícito, va al final de la nueva.
  const sort = has(b, "sort")
    ? int(b.sort, "Orden", ADMIN_LIMITS.sort)
    : categoryId !== cur.categoryId
      ? nextProductSort(categoryId)
      : cur.sort;
  getDb()
    .prepare(
      `UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, icon = ?, available = ?, sort = ?
       WHERE id = ?`,
    )
    .run(categoryId, name, description, price, ic, available ? 1 : 0, sort, pid);
  return loadProduct(pid)!;
}
