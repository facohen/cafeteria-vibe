import { handle } from "@/lib/session";
import { finishOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const POST = handle<{ id: string }>((actor, _req, { id }) => ({ order: finishOrder(actor, id) }));
