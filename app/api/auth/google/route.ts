import { NextResponse } from "next/server";
import { getSessionToken, handle, readJson, setSessionCookie } from "@/lib/session";
import { loginCustomer, logout } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export const POST = handle(async (_actor, req) => {
  const body = await readJson(req);
  const email = typeof body === "object" && body !== null ? (body as { email?: unknown }).email : undefined;
  const { token, user } = loginCustomer(email);
  logout(getSessionToken(req)); // un login nuevo revoca la sesión previa del navegador
  return setSessionCookie(NextResponse.json({ user }), token);
});
