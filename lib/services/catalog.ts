// Catálogo (solo servidor). Contrato: docs/TECNICO.md §Contratos.
import { getDb } from "@/lib/db";
import type { Catalog, Category, IconKey, Product, SessionUser } from "@/lib/contracts";
import { requireRole } from "@/lib/services/auth";

interface ProductRow {
  id: number;
  slug: string;
  category_id: number;
  name: string;
  description: string;
  price: number;
  icon: IconKey;
  available: number;
  sort: number;
}

export function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    categoryId: r.category_id,
    name: r.name,
    description: r.description,
    price: r.price,
    icon: r.icon,
    available: r.available === 1,
    sort: r.sort,
  };
}

export function getCatalog(actor: SessionUser | null): Catalog {
  requireRole(actor, "cliente");
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
