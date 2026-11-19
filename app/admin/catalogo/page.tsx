// /admin/catalogo — administración del catálogo (solo rol admin; el layout no es el control de acceso).
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAdminCatalog } from "@/lib/services/admin-catalog";
import CatalogAdmin from "./CatalogAdmin";
import "./catalogo.css";

export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/personal");
  const catalog = getAdminCatalog(user);
  return <CatalogAdmin initial={catalog} />;
}
