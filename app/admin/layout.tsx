// Administración (tarea 2): barra superior y pestañas compartidas. Solo rol "admin".
// Ojo: el layout NO es el control de acceso; cada página y cada ruta /api/admin/** vuelve a verificar.
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "../personal/LogoutButton";
import AdminTabs from "./AdminTabs";
import "../personal/staff.css";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/personal");
  return (
    <div className="st-page">
      <header className="st-top">
        <Brand subtitle="Administración" />
        <AdminTabs />
        <div className="st-top__right">
          <span className="vc-muted" style={{ fontWeight: 800 }}>{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="ad-main">{children}</main>
    </div>
  );
}
