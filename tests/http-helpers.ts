// Utilidades para invocar Route Handlers directamente (sin servidor).
import { NextRequest } from "next/server";
import { SESSION_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/contracts";

export interface ReqOpts {
  /** Va en la cookie del kiosco. */
  token?: string;
  /** Va en la cookie del personal. */
  staffToken?: string;
  body?: unknown;
  /** Cuerpo crudo (p. ej. JSON inválido); gana sobre `body`. */
  rawBody?: string;
  method?: string;
  origin?: string;
}

export function req(url: string, opts: ReqOpts = {}): NextRequest {
  const headers = new Headers({ "content-type": "application/json", host: "localhost" });
  if (opts.origin) headers.set("origin", opts.origin);
  const cookies = [
    opts.token && `${SESSION_COOKIE}=${opts.token}`,
    opts.staffToken && `${STAFF_SESSION_COOKIE}=${opts.staffToken}`,
  ].filter(Boolean);
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  const body = opts.rawBody ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body));
  return new NextRequest(`http://localhost${url}`, { method: opts.method ?? "GET", headers, body });
}

export const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
export const noParams = { params: Promise.resolve({} as Record<string, never>) };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function call(p: Promise<Response> | Response): Promise<{ status: number; body: any }> {
  const r = await p;
  return { status: r.status, body: await r.json() };
}
