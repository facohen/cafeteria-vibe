// Tarea 2 — administración del catálogo (CA-17, CA-18, CA-21) contra el contrato de lib/contracts.ts.
import { describe, expect, it } from "vitest";
import { ICON_KEYS, type SessionUser } from "@/lib/contracts";
import {
  createCategory,
  createProduct,
  deleteCategory,
  getAdminCatalog,
  updateCategory,
  updateProduct,
} from "@/lib/services/catalog-admin";
import { getCatalog } from "@/lib/services/catalog";
import { createOrder, getOrder } from "@/lib/services/orders";
import { adminActor, customerActor, db, expectCode, kitchenActor, productId, sampleInput, useFreshDb } from "./helpers";

useFreshDb();

const count = (table: string) => (db().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;
const categoryId = (slug: string) => (db().prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as { id: number }).id;
const productRow = (id: number) => db().prepare("SELECT * FROM products WHERE id = ?").get(id);
const categoryRow = (id: number) => db().prepare("SELECT * FROM categories WHERE id = ?").get(id);
const validProduct = () => ({ categoryId: categoryId("cafes"), name: "Ristretto", price: 2500 });

describe("permisos: solo admin gestiona el catálogo", () => {
  it("sin sesión → UNAUTHENTICATED en cada operación (aun con id o datos inválidos)", () => {
    const cat = categoryId("cafes");
    const latte = productId("latte");
    expectCode(() => getAdminCatalog(null), "UNAUTHENTICATED");
    expectCode(() => createCategory(null, { name: "Nueva" }), "UNAUTHENTICATED");
    expectCode(() => createCategory(null, {}), "UNAUTHENTICATED");
    expectCode(() => updateCategory(null, cat, { name: "X" }), "UNAUTHENTICATED");
    expectCode(() => updateCategory(null, "abc", {}), "UNAUTHENTICATED");
    expectCode(() => deleteCategory(null, cat), "UNAUTHENTICATED");
    expectCode(() => deleteCategory(null, 99999), "UNAUTHENTICATED");
    expectCode(() => createProduct(null, validProduct()), "UNAUTHENTICATED");
    expectCode(() => updateProduct(null, latte, { price: 1 }), "UNAUTHENTICATED");
    expectCode(() => updateProduct(null, 99999, { price: -1 }), "UNAUTHENTICATED");
  });

  for (const [label, actor] of [
    ["cliente", () => customerActor()],
    ["cocina", () => kitchenActor()],
  ] as const) {
    it(`${label} → FORBIDDEN en cada operación (rol antes que id y validación)`, () => {
      const a: SessionUser = actor();
      const cat = categoryId("cafes");
      const latte = productId("latte");
      const before = { c: count("categories"), p: count("products"), latte: productRow(latte) };
      expectCode(() => getAdminCatalog(a), "FORBIDDEN");
      expectCode(() => createCategory(a, { name: "Nueva" }), "FORBIDDEN");
      expectCode(() => updateCategory(a, cat, { name: "Hackeada" }), "FORBIDDEN");
      expectCode(() => updateCategory(a, "abc", {}), "FORBIDDEN");
      expectCode(() => deleteCategory(a, cat), "FORBIDDEN");
      expectCode(() => deleteCategory(a, 99999), "FORBIDDEN");
      expectCode(() => createProduct(a, validProduct()), "FORBIDDEN");
      expectCode(() => updateProduct(a, latte, { price: 1, available: false }), "FORBIDDEN");
      expectCode(() => updateProduct(a, 99999, { price: -1 }), "FORBIDDEN");
      expect({ c: count("categories"), p: count("products"), latte: productRow(latte) }).toEqual(before);
    });
  }

  it("admin → OK en cada operación", () => {
    const admin = adminActor();
    expect(getAdminCatalog(admin).products.length).toBeGreaterThan(0);
    const c = createCategory(admin, { name: "Temporada" });
    expect(updateCategory(admin, c.id, { name: "Temporada 2" }).name).toBe("Temporada 2");
    const p = createProduct(admin, { categoryId: c.id, name: "Chocolate", price: 3000 });
    expect(updateProduct(admin, p.id, { price: 3100 }).price).toBe(3100);
    const empty = createCategory(admin, { name: "Vacía" });
    expect(deleteCategory(admin, empty.id)).toBeUndefined();
  });
});

describe("getAdminCatalog", () => {
  it("igual que getCatalog (incluye no disponibles)", () => {
    const admin = adminActor();
    updateProduct(admin, productId("tostado"), { available: false });
    const adminCat = getAdminCatalog(admin);
    expect(adminCat).toEqual(getCatalog(customerActor()));
    expect(adminCat.products.find((p) => p.slug === "tostado")?.available).toBe(false);
  });
});

describe("categorías", () => {
  it("alta: nombre recortado, slug generado y único, sort por defecto al final", () => {
    const admin = adminActor();
    const maxSort = (db().prepare("SELECT MAX(sort) AS m FROM categories").get() as { m: number }).m;
    const a = createCategory(admin, { name: "  Bebidas Frías  " });
    expect(a.name).toBe("Bebidas Frías");
    expect(a.slug).toMatch(/^[a-z0-9-]+$/);
    expect(a.sort).toBeGreaterThanOrEqual(maxSort);
    const b = createCategory(admin, { name: "Bebidas Frías" });
    expect(b.slug).not.toBe(a.slug);
    expect(b.id).not.toBe(a.id);
    const c = createCategory(admin, { name: "Desayunos", sort: 0 });
    expect(c.sort).toBe(0);
    const cat = getCatalog(customerActor());
    expect(cat.categories.map((x) => x.id)).toEqual(expect.arrayContaining([a.id, b.id, c.id]));
  });

  it("límites: nombre de 40 y sort 0 / 10000 se aceptan", () => {
    const admin = adminActor();
    expect(createCategory(admin, { name: "c".repeat(40), sort: 10_000 }).name).toHaveLength(40);
    expect(createCategory(admin, { name: "Cero", sort: 0 }).sort).toBe(0);
  });

  const invalid: [string, unknown][] = [
    ["cuerpo null", null],
    ["cuerpo string", "Cafés"],
    ["sin nombre", {}],
    ["nombre vacío", { name: "" }],
    ["nombre solo espacios", { name: "   " }],
    ["nombre > 40", { name: "c".repeat(41) }],
    ["nombre no string", { name: 5 }],
    ["sort decimal", { name: "X", sort: 1.5 }],
    ["sort string", { name: "X", sort: "2" }],
    ["sort negativo", { name: "X", sort: -1 }],
    ["sort > 10000", { name: "X", sort: 10_001 }],
    ["sort NaN", { name: "X", sort: Number.NaN }],
  ];
  for (const [label, input] of invalid) {
    it(`alta VALIDATION: ${label}`, () => {
      const admin = adminActor();
      const before = count("categories");
      expectCode(() => createCategory(admin, input), "VALIDATION");
      expect(count("categories")).toBe(before);
    });
  }

  it("edición: renombrar no cambia el slug; edición parcial", () => {
    const admin = adminActor();
    const id = categoryId("cafes");
    const c = updateCategory(admin, id, { name: "  Café de especialidad " });
    expect(c).toMatchObject({ id, slug: "cafes", name: "Café de especialidad" });
    const c2 = updateCategory(admin, String(id), { sort: 7 });
    expect(c2).toMatchObject({ slug: "cafes", name: "Café de especialidad", sort: 7 });
    expect(getCatalog(customerActor()).categories.find((x) => x.id === id)?.name).toBe("Café de especialidad");
  });

  it("edición inválida → VALIDATION y no cambia nada", () => {
    const admin = adminActor();
    const id = categoryId("cafes");
    const before = categoryRow(id);
    for (const patch of [null, { name: "" }, { name: "x".repeat(41) }, { sort: 2.5 }, { sort: "1" }, { sort: -5 }]) {
      expectCode(() => updateCategory(admin, id, patch), "VALIDATION");
    }
    expect(categoryRow(id)).toEqual(before);
  });

  it("id inválido → VALIDATION; inexistente → NOT_FOUND (antes que el cuerpo)", () => {
    const admin = adminActor();
    for (const bad of ["abc", 0, -1, 1.5, null]) {
      expectCode(() => updateCategory(admin, bad, { name: "X" }), "VALIDATION");
      expectCode(() => deleteCategory(admin, bad), "VALIDATION");
    }
    expectCode(() => updateCategory(admin, 99999, { name: "" }), "NOT_FOUND");
    expectCode(() => deleteCategory(admin, 99999), "NOT_FOUND");
  });

  it("borrar una categoría con productos → INVALID_TRANSITION; vacía se borra", () => {
    const admin = adminActor();
    const id = categoryId("cafes");
    expectCode(() => deleteCategory(admin, id), "INVALID_TRANSITION");
    expect(categoryRow(id)).toBeDefined();
    // aunque todos sus productos estén no disponibles, sigue teniendo productos
    const c = createCategory(admin, { name: "Temporal" });
    const p = createProduct(admin, { categoryId: c.id, name: "Algo", price: 100, available: false });
    expectCode(() => deleteCategory(admin, c.id), "INVALID_TRANSITION");
    // al mover el producto a otra categoría, queda vacía y se puede borrar
    updateProduct(admin, p.id, { categoryId: id });
    deleteCategory(admin, c.id);
    expect(categoryRow(c.id)).toBeUndefined();
    expect(getCatalog(customerActor()).categories.find((x) => x.id === c.id)).toBeUndefined();
    expectCode(() => deleteCategory(admin, c.id), "NOT_FOUND");
  });
});

describe("productos", () => {
  it("alta con valores por defecto: descripción vacía, ícono genérico, disponible; slug generado", () => {
    const admin = adminActor();
    const p = createProduct(admin, { ...validProduct(), name: "  Ristretto  " });
    expect(p).toMatchObject({
      categoryId: categoryId("cafes"),
      name: "Ristretto",
      description: "",
      price: 2500,
      icon: "generico",
      available: true,
    });
    expect(p.slug).toMatch(/^[a-z0-9-]+$/);
    expect(Number.isInteger(p.sort)).toBe(true);
    const again = createProduct(admin, validProduct());
    expect(again.slug).not.toBe(p.slug);
    // se ve en el kiosco y se puede pedir
    const cliente = customerActor();
    expect(getCatalog(cliente).products.find((x) => x.id === p.id)).toEqual(p);
    const order = createOrder(cliente, { items: [{ productId: p.id, quantity: 2 }] });
    expect(order.total).toBe(5000);
  });

  it("alta completa: todos los íconos de ICON_KEYS se aceptan; límites de precio y descripción", () => {
    const admin = adminActor();
    const cat = categoryId("pasteleria");
    for (const icon of ICON_KEYS) {
      expect(createProduct(admin, { categoryId: cat, name: `P ${icon}`, price: 100, icon }).icon).toBe(icon);
    }
    expect(createProduct(admin, { categoryId: cat, name: "Barato", price: 1 }).price).toBe(1);
    expect(createProduct(admin, { categoryId: cat, name: "Caro", price: 1_000_000 }).price).toBe(1_000_000);
    const full = createProduct(admin, {
      categoryId: cat,
      name: "N".repeat(60),
      description: "d".repeat(200),
      price: 999,
      icon: "alfajor",
      available: false,
      sort: 3,
    });
    expect(full).toMatchObject({ name: "N".repeat(60), description: "d".repeat(200), icon: "alfajor", available: false, sort: 3 });
  });

  const base = () => validProduct();
  const invalid: [string, () => unknown][] = [
    ["cuerpo null", () => null],
    ["cuerpo array", () => []],
    ["precio 0", () => ({ ...base(), price: 0 })],
    ["precio negativo", () => ({ ...base(), price: -100 })],
    ["precio decimal", () => ({ ...base(), price: 2500.5 })],
    ["precio string", () => ({ ...base(), price: "2500" })],
    ["precio > 1.000.000", () => ({ ...base(), price: 1_000_001 })],
    ["precio NaN", () => ({ ...base(), price: Number.NaN })],
    ["precio Infinity", () => ({ ...base(), price: Number.POSITIVE_INFINITY })],
    ["sin precio", () => ({ categoryId: base().categoryId, name: "X" })],
    ["icon fuera de ICON_KEYS", () => ({ ...base(), icon: "dragon" })],
    ["icon con mayúsculas", () => ({ ...base(), icon: "Latte" })],
    ["icon no string", () => ({ ...base(), icon: 3 })],
    ["categoryId inexistente", () => ({ ...base(), categoryId: 99999 })],
    ["categoryId string", () => ({ ...base(), categoryId: "cafes" })],
    ["sin categoryId", () => ({ name: "X", price: 100 })],
    ["sin nombre", () => ({ categoryId: base().categoryId, price: 100 })],
    ["nombre vacío", () => ({ ...base(), name: "   " })],
    ["nombre > 60", () => ({ ...base(), name: "n".repeat(61) })],
    ["descripción > 200", () => ({ ...base(), description: "d".repeat(201) })],
    ["descripción no string", () => ({ ...base(), description: 7 })],
    ["available no booleano", () => ({ ...base(), available: "si" })],
    ["available 0", () => ({ ...base(), available: 0 })],
    ["sort negativo", () => ({ ...base(), sort: -1 })],
    ["sort decimal", () => ({ ...base(), sort: 1.2 })],
  ];
  for (const [label, input] of invalid) {
    it(`alta VALIDATION: ${label}`, () => {
      const admin = adminActor();
      const before = count("products");
      expectCode(() => createProduct(admin, input()), "VALIDATION");
      expect(count("products")).toBe(before);
    });
  }

  it("edición: precio, nombre, descripción, ícono y disponibilidad; el slug no cambia", () => {
    const admin = adminActor();
    const id = productId("latte");
    const p = updateProduct(admin, id, { name: " Latte grande ", description: "Más leche", price: 4000, icon: "flat_white" });
    expect(p).toMatchObject({ id, slug: "latte", name: "Latte grande", description: "Más leche", price: 4000, icon: "flat_white", available: true });
    const p2 = updateProduct(admin, String(id), { available: false });
    expect(p2).toMatchObject({ slug: "latte", name: "Latte grande", price: 4000, available: false });
    // cambiar de categoría
    const p3 = updateProduct(admin, id, { categoryId: categoryId("frias") });
    expect(p3.categoryId).toBe(categoryId("frias"));
  });

  const invalidPatches: [string, unknown][] = [
    ["patch null", null],
    ["precio 0", { price: 0 }],
    ["precio negativo", { price: -1 }],
    ["precio decimal", { price: 10.5 }],
    ["precio string", { price: "3000" }],
    ["precio > 1.000.000", { price: 1_000_001 }],
    ["icon fuera de ICON_KEYS", { icon: "unicornio" }],
    ["categoryId inexistente", { categoryId: 99999 }],
    ["nombre vacío", { name: "" }],
    ["nombre > 60", { name: "n".repeat(61) }],
    ["descripción > 200", { description: "d".repeat(201) }],
    ["available string", { available: "false" }],
    ["sort string", { sort: "1" }],
  ];
  for (const [label, patch] of invalidPatches) {
    it(`edición VALIDATION: ${label} (y no cambia nada)`, () => {
      const admin = adminActor();
      const id = productId("latte");
      const before = productRow(id);
      expectCode(() => updateProduct(admin, id, patch), "VALIDATION");
      expect(productRow(id)).toEqual(before);
    });
  }

  it("id inválido → VALIDATION; inexistente → NOT_FOUND (antes que el cuerpo)", () => {
    const admin = adminActor();
    for (const bad of ["abc", 0, -1, 1.5, null]) expectCode(() => updateProduct(admin, bad, { price: 100 }), "VALIDATION");
    expectCode(() => updateProduct(admin, 99999, { price: 100 }), "NOT_FOUND");
    expectCode(() => updateProduct(admin, 99999, { price: -1 }), "NOT_FOUND");
  });
});

describe("los cambios se ven en el kiosco (CA-17) y lo no disponible no se pide (CA-18)", () => {
  it("producto marcado no disponible no se puede pedir; al volver a disponible, sí", () => {
    const admin = adminActor();
    const cliente = customerActor();
    const id = productId("latte");
    updateProduct(admin, id, { available: false });
    expect(getCatalog(cliente).products.find((p) => p.id === id)?.available).toBe(false);
    const ordersBefore = count("orders");
    expectCode(() => createOrder(cliente, sampleInput()), "VALIDATION");
    expectCode(() => createOrder(cliente, { items: [{ productId: id, quantity: 1 }] }), "VALIDATION");
    expect(count("orders")).toBe(ordersBefore);
    updateProduct(admin, id, { available: true });
    expect(getCatalog(cliente).products.find((p) => p.id === id)?.available).toBe(true);
    expect(createOrder(cliente, sampleInput()).status).toBe("pendiente_pago");
  });

  it("producto creado no disponible tampoco se puede pedir", () => {
    const admin = adminActor();
    const p = createProduct(admin, { ...validProduct(), available: false });
    expectCode(() => createOrder(customerActor(), { items: [{ productId: p.id, quantity: 1 }] }), "VALIDATION");
  });

  it("cambio de precio y nombre: se ven en getCatalog y en pedidos nuevos, sin cambiar los viejos", () => {
    const admin = adminActor();
    const cliente = customerActor();
    const id = productId("latte");
    const old = createOrder(cliente, { items: [{ productId: id, quantity: 2 }] });
    expect(old.total).toBe(6800);

    updateProduct(admin, id, { price: 5000, name: "Latte XL" });
    const shown = getCatalog(cliente).products.find((p) => p.id === id)!;
    expect(shown).toMatchObject({ price: 5000, name: "Latte XL" });

    const fresh = createOrder(cliente, { items: [{ productId: id, quantity: 2 }] });
    expect(fresh.total).toBe(10_000);
    expect(fresh.items[0]).toMatchObject({ unitPrice: 5000, name: "Latte XL" });

    const reloaded = getOrder(cliente, old.id);
    expect(reloaded.total).toBe(6800);
    expect(reloaded.items[0]).toMatchObject({ unitPrice: 3400, name: "Latte", quantity: 2 });
  });

  it("renombrar una categoría se ve en getCatalog", () => {
    const admin = adminActor();
    updateCategory(admin, categoryId("pasteleria"), { name: "Dulces" });
    expect(getCatalog(customerActor()).categories.find((c) => c.slug === "pasteleria")?.name).toBe("Dulces");
  });
});
