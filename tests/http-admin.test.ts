// Tarea 2 — capa HTTP: /api/admin/** (cookie del personal) y GET /api/orders/last (cookie del kiosco).
import { describe, expect, it } from "vitest";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";
import * as usersRoute from "@/app/api/admin/users/route";
import * as userRoute from "@/app/api/admin/users/[id]/route";
import * as adminCatalogRoute from "@/app/api/admin/catalog/route";
import * as categoriesRoute from "@/app/api/admin/categories/route";
import * as categoryRoute from "@/app/api/admin/categories/[id]/route";
import * as productsRoute from "@/app/api/admin/products/route";
import * as productRoute from "@/app/api/admin/products/[id]/route";
import * as lastRoute from "@/app/api/orders/last/route";
import * as catalogRoute from "@/app/api/catalog/route";
import {
  ADMIN_EMAIL,
  CUSTOMER_EMAIL,
  CUSTOMER_WITHOUT_HISTORY,
  KITCHEN_EMAIL,
  MISSING_ID,
  STAFF_DEMO_PASSWORD,
  count,
  db,
  productId,
  useFreshDb,
  userId,
} from "./helpers";
import { call, ctx, noParams, req, type ReqOpts } from "./http-helpers";

useFreshDb();

const adminToken = () => loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD).token;
const kitchenToken = () => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
const customerToken = (email = CUSTOMER_EMAIL) => loginCustomer(email).token;
const cafesId = () => (db().prepare("SELECT id FROM categories WHERE slug = 'cafes'").get() as { id: number }).id;

type Endpoint = { name: string; run: (o: ReqOpts) => Promise<Response>; body?: () => unknown };

/** Todas las rutas de administración, con un cuerpo/id válido para cada una. */
function endpoints(): Endpoint[] {
  const latte = () => String(productId("latte"));
  const sofia = () => String(userId(CUSTOMER_EMAIL));
  return [
    { name: "GET /api/admin/users", run: (o) => usersRoute.GET(req("/api/admin/users", o), noParams) },
    {
      name: "POST /api/admin/users",
      body: () => ({ email: "nuevo@gmail.com", name: "Nuevo", role: "admin" }),
      run: (o) => usersRoute.POST(req("/api/admin/users", { method: "POST", ...o }), noParams),
    },
    {
      name: "PATCH /api/admin/users/:id",
      body: () => ({ role: "admin" }),
      run: (o) => userRoute.PATCH(req(`/api/admin/users/${sofia()}`, { method: "PATCH", ...o }), ctx(sofia())),
    },
    {
      name: "DELETE /api/admin/users/:id",
      run: (o) => userRoute.DELETE(req(`/api/admin/users/${sofia()}`, { method: "DELETE", ...o }), ctx(sofia())),
    },
    { name: "GET /api/admin/catalog", run: (o) => adminCatalogRoute.GET(req("/api/admin/catalog", o), noParams) },
    {
      name: "POST /api/admin/categories",
      body: () => ({ name: "Nueva" }),
      run: (o) => categoriesRoute.POST(req("/api/admin/categories", { method: "POST", ...o }), noParams),
    },
    {
      name: "PATCH /api/admin/categories/:id",
      body: () => ({ name: "Hackeado" }),
      run: (o) =>
        categoryRoute.PATCH(req(`/api/admin/categories/${cafesId()}`, { method: "PATCH", ...o }), ctx(String(cafesId()))),
    },
    {
      name: "DELETE /api/admin/categories/:id",
      run: (o) =>
        categoryRoute.DELETE(req(`/api/admin/categories/${cafesId()}`, { method: "DELETE", ...o }), ctx(String(cafesId()))),
    },
    {
      name: "POST /api/admin/products",
      body: () => ({ categoryId: cafesId(), name: "Colado", price: 1, icon: "latte" }),
      run: (o) => productsRoute.POST(req("/api/admin/products", { method: "POST", ...o }), noParams),
    },
    {
      name: "PATCH /api/admin/products/:id",
      body: () => ({ price: 1 }),
      run: (o) => productRoute.PATCH(req(`/api/admin/products/${latte()}`, { method: "PATCH", ...o }), ctx(latte())),
    },
  ];
}

function snapshot() {
  return {
    users: db().prepare("SELECT id, email, name, role, active FROM users ORDER BY id").all(),
    categories: db().prepare("SELECT * FROM categories ORDER BY id").all(),
    products: db().prepare("SELECT * FROM products ORDER BY id").all(),
  };
}

