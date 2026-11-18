import { handle } from "@/lib/session";
import { listKitchenOrders } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => ({ orders: listKitchenOrders(actor) }), "staff");
