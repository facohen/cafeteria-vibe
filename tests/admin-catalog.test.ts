// Tarea 2 — gestión del catálogo (CA-17, CA-18, CA-21). Contrato: lib/contracts.ts (CategoryInput, ProductInput, admin-catalog.ts).
import { describe, expect, it } from "vitest";
import { ADMIN_LIMITS, ICON_KEYS, type Product } from "@/lib/contracts";
import {
  createCategory,
  createProduct,
  deleteCategory,
  getAdminCatalog,
  updateCategory,
  updateProduct,
} from "@/lib/services/admin-catalog";
import { getCatalog } from "@/lib/services/catalog";
import { createOrder, getOrder } from "@/lib/services/orders";
import {
  MISSING_ID,
  adminActor,
  count,
  customerActor,
  db,
  expectCode,
  kitchenActor,
  productId,
  useFreshDb,
} from "./helpers";

useFreshDb();

function categoryId(slug: string): number {
  return (db().prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as { id: number }).id;
}
const cafes = () => categoryId("cafes");

const newProduct = (over: Record<string, unknown> = {}) => ({
  categoryId: cafes(),
  name: "Flat white",
  description: "Doble ristretto y leche texturizada",
  price: 3800,
  icon: "latte",
  ...over,
});

function clientProduct(id: number): Product | undefined {
  return getCatalog(customerActor()).products.find((p) => p.id === id);
}
function dbProduct(id: number) {
  return db().prepare("SELECT name, description, price, icon, available, category_id, sort FROM products WHERE id = ?").get(id);
}

describe("permisos: solo admin gestiona el catálogo", () => {
  it("sin sesión → UNAUTHENTICATED en cada servicio (aun con id inexistente o entrada inválida)", () => {
    const latte = productId("latte");
    expectCode(() => getAdminCatalog(null), "UNAUTHENTICATED");
    expectCode(() => createCategory(null, { name: "Nueva" }), "UNAUTHENTICATED");
    expectCode(() => createCategory(null, null), "UNAUTHENTICATED");
    expectCode(() => updateCategory(null, cafes(), { name: "X" }), "UNAUTHENTICATED");
    expectCode(() => updateCategory(null, MISSING_ID, { name: "" }), "UNAUTHENTICATED");
    expectCode(() => deleteCategory(null, cafes()), "UNAUTHENTICATED");
    expectCode(() => deleteCategory(null, "abc"), "UNAUTHENTICATED");
    expectCode(() => createProduct(null, newProduct()), "UNAUTHENTICATED");
    expectCode(() => createProduct(null, { price: -1 }), "UNAUTHENTICATED");
    expectCode(() => updateProduct(null, latte, { price: 1 }), "UNAUTHENTICATED");
    expectCode(() => updateProduct(null, MISSING_ID, { price: -1 }), "UNAUTHENTICATED");
  });

  it("cliente y cocina → FORBIDDEN en cada servicio (rol antes que existencia y validación)", () => {
    const latte = productId("latte");
    const before = { cats: count("categories"), prods: count("products") };
    const latteBefore = dbProduct(latte);
    const cafesBefore = db().prepare("SELECT name FROM categories WHERE slug = 'cafes'").get();
    for (const actor of [customerActor(), kitchenActor()]) {
      expectCode(() => getAdminCatalog(actor), "FORBIDDEN");
      expectCode(() => createCategory(actor, { name: "Nueva" }), "FORBIDDEN");
      expectCode(() => createCategory(actor, { name: "" }), "FORBIDDEN");
      expectCode(() => updateCategory(actor, cafes(), { name: "Hackeado" }), "FORBIDDEN");
      expectCode(() => updateCategory(actor, MISSING_ID, { name: "" }), "FORBIDDEN");
      expectCode(() => deleteCategory(actor, cafes()), "FORBIDDEN");
      expectCode(() => deleteCategory(actor, MISSING_ID), "FORBIDDEN");
      expectCode(() => createProduct(actor, newProduct()), "FORBIDDEN");
      expectCode(() => createProduct(actor, newProduct({ price: 0 })), "FORBIDDEN");
      expectCode(() => updateProduct(actor, latte, { price: 1 }), "FORBIDDEN");
      expectCode(() => updateProduct(actor, latte, { available: false }), "FORBIDDEN");
      expectCode(() => updateProduct(actor, MISSING_ID, { price: -1 }), "FORBIDDEN");
    }
    expect(count("categories")).toBe(before.cats);
    expect(count("products")).toBe(before.prods);
    expect(dbProduct(latte)).toEqual(latteBefore);
    expect(db().prepare("SELECT name FROM categories WHERE slug = 'cafes'").get()).toEqual(cafesBefore);
  });
});

