import { handle } from "@/lib/session";
import { getAdminCatalog } from "@/lib/services/admin-catalog";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => getAdminCatalog(actor), "staff");
