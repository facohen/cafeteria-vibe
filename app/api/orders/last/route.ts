// «Pedí lo de siempre»: último pedido pagado del cliente del kiosco. Segmento estático: gana a [id].
import { handle } from "@/lib/session";
import { getLastOrder } from "@/lib/services/orders";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => ({ order: getLastOrder(actor) }));
