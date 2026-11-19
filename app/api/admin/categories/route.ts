import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { createCategory } from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export const POST = handle(async (actor, req) => {
  requireRole(actor, "admin"); // sesión y rol antes de leer el cuerpo
  return { category: createCategory(actor, await readJson(req)) };
}, "staff");