describe("getAdminCatalog", () => {
  it("incluye todas las categorías y productos, también los no disponibles", () => {
    const admin = adminActor();
    updateProduct(admin, productId("tostado"), { available: false });
    const cat = getAdminCatalog(admin);
    expect(cat.categories.length).toBe(count("categories"));
    expect(cat.products.length).toBe(count("products"));
    expect(cat.products.find((p) => p.slug === "tostado")?.available).toBe(false);
    expect(cat.products.some((p) => !p.available)).toBe(true);
  });
});

describe("categorías", () => {
  it("alta: nombre recortado, slug generado, al final por defecto; se ve en el kiosco", () => {
    const c = createCategory(adminActor(), { name: "  Sin TACC  " });
    expect(c).toMatchObject({ name: "Sin TACC" });
    expect(c.id).toEqual(expect.any(Number));
    expect(typeof c.slug).toBe("string");
    expect(c.slug.length).toBeGreaterThan(0);
    const cats = getCatalog(customerActor()).categories;
    expect(cats[cats.length - 1].id).toBe(c.id);
  });

  it("slug único aunque el nombre repita uno existente o sea solo símbolos", () => {
    const admin = adminActor();
    const a = createCategory(admin, { name: "Cafés" });
    const b = createCategory(admin, { name: "Cafés" });
    const c = createCategory(admin, { name: "¡¡¡!!!" });
    const d = createCategory(admin, { name: "¡¡¡!!!" });
    for (const x of [a, b, c, d]) expect(x.slug.length).toBeGreaterThan(0);
    const slugs = (db().prepare("SELECT slug FROM categories").all() as { slug: string }[]).map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("acepta sort explícito entero >= 0", () => {
    const c = createCategory(adminActor(), { name: "Primero", sort: 0 });
    expect(c.sort).toBe(0);
    expect(getCatalog(customerActor()).categories.find((x) => x.id === c.id)?.sort).toBe(0);
  });

  it("nombre vacío, de más de 40, sort inválido o tipos incorrectos → VALIDATION", () => {
    const admin = adminActor();
    const before = count("categories");
    const bad: unknown[] = [
      { name: "" },
      { name: "   " },
      { name: "x".repeat(ADMIN_LIMITS.categoryNameMax + 1) },
      { name: 5 },
      {},
      null,
      "Bebidas",
      [],
      { name: "Ok", sort: -1 },
      { name: "Ok", sort: 1.5 },
      { name: "Ok", sort: "2" },
    ];
    for (const input of bad) expectCode(() => createCategory(admin, input), "VALIDATION");
    expect(count("categories")).toBe(before);
    expect(createCategory(admin, { name: "x".repeat(ADMIN_LIMITS.categoryNameMax) }).name.length).toBe(ADMIN_LIMITS.categoryNameMax);
  });

  it("edición parcial del nombre y del orden; se ve en el kiosco", () => {
    const admin = adminActor();
    const id = cafes();
    const c = updateCategory(admin, id, { name: "Cafés de especialidad" });
    expect(c).toMatchObject({ id, name: "Cafés de especialidad" });
    expect(getCatalog(customerActor()).categories.find((x) => x.id === id)?.name).toBe("Cafés de especialidad");
    const s = updateCategory(admin, id, { sort: 10_000 });
    expect(s).toMatchObject({ id, name: "Cafés de especialidad", sort: 10_000 });
    const cats = getCatalog(customerActor()).categories;
    expect(cats[cats.length - 1].id).toBe(id);
  });

  it("edición inválida → VALIDATION; id inexistente → NOT_FOUND (antes que validación)", () => {
    const admin = adminActor();
    const before = db().prepare("SELECT name, sort FROM categories WHERE slug = 'cafes'").get();
    for (const patch of [{ name: "" }, { name: "x".repeat(41) }, { sort: -3 }, { sort: "1" }, null, "x"] as unknown[]) {
      expectCode(() => updateCategory(admin, cafes(), patch), "VALIDATION");
    }
    expect(db().prepare("SELECT name, sort FROM categories WHERE slug = 'cafes'").get()).toEqual(before);
    expectCode(() => updateCategory(admin, MISSING_ID, { name: "X" }), "NOT_FOUND");
    expectCode(() => updateCategory(admin, MISSING_ID, { name: "" }), "NOT_FOUND");
    expectCode(() => updateCategory(admin, "abc", { name: "X" }), "NOT_FOUND");
  });

  it("borrar: vacía se borra; con productos (aun no disponibles) → VALIDATION; inexistente → NOT_FOUND", () => {
    const admin = adminActor();
    const vacia = createCategory(admin, { name: "Temporal" });
    expect(deleteCategory(admin, String(vacia.id))).toBeUndefined();
    expect(count("categories", "id = ?", vacia.id)).toBe(0);
    expect(getCatalog(customerActor()).categories.some((c) => c.id === vacia.id)).toBe(false);
    expectCode(() => deleteCategory(admin, vacia.id), "NOT_FOUND");

    expectCode(() => deleteCategory(admin, cafes()), "VALIDATION");
    expect(count("categories", "id = ?", cafes())).toBe(1);

    const conUno = createCategory(admin, { name: "Con uno" });
    const p = createProduct(admin, newProduct({ categoryId: conUno.id }));
    updateProduct(admin, p.id, { available: false });
    expectCode(() => deleteCategory(admin, conUno.id), "VALIDATION");
    expect(count("categories", "id = ?", conUno.id)).toBe(1);

    expectCode(() => deleteCategory(admin, MISSING_ID), "NOT_FOUND");
    expectCode(() => deleteCategory(admin, "abc"), "NOT_FOUND");
  });
});

describe("productos: alta", () => {
  it("alta válida: disponible por defecto, slug generado, al final de su categoría; el kiosco lo ve y se puede pedir", () => {
    const admin = adminActor();
    const p = createProduct(admin, newProduct({ name: "  Flat white  " }));
    expect(p).toMatchObject({
      categoryId: cafes(),
      name: "Flat white",
      description: "Doble ristretto y leche texturizada",
      price: 3800,
      icon: "latte",
      available: true,
    });
    expect(p.slug.length).toBeGreaterThan(0);
    const inCat = getCatalog(customerActor()).products.filter((x) => x.categoryId === cafes());
    expect(inCat[inCat.length - 1].id).toBe(p.id);
    const order = createOrder(customerActor(), { items: [{ productId: p.id, quantity: 2 }] });
    expect(order.total).toBe(7600);
  });

  it("descripción opcional (vacía por defecto); 200 caracteres justos se aceptan", () => {
    const admin = adminActor();
    const { description: _omit, ...sinDesc } = newProduct();
    void _omit;
    expect(createProduct(admin, sinDesc).description).toBe("");
    const largo = createProduct(admin, newProduct({ name: "Otro", description: "d".repeat(ADMIN_LIMITS.descriptionMax) }));
    expect(largo.description.length).toBe(ADMIN_LIMITS.descriptionMax);
  });

  it("alta como no disponible: aparece deshabilitado en el kiosco y no se puede pedir", () => {
    const p = createProduct(adminActor(), newProduct({ available: false }));
    expect(p.available).toBe(false);
    expect(clientProduct(p.id)?.available).toBe(false);
    expectCode(() => createOrder(customerActor(), { items: [{ productId: p.id, quantity: 1 }] }), "VALIDATION");
  });

  it("acepta los precios límite y todos los íconos del contrato", () => {
    const admin = adminActor();
    expect(createProduct(admin, newProduct({ name: "Min", price: ADMIN_LIMITS.minPrice })).price).toBe(1);
    expect(createProduct(admin, newProduct({ name: "Max", price: ADMIN_LIMITS.maxPrice })).price).toBe(1_000_000);
    for (const icon of ICON_KEYS) expect(createProduct(admin, newProduct({ name: `Ícono ${icon}`, icon })).icon).toBe(icon);
  });

  it("slug único aunque repita el nombre de un producto existente", () => {
    const admin = adminActor();
    const a = createProduct(admin, newProduct({ name: "Latte" }));
    const b = createProduct(admin, newProduct({ name: "Latte" }));
    const c = createProduct(admin, newProduct({ name: "???" }));
    const d = createProduct(admin, newProduct({ name: "???" }));
    for (const x of [a, b, c, d]) expect(x.slug.length).toBeGreaterThan(0);
    expect(a.slug).not.toBe("latte");
    const slugs = (db().prepare("SELECT slug FROM products").all() as { slug: string }[]).map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("precio 0, negativo, decimal, string, > 1.000.000 o faltante → VALIDATION", () => {
    const admin = adminActor();
    const before = count("products");
    for (const price of [0, -1, -3400, 1.5, 3400.01, "100", "3400", null, ADMIN_LIMITS.maxPrice + 1, Number.MAX_SAFE_INTEGER, [100]]) {
      expectCode(() => createProduct(admin, newProduct({ price })), "VALIDATION");
    }
    const { price: _p, ...sinPrecio } = newProduct();
    void _p;
    expectCode(() => createProduct(admin, sinPrecio), "VALIDATION");
    expect(count("products")).toBe(before);
  });

  it("ícono fuera de ICON_KEYS → VALIDATION", () => {
    const admin = adminActor();
    for (const icon of ["unicornio", "", "LATTE", null, 3, "<svg/>"]) {
      expectCode(() => createProduct(admin, newProduct({ icon })), "VALIDATION");
    }
    expect(count("products", "name = 'Flat white'")).toBe(0);
  });

  it("categoryId inexistente o de tipo incorrecto → VALIDATION", () => {
    const admin = adminActor();
    for (const categoryId of [MISSING_ID, 0, -1, "1", null, 1.5]) {
      expectCode(() => createProduct(admin, newProduct({ categoryId })), "VALIDATION");
    }
    expect(count("products", "name = 'Flat white'")).toBe(0);
  });

  it("nombre vacío o > 60, descripción > 200, available/sort inválidos, cuerpo no objeto → VALIDATION", () => {
    const admin = adminActor();
    const bad: unknown[] = [
      newProduct({ name: "" }),
      newProduct({ name: "   " }),
      newProduct({ name: "x".repeat(ADMIN_LIMITS.productNameMax + 1) }),
      newProduct({ name: 12 }),
      newProduct({ description: "d".repeat(ADMIN_LIMITS.descriptionMax + 1) }),
      newProduct({ description: 5 }),
      newProduct({ available: "true" }),
      newProduct({ available: 1 }),
      newProduct({ sort: -1 }),
      newProduct({ sort: 0.5 }),
      null,
      "Flat white",
      [],
      {},
    ];
    for (const input of bad) expectCode(() => createProduct(admin, input), "VALIDATION");
    expect(count("products", "name = 'Flat white'")).toBe(0);
  });
});

describe("productos: edición", () => {
  it("cambio de precio (parcial): el kiosco ve el precio nuevo, los pedidos nuevos lo usan y los viejos conservan su copia", () => {
    const admin = adminActor();
    const latte = productId("latte");
    const cliente = customerActor();
    const viejo = createOrder(cliente, { items: [{ productId: latte, quantity: 1 }] });
    const before = dbProduct(latte) as Record<string, unknown>;
    const oldPrice = before.price as number;
    expect(oldPrice).not.toBe(3900);
    expect(viejo.total).toBe(oldPrice);
    const p = updateProduct(admin, latte, { price: 3900 });
    expect(p).toMatchObject({ id: latte, price: 3900, name: before.name, available: true });
    expect(dbProduct(latte)).toEqual({ ...before, price: 3900 });
    expect(clientProduct(latte)?.price).toBe(3900);
    expect(createOrder(cliente, { items: [{ productId: latte, quantity: 2 }] }).total).toBe(7800);
    const again = getOrder(cliente, viejo.id);
    expect(again.total).toBe(oldPrice);
    expect(again.items[0].unitPrice).toBe(oldPrice);
  });

  it("marcar no disponible (parcial): deshabilitado en el kiosco y createOrder → VALIDATION; volver a habilitar", () => {
    const admin = adminActor();
    const id = productId("medialuna");
    const before = dbProduct(id) as Record<string, unknown>;
    expect(updateProduct(admin, id, { available: false }).available).toBe(false);
    expect(dbProduct(id)).toEqual({ ...before, available: 0 });
    expect(clientProduct(id)?.available).toBe(false);
    const cliente = customerActor();
    expectCode(() => createOrder(cliente, { items: [{ productId: id, quantity: 1 }] }), "VALIDATION");
    expectCode(
      () => createOrder(cliente, { items: [{ productId: productId("latte"), quantity: 1 }, { productId: id, quantity: 1 }] }),
      "VALIDATION",
    );
    expect(updateProduct(admin, id, { available: true }).available).toBe(true);
    expect(createOrder(cliente, { items: [{ productId: id, quantity: 1 }] }).status).toBe("pendiente_pago");
  });

  it("edita nombre, descripción, ícono y categoría; el kiosco lo ve", () => {
    const admin = adminActor();
    const id = productId("tostado");
    const otra = createCategory(admin, { name: "Salados" });
    const price = (dbProduct(id) as { price: number }).price;
    const p = updateProduct(admin, String(id), { name: "Tostado de miga", description: "Triple", icon: "generico", categoryId: otra.id });
    expect(p).toMatchObject({ id, name: "Tostado de miga", description: "Triple", icon: "generico", categoryId: otra.id, price });
    expect(clientProduct(id)).toMatchObject({ name: "Tostado de miga", categoryId: otra.id });
  });

  it("edición inválida → VALIDATION y no cambia nada", () => {
    const admin = adminActor();
    const id = productId("latte");
    const before = dbProduct(id);
    const bad: unknown[] = [
      { price: 0 },
      { price: -10 },
      { price: 1.5 },
      { price: "100" },
      { price: ADMIN_LIMITS.maxPrice + 1 },
      { icon: "unicornio" },
      { categoryId: MISSING_ID },
      { name: "" },
      { name: "x".repeat(61) },
      { description: "d".repeat(201) },
      { available: "no" },
      { sort: -1 },
      null,
      "x",
    ];
    for (const patch of bad) expectCode(() => updateProduct(admin, id, patch), "VALIDATION");
    expect(dbProduct(id)).toEqual(before);
  });

  it("id inexistente o inválido → NOT_FOUND (antes que validación)", () => {
    const admin = adminActor();
    expectCode(() => updateProduct(admin, MISSING_ID, { price: 100 }), "NOT_FOUND");
    expectCode(() => updateProduct(admin, MISSING_ID, { price: -1 }), "NOT_FOUND");
    expectCode(() => updateProduct(admin, "abc", { price: 100 }), "NOT_FOUND");
    expectCode(() => updateProduct(admin, 0, { price: 100 }), "NOT_FOUND");
  });
});