describe("/api/admin/**: solo admin (CA-21)", () => {
  it("sin sesión → 401 en cada ruta, también con cuerpo inválido", async () => {
    const before = snapshot();
    for (const e of endpoints()) {
      const r = await call(e.run({ body: e.body?.() }));
      expect(r.status, e.name).toBe(401);
      expect(r.body.error.code, e.name).toBe("UNAUTHENTICATED");
      if (e.body) expect((await call(e.run({ rawBody: "{no json" }))).status, `${e.name} (JSON inválido)`).toBe(401);
    }
    expect(snapshot()).toEqual(before);
  });

  it("cliente y cocina (en la cookie del personal) → 403 en cada ruta, también con cuerpo inválido", async () => {
    const before = snapshot();
    for (const staffToken of [customerToken(), kitchenToken()]) {
      for (const e of endpoints()) {
        const r = await call(e.run({ staffToken, body: e.body?.() }));
        expect(r.status, e.name).toBe(403);
        expect(r.body.error.code, e.name).toBe("FORBIDDEN");
        if (e.body) expect((await call(e.run({ staffToken, rawBody: "{no json" }))).status, `${e.name} (JSON inválido)`).toBe(403);
      }
    }
    expect(snapshot()).toEqual(before);
  });

  it("la sesión de admin en la cookie del kiosco no sirve → 401", async () => {
    const token = adminToken();
    for (const e of endpoints()) expect((await call(e.run({ token, body: e.body?.() }))).status, e.name).toBe(401);
  });

  it("POST/PATCH/DELETE desde otro origen → 403 aun siendo admin", async () => {
    const staffToken = adminToken();
    const before = snapshot();
    for (const e of endpoints().filter((x) => !x.name.startsWith("GET"))) {
      const r = await call(e.run({ staffToken, body: e.body?.(), origin: "http://evil.localhost:3000" }));
      expect(r.status, e.name).toBe(403);
    }
    expect(snapshot()).toEqual(before);
  });

  it("admin → 200 en cada ruta con la forma del contrato", async () => {
    const staffToken = adminToken();
    const vacia = db().prepare("INSERT INTO categories (slug, name, sort) VALUES ('vacia-test', 'Vacía', 50)").run();
    const vaciaId = String(vacia.lastInsertRowid);

    const users = await call(usersRoute.GET(req("/api/admin/users", { staffToken }), noParams));
    expect(users.status).toBe(200);
    expect(users.body.users.length).toBe(count("users"));
    for (const u of users.body.users) expect(u).not.toHaveProperty("password_hash");

    const created = await call(
      usersRoute.POST(req("/api/admin/users", { staffToken, method: "POST", body: { email: "Cocina3@VibeCoffee.local", name: "Cocina 3", role: "cocina" } }), noParams),
    );
    expect(created.status).toBe(200);
    expect(created.body.user).toMatchObject({ email: "cocina3@vibecoffee.local", role: "cocina", active: true });
    expect(loginStaff("cocina3@vibecoffee.local", STAFF_DEMO_PASSWORD).user.id).toBe(created.body.user.id);

    const id = String(created.body.user.id);
    const patched = await call(userRoute.PATCH(req(`/api/admin/users/${id}`, { staffToken, method: "PATCH", body: { name: "Cocina Tres" } }), ctx(id)));
    expect(patched.status).toBe(200);
    expect(patched.body.user).toMatchObject({ id: Number(id), name: "Cocina Tres", role: "cocina" });

    const deleted = await call(userRoute.DELETE(req(`/api/admin/users/${id}`, { staffToken, method: "DELETE" }), ctx(id)));
    expect(deleted.status).toBe(200);
    expect(deleted.body.user).toMatchObject({ id: Number(id), active: false });

    const cat = await call(adminCatalogRoute.GET(req("/api/admin/catalog", { staffToken }), noParams));
    expect(cat.status).toBe(200);
    expect(cat.body.categories.length).toBe(count("categories"));
    expect(cat.body.products.length).toBe(count("products"));

    const c = await call(categoriesRoute.POST(req("/api/admin/categories", { staffToken, method: "POST", body: { name: "Salados" } }), noParams));
    expect(c.status).toBe(200);
    expect(c.body.category).toMatchObject({ name: "Salados" });
    const cid = String(c.body.category.id);
    const cp = await call(categoryRoute.PATCH(req(`/api/admin/categories/${cid}`, { staffToken, method: "PATCH", body: { name: "Salado" } }), ctx(cid)));
    expect(cp.status).toBe(200);
    expect(cp.body.category).toMatchObject({ id: Number(cid), name: "Salado" });

    const p = await call(
      productsRoute.POST(
        req("/api/admin/products", { staffToken, method: "POST", body: { categoryId: Number(cid), name: "Chipá", price: 1500, icon: "generico" } }),
        noParams,
      ),
    );
    expect(p.status).toBe(200);
    expect(p.body.product).toMatchObject({ categoryId: Number(cid), name: "Chipá", price: 1500, icon: "generico", available: true });
    const pid = String(p.body.product.id);
    const pp = await call(productRoute.PATCH(req(`/api/admin/products/${pid}`, { staffToken, method: "PATCH", body: { price: 1700, available: false } }), ctx(pid)));
    expect(pp.status).toBe(200);
    expect(pp.body.product).toMatchObject({ id: Number(pid), price: 1700, available: false });

    // categoría con productos → 400; vacía → { ok: true }
    const withProducts = await call(categoryRoute.DELETE(req(`/api/admin/categories/${cid}`, { staffToken, method: "DELETE" }), ctx(cid)));
    expect(withProducts.status).toBe(400);
    expect(withProducts.body.error.code).toBe("VALIDATION");
    const del = await call(categoryRoute.DELETE(req(`/api/admin/categories/${vaciaId}`, { staffToken, method: "DELETE" }), ctx(vaciaId)));
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ ok: true });
    expect(count("categories", "id = ?", Number(vaciaId))).toBe(0);
  });

  it("los cambios del admin se ven en GET /api/catalog del kiosco", async () => {
    const staffToken = adminToken();
    const latte = String(productId("latte"));
    await call(productRoute.PATCH(req(`/api/admin/products/${latte}`, { staffToken, method: "PATCH", body: { price: 4321, available: false } }), ctx(latte)));
    const kiosk = await call(catalogRoute.GET(req("/api/catalog", { token: customerToken() }), noParams));
    expect(kiosk.status).toBe(200);
    expect(kiosk.body.products.find((p: { id: number }) => p.id === Number(latte))).toMatchObject({ price: 4321, available: false });
  });

  it("errores de admin: 400 VALIDATION con datos inválidos o JSON inválido; 404 con id inexistente o no numérico", async () => {
    const staffToken = adminToken();
    const v = async (p: Promise<Response>) => {
      const r = await call(p);
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe("VALIDATION");
    };
    await v(usersRoute.POST(req("/api/admin/users", { staffToken, method: "POST", body: { email: "SOFIA@gmail.com", name: "Dup", role: "cliente" } }), noParams));
    await v(usersRoute.POST(req("/api/admin/users", { staffToken, method: "POST", body: { email: "x@y.z", name: "X", role: "jefe" } }), noParams));
    await v(usersRoute.POST(req("/api/admin/users", { staffToken, method: "POST", rawBody: "{no json" }), noParams));
    await v(categoriesRoute.POST(req("/api/admin/categories", { staffToken, method: "POST", body: { name: "" } }), noParams));
    await v(productsRoute.POST(req("/api/admin/products", { staffToken, method: "POST", body: { categoryId: cafesId(), name: "X", price: "100", icon: "latte" } }), noParams));
    const latte = String(productId("latte"));
    await v(productRoute.PATCH(req(`/api/admin/products/${latte}`, { staffToken, method: "PATCH", body: { price: 0 } }), ctx(latte)));
    await v(productRoute.PATCH(req(`/api/admin/products/${latte}`, { staffToken, method: "PATCH", rawBody: "nope" }), ctx(latte)));
    const admin = String(userId(ADMIN_EMAIL));
    await v(userRoute.DELETE(req(`/api/admin/users/${admin}`, { staffToken, method: "DELETE" }), ctx(admin)));
    await v(userRoute.PATCH(req(`/api/admin/users/${admin}`, { staffToken, method: "PATCH", body: { role: "cocina" } }), ctx(admin)));

    const nf = async (p: Promise<Response>) => {
      const r = await call(p);
      expect(r.status).toBe(404);
      expect(r.body.error.code).toBe("NOT_FOUND");
    };
    for (const id of [String(MISSING_ID), "abc"]) {
      await nf(userRoute.PATCH(req(`/api/admin/users/${id}`, { staffToken, method: "PATCH", body: { name: "X" } }), ctx(id)));
      await nf(userRoute.DELETE(req(`/api/admin/users/${id}`, { staffToken, method: "DELETE" }), ctx(id)));
      await nf(categoryRoute.PATCH(req(`/api/admin/categories/${id}`, { staffToken, method: "PATCH", body: { name: "X" } }), ctx(id)));
      await nf(categoryRoute.DELETE(req(`/api/admin/categories/${id}`, { staffToken, method: "DELETE" }), ctx(id)));
      await nf(productRoute.PATCH(req(`/api/admin/products/${id}`, { staffToken, method: "PATCH", body: { price: 100 } }), ctx(id)));
    }
  });
});

