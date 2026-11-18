// «Pedí lo de siempre»: último pedido del cliente del kiosco (cookie vc_session).
// Segmento estático: Next lo resuelve antes que /api/orders/[id].
import { handle } from "@/lib/session";
import { getLastOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => ({ order: getLastOrder(actor) }));
