import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { createUser, listUsers } from "@/lib/services/users";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => ({ users: listUsers(actor) }), "staff");

export const POST = handle(async (actor, req) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  const body = await readJson(req);
  return { user: createUser(actor, body) };
}, "staff");
