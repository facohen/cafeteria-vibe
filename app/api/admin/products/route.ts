import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { createProduct } from "@/lib/services/catalog-admin";

export const dynamic = "force-dynamic";

export const POST = handle(async (actor, req) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  const body = await readJson(req);
  return { product: createProduct(actor, body) };
}, "staff");
