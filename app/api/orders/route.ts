import { handle, readJson } from "@/lib/session";
import { requireRole } from "@/lib/services/auth";
import { createOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const POST = handle(async (actor, req) => {
  requireRole(actor, "cliente"); // sesión y rol antes de validar el cuerpo
  const body = await readJson(req);
  return { order: createOrder(actor, body) };
});
