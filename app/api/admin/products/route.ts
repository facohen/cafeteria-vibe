import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { createProduct } from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export const POST = handle(async (actor, req) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  return { product: createProduct(actor, await readJson(req)) };
}, "staff");
