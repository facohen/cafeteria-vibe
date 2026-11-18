import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { updateProduct } from "@/lib/services/catalog-admin";

export const dynamic = "force-dynamic";

export const PATCH = handle<{ id: string }>(async (actor, req, { id }) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  // Cuerpo no JSON -> undefined: el servicio valida id y existencia antes y luego lo rechaza (VALIDATION).
  const body = await readJson(req).catch(() => undefined);
  return { product: updateProduct(actor, id, body) };
}, "staff");
