import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionToken, handle } from "@/lib/session";
import { logout } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export const POST = handle((_actor, req) => {
  logout(getSessionToken(req));
  return clearSessionCookie(NextResponse.json({ ok: true }));
});
