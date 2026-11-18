import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { deactivateUser, updateUser } from "@/lib/services/users";

export const dynamic = "force-dynamic";

export const PATCH = handle<{ id: string }>(async (actor, req, { id }) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  // Cuerpo no JSON -> undefined: el servicio valida id y existencia antes y luego lo rechaza (VALIDATION).
  const body = await readJson(req).catch(() => undefined);
  return { user: updateUser(actor, id, body) };
}, "staff");

export const DELETE = handle<{ id: string }>((actor, _req, { id }) => ({ user: deactivateUser(actor, id) }), "staff");
