import { handle } from "@/lib/session";
import { getCatalog } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => getCatalog(actor));
