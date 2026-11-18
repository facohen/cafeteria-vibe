// Utilidades para probar Route Handlers sin servidor (como tests/http.test.ts).
import { NextRequest } from "next/server";
import { SESSION_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/contracts";

/** `token` va en la cookie del kiosco y `staffToken` en la del personal (pueden ir las dos). */
export function req(
  url: string,
  opts: { token?: string; staffToken?: string; body?: unknown; method?: string; origin?: string } = {},
): NextRequest {
  const headers = new Headers({ "content-type": "application/json", host: "localhost" });
  if (opts.origin) headers.set("origin", opts.origin);
  const cookies = [
    opts.token && `${SESSION_COOKIE}=${opts.token}`,
    opts.staffToken && `${STAFF_SESSION_COOKIE}=${opts.staffToken}`,
  ].filter(Boolean);
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  const body = opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body);
  return new NextRequest(`http://localhost${url}`, { method: opts.method ?? "GET", headers, body });
}

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
export const noParams = { params: Promise.resolve({} as Record<string, never>) };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call(p: Promise<Response> | Response): Promise<{ status: number; body: any }> {
  const r = await p;
  return { status: r.status, body: await r.json() };
}
