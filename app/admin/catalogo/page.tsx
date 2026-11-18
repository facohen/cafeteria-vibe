// Administración del catálogo: categorías y productos. Verifica rol admin en el servidor.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAdminCatalog } from "@/lib/services/catalog-admin";
import CatalogAdmin from "./CatalogAdmin";
import "./catalogo.css";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const user = await getCurrentUser("staff");
  if (!user || user.role !== "admin") redirect("/personal");
  const catalog = getAdminCatalog(user);
  return <CatalogAdmin initial={catalog} />;
}
