import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { deleteCategory, updateCategory } from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export const PATCH = handle<{ id: string }>(async (actor, req, { id }) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  return { category: updateCategory(actor, id, await readJson(req)) };
}, "staff");

export const DELETE = handle<{ id: string }>((actor, _req, { id }) => {
  deleteCategory(actor, id);
  return { ok: true };
}, "staff");
