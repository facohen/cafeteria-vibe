// Tarea 2 — capa HTTP de administración (CA-21): cookie del personal, rol admin, origen y códigos.
import { describe, expect, it } from "vitest";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";
import { ADMIN_EMAIL, CUSTOMER_EMAIL, KITCHEN_EMAIL, STAFF_DEMO_PASSWORD, db, productId, useFreshDb } from "./helpers";
import { call, ctx, noParams, req } from "./http-helpers";

useFreshDb();

const usersRoute = () => import("@/app/api/admin/users/route");
const userRoute = () => import("@/app/api/admin/users/[id]/route");
const catalogRoute = () => import("@/app/api/admin/catalog/route");
const categoriesRoute = () => import("@/app/api/admin/categories/route");
const categoryRoute = () => import("@/app/api/admin/categories/[id]/route");
const productsRoute = () => import("@/app/api/admin/products/route");
const productRoute = () => import("@/app/api/admin/products/[id]/route");

const adminToken = () => loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD).token;
const kitchenToken = () => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
const customerToken = () => loginCustomer(CUSTOMER_EMAIL).token;
const sofiaId = () => (db().prepare("SELECT id FROM users WHERE email = ?").get(CUSTOMER_EMAIL) as { id: number }).id;
const catId = (slug: string) => (db().prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as { id: number }).id;