describe("baja por HTTP corta la sesión previa (CA-16)", () => {
  it("cliente dado de baja: su cookie del kiosco da 401 y no puede volver a entrar", async () => {
    const kiosk = customerToken();
    expect((await call(catalogRoute.GET(req("/api/catalog", { token: kiosk }), noParams))).status).toBe(200);
    const id = String(userId(CUSTOMER_EMAIL));
    const r = await call(userRoute.DELETE(req(`/api/admin/users/${id}`, { staffToken: adminToken(), method: "DELETE" }), ctx(id)));
    expect(r.status).toBe(200);
    expect(getSessionUser(kiosk)).toBeNull();
    const after = await call(catalogRoute.GET(req("/api/catalog", { token: kiosk }), noParams));
    expect(after.status).toBe(401);
    expect((await call(lastRoute.GET(req("/api/orders/last", { token: kiosk }), noParams))).status).toBe(401);
    expect(() => loginCustomer(CUSTOMER_EMAIL)).toThrow();
  });

  it("personal dado de baja por PATCH active=false: su cookie del personal da 401", async () => {
    const otherAdmin = await call(
      usersRoute.POST(req("/api/admin/users", { staffToken: adminToken(), method: "POST", body: { email: "admin2@vibecoffee.local", name: "Admin 2", role: "admin" } }), noParams),
    );
    const token2 = loginStaff("admin2@vibecoffee.local", STAFF_DEMO_PASSWORD).token;
    expect((await call(usersRoute.GET(req("/api/admin/users", { staffToken: token2 }), noParams))).status).toBe(200);
    const id = String(otherAdmin.body.user.id);
    const r = await call(userRoute.PATCH(req(`/api/admin/users/${id}`, { staffToken: adminToken(), method: "PATCH", body: { active: false } }), ctx(id)));
    expect(r.status).toBe(200);
    expect(r.body.user.active).toBe(false);
    const after = await call(usersRoute.GET(req("/api/admin/users", { staffToken: token2 }), noParams));
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /api/orders/last", () => {
  it("cliente con historial → 200 con su pedido; camila → { order: null }", async () => {
    const sofia = loginCustomer(CUSTOMER_EMAIL);
    const r = await call(lastRoute.GET(req("/api/orders/last", { token: sofia.token }), noParams));
    expect(r.status).toBe(200);
    expect(r.body.order).not.toBeNull();
    expect(r.body.order.userId).toBe(sofia.user.id);
    expect(["pagado", "listo", "entregado"]).toContain(r.body.order.status);

    const camila = await call(lastRoute.GET(req("/api/orders/last", { token: customerToken(CUSTOMER_WITHOUT_HISTORY) }), noParams));
    expect(camila.status).toBe(200);
    expect(camila.body).toEqual({ order: null });
  });

  it("sin cookie del kiosco → 401 (la del personal no cuenta); cocina o admin en la cookie del kiosco → 403", async () => {
    const none = await call(lastRoute.GET(req("/api/orders/last"), noParams));
    expect(none.status).toBe(401);
    expect(none.body.error.code).toBe("UNAUTHENTICATED");
    expect((await call(lastRoute.GET(req("/api/orders/last", { staffToken: customerToken() }), noParams))).status).toBe(401);
    for (const token of [kitchenToken(), adminToken()]) {
      const r = await call(lastRoute.GET(req("/api/orders/last", { token }), noParams));
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe("FORBIDDEN");
    }
  });
});
