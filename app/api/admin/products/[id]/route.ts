import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { updateProduct } from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export const PATCH = handle<{ id: string }>(async (actor, req, { id }) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  return { product: updateProduct(actor, id, await readJson(req)) };
}, "staff");
