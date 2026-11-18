import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionToken, handle } from "@/lib/session";
import { logout } from "@/lib/services/auth";
import type { SessionScope } from "@/lib/contracts";

export const dynamic = "force-dynamic";

/** Cierra la sesión del kiosco, o la del personal con ?scope=staff. No toca la otra pantalla. */
export const POST = handle((_actor, req) => {
  const scope: SessionScope = req.nextUrl.searchParams.get("scope") === "staff" ? "staff" : "kiosk";
  logout(getSessionToken(req, scope));
  return clearSessionCookie(NextResponse.json({ ok: true }), scope);
});
