// Capa HTTP: los Route Handlers respetan el orden sesión → rol → existencia y la cookie de sesión.
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { SESSION_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/contracts";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";
import * as orderRoute from "@/app/api/orders/[id]/route";
import * as payRoute from "@/app/api/orders/[id]/pay/route";
import * as readyRoute from "@/app/api/kitchen/orders/[id]/ready/route";
import * as ordersRoute from "@/app/api/orders/route";
import * as googleRoute from "@/app/api/auth/google/route";
import * as staffRoute from "@/app/api/auth/staff/route";
import * as logoutRoute from "@/app/api/auth/logout/route";
import * as kitchenRoute from "@/app/api/kitchen/orders/route";
import { CUSTOMER_EMAIL, KITCHEN_EMAIL, STAFF_DEMO_PASSWORD, db, useFreshDb } from "./helpers";

useFreshDb();

/** `token` va en la cookie del kiosco y `staffToken` en la del personal (pueden ir las dos). */
function req(
  url: string,
  opts: { token?: string; staffToken?: string; body?: string; method?: string; origin?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json", host: "localhost" });
  if (opts.origin) headers.set("origin", opts.origin);
  const cookies = [
    opts.token && `${SESSION_COOKIE}=${opts.token}`,
    opts.staffToken && `${STAFF_SESSION_COOKIE}=${opts.staffToken}`,
  ].filter(Boolean);
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  return new NextRequest(`http://localhost${url}`, { method: opts.method ?? "GET", headers, body: opts.body });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const noParams = { params: Promise.resolve({} as Record<string, never>) };
async function status(p: Promise<Response> | Response) {
  const r = await p;
  return { status: r.status, body: await r.json() };
}

describe("rutas con :id", () => {
  it("id no numérico sin sesión → 401 (sesión antes que existencia)", async () => {
    const r = await status(orderRoute.GET(req("/api/orders/abc"), ctx("abc")));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("UNAUTHENTICATED");
  });
  it("cocina pagando un id inválido → 403 (rol antes que existencia)", async () => {
    const { token } = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD);
    expect((await status(payRoute.POST(req("/api/orders/0/pay", { token, method: "POST" }), ctx("0")))).status).toBe(403);
  });
  it("cliente marcando listo un id inválido → 403 (aun con su token en la cookie del personal)", async () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    const r = readyRoute.POST(req("/api/kitchen/orders/x/ready", { staffToken: token, method: "POST" }), ctx("x"));
    expect((await status(r)).status).toBe(403);
  });
  it("la cocina no acepta la cookie del kiosco → 401", async () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    expect((await status(readyRoute.POST(req("/api/kitchen/orders/1/ready", { token, method: "POST" }), ctx("1")))).status).toBe(401);
  });
  it("cliente con id no numérico → 404; con id string numérico propio → 200", async () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    expect((await status(orderRoute.GET(req("/api/orders/abc", { token }), ctx("abc")))).status).toBe(404);
    const created = await status(
      ordersRoute.POST(req("/api/orders", { token, method: "POST", body: JSON.stringify({ items: [{ productId: 1, quantity: 1 }] }) }), noParams),
    );
    expect(created.status).toBe(200);
    const id = String(created.body.order.id);
    expect((await status(orderRoute.GET(req(`/api/orders/${id}`, { token }), ctx(id)))).body.order.id).toBe(Number(id));
  });
  it("body no JSON → 400 VALIDATION", async () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    const r = await status(ordersRoute.POST(req("/api/orders", { token, method: "POST", body: "{no json" }), noParams));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION");
  });
});

describe("origen", () => {
  it("POST desde otro origen (otro puerto) → 403; mismo origen → 200", async () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    const body = JSON.stringify({ items: [{ productId: 1, quantity: 1 }] });
    const cross = await status(ordersRoute.POST(req("/api/orders", { token, method: "POST", body, origin: "http://localhost:3103" }), noParams));
    expect(cross.status).toBe(403);
    const nullOrigin = await status(ordersRoute.POST(req("/api/orders", { token, method: "POST", body, origin: "null" }), noParams));
    expect(nullOrigin.status).toBe(403);
    const same = await status(ordersRoute.POST(req("/api/orders", { token, method: "POST", body, origin: "http://localhost" }), noParams));
    expect(same.status).toBe(200);
  });
});

describe("kiosco y personal en el mismo navegador", () => {
  it("entrar como cocina no pisa ni revoca la sesión del cliente, y cada uno sigue operando", async () => {
    const kiosk = loginCustomer(CUSTOMER_EMAIL).token;
    const res = await staffRoute.POST(
      req("/api/auth/staff", {
        token: kiosk,
        method: "POST",
        body: JSON.stringify({ email: KITCHEN_EMAIL, password: STAFF_DEMO_PASSWORD }),
      }),
      noParams,
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${STAFF_SESSION_COOKIE}=`);
    expect(setCookie).not.toMatch(new RegExp(`(^|[ ,])${SESSION_COOKIE}=`));
    const staff = setCookie.match(new RegExp(`${STAFF_SESSION_COOKIE}=([0-9a-f]+)`))![1];
    expect(getSessionUser(kiosk)?.role).toBe("cliente");

    const both = { token: kiosk, staffToken: staff };
    const body = JSON.stringify({ items: [{ productId: 1, quantity: 1 }] });
    const created = await status(ordersRoute.POST(req("/api/orders", { ...both, method: "POST", body }), noParams));
    expect(created.status).toBe(200);
    const id = String(created.body.order.id);
    expect((await status(payRoute.POST(req(`/api/orders/${id}/pay`, { ...both, method: "POST" }), ctx(id)))).status).toBe(200);
    const board = await status(kitchenRoute.GET(req("/api/kitchen/orders", both), noParams));
    expect(board.status).toBe(200);
    expect(board.body.orders.map((o: { id: number }) => o.id)).toContain(Number(id));
    expect((await status(readyRoute.POST(req(`/api/kitchen/orders/${id}/ready`, { ...both, method: "POST" }), ctx(id)))).status).toBe(200);
    expect((await status(orderRoute.GET(req(`/api/orders/${id}`, both), ctx(id)))).body.order.status).toBe("listo");
  });
  it("salir del personal no cierra el kiosco, y viceversa", async () => {
    const kiosk = loginCustomer(CUSTOMER_EMAIL).token;
    const staff = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
    await logoutRoute.POST(req("/api/auth/logout?scope=staff", { token: kiosk, staffToken: staff, method: "POST" }), noParams);
    expect(getSessionUser(staff)).toBeNull();
    expect(getSessionUser(kiosk)?.role).toBe("cliente");
    const staff2 = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
    await logoutRoute.POST(req("/api/auth/logout", { token: kiosk, staffToken: staff2, method: "POST" }), noParams);
    expect(getSessionUser(kiosk)).toBeNull();
    expect(getSessionUser(staff2)?.role).toBe("cocina");
  });
});

describe("sesión", () => {
  it("login setea cookie httpOnly y revoca la sesión previa del navegador", async () => {
    const old = loginCustomer(CUSTOMER_EMAIL).token;
    const res = await googleRoute.POST(
      req("/api/auth/google", { token: old, method: "POST", body: JSON.stringify({ email: CUSTOMER_EMAIL }) }),
      noParams,
    );
    expect(res.status).toBe(200);
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("max-age=");
    expect(getSessionUser(old)).toBeNull();
  });
  it("una sesión de más de 12 h vence", () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    db().prepare("UPDATE sessions SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-13 hours') WHERE token = ?").run(token);
    expect(getSessionUser(token)).toBeNull();
  });
});
