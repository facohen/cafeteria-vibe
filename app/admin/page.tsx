// /admin → la sección por defecto es el catálogo (el layout ya verificó el rol; la página destino vuelve a hacerlo).
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/personal");
  redirect("/admin/catalogo");
}