let emptySeq = 0;
type Cookies = { token?: string; staffToken?: string };
type Endpoint = {
  name: string;
  run: (c: Cookies, origin?: string) => Promise<{ status: number; body: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
  mutating: boolean;
};

/** Todas las rutas de administración, con un cuerpo válido para cada una. */
function endpoints(): Endpoint[] {
  return [
    { name: "GET /api/admin/users", mutating: false, run: async (c) => call((await usersRoute()).GET(req("/api/admin/users", c), noParams)) },
    {
      name: "POST /api/admin/users",
      mutating: true,
      run: async (c, origin) =>
        call((await usersRoute()).POST(req("/api/admin/users", { ...c, origin, method: "POST", body: { email: "http@gmail.com", name: "Http", role: "cliente" } }), noParams)),
    },
    {
      name: "PATCH /api/admin/users/:id",
      mutating: true,
      run: async (c, origin) => {
        const id = String(sofiaId());
        return call((await userRoute()).PATCH(req(`/api/admin/users/${id}`, { ...c, origin, method: "PATCH", body: { name: "Sofi" } }), ctx(id)));
      },
    },
    {
      name: "DELETE /api/admin/users/:id",
      mutating: true,
      run: async (c, origin) => {
        const id = String(sofiaId());
        return call((await userRoute()).DELETE(req(`/api/admin/users/${id}`, { ...c, origin, method: "DELETE" }), ctx(id)));
      },
    },
    { name: "GET /api/admin/catalog", mutating: false, run: async (c) => call((await catalogRoute()).GET(req("/api/admin/catalog", c), noParams)) },
    {
      name: "POST /api/admin/categories",
      mutating: true,
      run: async (c, origin) =>
        call((await categoriesRoute()).POST(req("/api/admin/categories", { ...c, origin, method: "POST", body: { name: "Http" } }), noParams)),
    },
    {
      name: "PATCH /api/admin/categories/:id",
      mutating: true,
      run: async (c, origin) => {
        const id = String(catId("cafes"));
        return call((await categoryRoute()).PATCH(req(`/api/admin/categories/${id}`, { ...c, origin, method: "PATCH", body: { name: "Cafés!" } }), ctx(id)));
      },
    },
    {
      name: "DELETE /api/admin/categories/:id",
      mutating: true,
      run: async (c, origin) => {
        const id = String(db().prepare("INSERT INTO categories (slug, name, sort) VALUES (?, 'Vacía', 99)").run(`vacia-http-${++emptySeq}`).lastInsertRowid);
        return call((await categoryRoute()).DELETE(req(`/api/admin/categories/${id}`, { ...c, origin, method: "DELETE" }), ctx(id)));
      },
    },
    {
      name: "POST /api/admin/products",
      mutating: true,
      run: async (c, origin) =>
        call(
          (await productsRoute()).POST(
            req("/api/admin/products", { ...c, origin, method: "POST", body: { categoryId: catId("cafes"), name: "Http", price: 100 } }),
            noParams,
          ),
        ),
    },
    {
      name: "PATCH /api/admin/products/:id",
      mutating: true,
      run: async (c, origin) => {
        const id = String(productId("latte"));
        return call((await productRoute()).PATCH(req(`/api/admin/products/${id}`, { ...c, origin, method: "PATCH", body: { price: 3900 } }), ctx(id)));
      },
    },
  ];
}

describe("acceso a cada ruta de administración", () => {
  for (const ep of endpoints()) {
    describe(ep.name, () => {
      it("sin cookie → 401", async () => {
        const r = await ep.run({});
        expect(r.status).toBe(401);
        expect(r.body.error.code).toBe("UNAUTHENTICATED");
      });
      it("cocina en vc_staff_session → 403", async () => {
        const r = await ep.run({ staffToken: kitchenToken() });
        expect(r.status).toBe(403);
        expect(r.body.error.code).toBe("FORBIDDEN");
      });
      it("cliente (token en vc_staff_session) → 403", async () => {
        expect((await ep.run({ staffToken: customerToken() })).status).toBe(403);
      });
      it("admin con su token solo en la cookie del kiosco (vc_session) → 401: la ruta no la lee", async () => {
        expect((await ep.run({ token: adminToken() })).status).toBe(401);
      });
      it("cliente en vc_session y cocina en vc_staff_session (mismo navegador) → 403", async () => {
        expect((await ep.run({ token: customerToken(), staffToken: kitchenToken() })).status).toBe(403);
      });
      it("admin en vc_staff_session → 200", async () => {
        const r = await ep.run({ staffToken: adminToken() });
        expect(r.status, JSON.stringify(r.body)).toBe(200);
      });
      if (ep.mutating) {
        it("admin desde otro origen → 403; mismo origen → 200", async () => {
          const token = adminToken();
          const cross = await ep.run({ staffToken: token }, "http://evil.example");
          expect(cross.status).toBe(403);
          const port = await ep.run({ staffToken: token }, "http://localhost:3103");
          expect(port.status).toBe(403);
          const same = await ep.run({ staffToken: token }, "http://localhost");
          expect(same.status, JSON.stringify(same.body)).toBe(200);
        });
      }
    });
  }
});

describe("formas de respuesta y códigos", () => {
  it("GET users → { users } sin password_hash", async () => {
    const r = await call((await usersRoute()).GET(req("/api/admin/users", { staffToken: adminToken() }), noParams));
    expect(Array.isArray(r.body.users)).toBe(true);
    expect(r.body.users.length).toBeGreaterThan(0);
    expect(JSON.stringify(r.body)).not.toContain("password");
    expect(r.body.users[0]).not.toHaveProperty("password_hash");
  });

  it("POST users → { user } sin contraseña; inválido → 400; repetido → 400; no JSON → 400", async () => {
    const mod = await usersRoute();
    const token = adminToken();
    const ok = await call(
      mod.POST(req("/api/admin/users", { staffToken: token, method: "POST", body: { email: "Barista@VibeCoffee.local", name: "Barista", role: "cocina", password: "muysecreta" } }), noParams),
    );
    expect(ok.status).toBe(200);
    expect(ok.body.user).toMatchObject({ email: "barista@vibecoffee.local", role: "cocina", active: true });
    expect(JSON.stringify(ok.body)).not.toContain("muysecreta");
    expect(JSON.stringify(ok.body)).not.toContain("password");
    const dup = await call(mod.POST(req("/api/admin/users", { staffToken: token, method: "POST", body: { email: "SOFIA@gmail.com", name: "X", role: "cliente" } }), noParams));
    expect(dup.status).toBe(400);
    expect(dup.body.error.code).toBe("VALIDATION");
    const bad = await call(mod.POST(req("/api/admin/users", { staffToken: token, method: "POST", body: { email: "x", name: "", role: "rey" } }), noParams));
    expect(bad.status).toBe(400);
    const notJson = await call(mod.POST(req("/api/admin/users", { staffToken: token, method: "POST", body: "{nope" }), noParams));
    expect(notJson.status).toBe(400);
  });

  it("PATCH/DELETE users/:id: id inválido → 400, inexistente → 404; DELETE → { user } inactivo y revoca su sesión", async () => {
    const mod = await userRoute();
    const token = adminToken();
    expect((await call(mod.PATCH(req("/api/admin/users/abc", { staffToken: token, method: "PATCH", body: { name: "X" } }), ctx("abc")))).status).toBe(400);
    expect((await call(mod.PATCH(req("/api/admin/users/99999", { staffToken: token, method: "PATCH", body: { name: "X" } }), ctx("99999")))).status).toBe(404);
    expect((await call(mod.DELETE(req("/api/admin/users/abc", { staffToken: token, method: "DELETE" }), ctx("abc")))).status).toBe(400);
    expect((await call(mod.DELETE(req("/api/admin/users/99999", { staffToken: token, method: "DELETE" }), ctx("99999")))).status).toBe(404);

    const kiosk = customerToken();
    const id = String(sofiaId());
    const r = await call(mod.DELETE(req(`/api/admin/users/${id}`, { staffToken: token, method: "DELETE" }), ctx(id)));
    expect(r.status).toBe(200);
    expect(r.body.user).toMatchObject({ id: Number(id), active: false });
    expect(JSON.stringify(r.body)).not.toContain("password");
    expect(getSessionUser(kiosk)).toBeNull();
  });

  it("admin dándose de baja a sí mismo → 400", async () => {
    const mod = await userRoute();
    const { token, user } = loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD);
    const id = String(user.id);
    expect((await call(mod.DELETE(req(`/api/admin/users/${id}`, { staffToken: token, method: "DELETE" }), ctx(id)))).status).toBe(400);
    expect((await call(mod.PATCH(req(`/api/admin/users/${id}`, { staffToken: token, method: "PATCH", body: { role: "cocina" } }), ctx(id)))).status).toBe(400);
    expect(getSessionUser(token)?.role).toBe("admin");
  });

  it("catálogo: GET → Catalog; categorías y productos devuelven { category } / { product } / { ok: true }", async () => {
    const token = adminToken();
    const cat = await call((await catalogRoute()).GET(req("/api/admin/catalog", { staffToken: token }), noParams));
    expect(Array.isArray(cat.body.categories)).toBe(true);
    expect(Array.isArray(cat.body.products)).toBe(true);

    const created = await call((await categoriesRoute()).POST(req("/api/admin/categories", { staffToken: token, method: "POST", body: { name: "Nueva" } }), noParams));
    expect(created.body.category).toMatchObject({ name: "Nueva" });
    const id = String(created.body.category.id);
    const patched = await call((await categoryRoute()).PATCH(req(`/api/admin/categories/${id}`, { staffToken: token, method: "PATCH", body: { name: "Renombrada" } }), ctx(id)));
    expect(patched.body.category).toMatchObject({ id: Number(id), name: "Renombrada", slug: created.body.category.slug });

    const prod = await call(
      (await productsRoute()).POST(req("/api/admin/products", { staffToken: token, method: "POST", body: { categoryId: Number(id), name: "Cosa", price: 500, icon: "cookie" } }), noParams),
    );
    expect(prod.status).toBe(200);
    expect(prod.body.product).toMatchObject({ name: "Cosa", price: 500, icon: "cookie", available: true });
    const pid = String(prod.body.product.id);

    // categoría con productos → 409
    const conflict = await call((await categoryRoute()).DELETE(req(`/api/admin/categories/${id}`, { staffToken: token, method: "DELETE" }), ctx(id)));
    expect(conflict.status).toBe(409);
    expect(conflict.body.error.code).toBe("INVALID_TRANSITION");

    const pp = await call((await productRoute()).PATCH(req(`/api/admin/products/${pid}`, { staffToken: token, method: "PATCH", body: { available: false } }), ctx(pid)));
    expect(pp.body.product).toMatchObject({ id: Number(pid), available: false });

    // validación y existencia
    const badPrice = await call((await productRoute()).PATCH(req(`/api/admin/products/${pid}`, { staffToken: token, method: "PATCH", body: { price: 0 } }), ctx(pid)));
    expect(badPrice.status).toBe(400);
    expect((await call((await productRoute()).PATCH(req("/api/admin/products/abc", { staffToken: token, method: "PATCH", body: { price: 10 } }), ctx("abc")))).status).toBe(400);
    expect((await call((await productRoute()).PATCH(req("/api/admin/products/99999", { staffToken: token, method: "PATCH", body: { price: 10 } }), ctx("99999")))).status).toBe(404);
    expect((await call((await categoryRoute()).DELETE(req("/api/admin/categories/99999", { staffToken: token, method: "DELETE" }), ctx("99999")))).status).toBe(404);
    const badIcon = await call(
      (await productsRoute()).POST(req("/api/admin/products", { staffToken: token, method: "POST", body: { categoryId: Number(id), name: "Cosa", price: 500, icon: "dragon" } }), noParams),
    );
    expect(badIcon.status).toBe(400);

    // borrar una vacía → { ok: true }
    const empty = await call((await categoriesRoute()).POST(req("/api/admin/categories", { staffToken: token, method: "POST", body: { name: "Vacía" } }), noParams));
    const eid = String(empty.body.category.id);
    const del = await call((await categoryRoute()).DELETE(req(`/api/admin/categories/${eid}`, { staffToken: token, method: "DELETE" }), ctx(eid)));
    expect(del).toEqual({ status: 200, body: { ok: true } });
  });

  it("las respuestas de administración no se cachean", async () => {
    const res = await (await catalogRoute()).GET(req("/api/admin/catalog", { staffToken: adminToken() }), noParams);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
});
