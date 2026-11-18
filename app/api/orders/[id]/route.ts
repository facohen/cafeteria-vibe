import { handle } from "@/lib/session";
import { getOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const GET = handle<{ id: string }>((actor, _req, { id }) => ({ order: getOrder(actor, id) }));
