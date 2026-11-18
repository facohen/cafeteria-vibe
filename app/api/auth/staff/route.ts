import { NextResponse } from "next/server";
import { getSessionToken, handle, readJson, setSessionCookie } from "@/lib/session";
import { loginStaff, logout } from "@/lib/services/auth";

export const dynamic = "force-dynamic";

export const POST = handle(async (_actor, req) => {
  const body = await readJson(req);
  const b = (typeof body === "object" && body !== null ? body : {}) as { email?: unknown; password?: unknown };
  const { token, user } = loginStaff(b.email, b.password);
  const redirect = user.role === "admin" ? "/admin" : "/cocina";
  logout(getSessionToken(req, "staff")); // un login nuevo revoca la sesión previa del personal en este navegador
  return setSessionCookie(NextResponse.json({ user, redirect }), token, "staff");
}, "staff");
