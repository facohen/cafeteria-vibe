import { handle } from "@/lib/session";
import { getAdminCatalog } from "@/lib/services/catalog-admin";

export const dynamic = "force-dynamic";

export const GET = handle((actor) => getAdminCatalog(actor), "staff");
