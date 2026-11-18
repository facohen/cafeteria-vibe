import { handle } from "@/lib/session";
import { cancelOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const POST = handle<{ id: string }>((actor, _req, { id }) => ({ order: cancelOrder(actor, id) }));
