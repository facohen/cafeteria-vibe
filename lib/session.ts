// Sesión HTTP (solo servidor): cookie → usuario, y helper para Route Handlers.
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  AppError,
  ERROR_STATUS,
  SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  type ApiError,
  type SessionScope,
  type SessionUser,
} from "@/lib/contracts";
import { getSessionUser, SESSION_TTL_HOURS } from "@/lib/services/auth";

/** Nombre de la cookie de cada pantalla (kiosco o personal). */
export function cookieName(scope: SessionScope): string {
  return scope === "staff" ? STAFF_SESSION_COOKIE : SESSION_COOKIE;
}

/** Usuario de la sesión actual en Server Components. Por defecto, la del personal (/cocina, /admin). */
export async function getCurrentUser(scope: SessionScope = "staff"): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUser(store.get(cookieName(scope))?.value ?? null);
}

/** Token de sesión de la cookie del request para esa pantalla. */
export function getSessionToken(req: NextRequest, scope: SessionScope = "kiosk"): string | null {
  return req.cookies.get(cookieName(scope))?.value ?? null;
}

const cookieBase = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  // Secure solo si se sirve por HTTPS (VIBE_COOKIE_SECURE=1); en la demo local se usa HTTP.
  secure: process.env.VIBE_COOKIE_SECURE === "1",
  maxAge: SESSION_TTL_HOURS * 3600,
});

export function setSessionCookie(res: NextResponse, token: string, scope: SessionScope = "kiosk"): NextResponse {
  res.cookies.set(cookieName(scope), token, cookieBase());
  return res;
}

export function clearSessionCookie(res: NextResponse, scope: SessionScope = "kiosk"): NextResponse {
  res.cookies.set(cookieName(scope), "", { ...cookieBase(), maxAge: 0 });
  return res;
}

/** Lee el cuerpo JSON; si no es JSON válido → VALIDATION. */
export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("VALIDATION", "El cuerpo debe ser JSON válido");
  }
}

export function errorResponse(err: unknown): NextResponse<ApiError> {
  if (err instanceof AppError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: ERROR_STATUS[err.code] });
  }
  console.error("[api] error inesperado:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Error interno del servidor" } } satisfies ApiError,
    { status: 500 },
  );
}

type Params = Record<string, string | string[] | undefined>;
type Handler<P extends Params> = (
  actor: SessionUser | null,
  req: NextRequest,
  params: P,
) => unknown | Promise<unknown>;

/** Host de un header Origin; null si es "null" u otro valor no parseable (→ se rechaza). */
function originHost(origin: string): string | null {
  try {
    return new URL(origin).host || null;
  } catch {
    return null;
  }
}

/**
 * Envuelve un Route Handler: resuelve el actor desde la cookie de su pantalla (`scope`: "kiosk" por
 * defecto, "staff" para el personal), espera `params` (Promise en Next 16), serializa el resultado
 * como JSON (o lo devuelve tal cual si ya es un Response) y traduce errores.
 */
export function handle<P extends Params = Record<string, never>>(fn: Handler<P>, scope: SessionScope = "kiosk") {
  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      // Anti-CSRF: un navegador siempre manda Origin en POST; si es de otro origen (incluso otro
      // puerto del mismo host) se rechaza antes de tocar la sesión.
      const origin = req.headers.get("origin");
      if (req.method !== "GET" && origin && originHost(origin) !== req.headers.get("host")) {
        throw new AppError("FORBIDDEN", "Origen no permitido");
      }
      const actor = getSessionUser(getSessionToken(req, scope));
      const params = ((await ctx?.params) ?? {}) as P;
      const result = await fn(actor, req, params);
      if (result instanceof Response) {
        result.headers.set("cache-control", "no-store");
        return result;
      }
      return NextResponse.json(result ?? { ok: true }, { headers: { "cache-control": "no-store" } });
    } catch (err) {
      return errorResponse(err);
    }
  };
}
