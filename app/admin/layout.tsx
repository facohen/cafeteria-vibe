// Marco de administración (coordinador): verifica rol admin, barra superior y pestañas.
// Cada página hija vuelve a verificar el rol (los layouts no se re-ejecutan en cada navegación).
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Brand } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "../personal/LogoutButton";
import AdminNav from "./AdminNav";
import "../personal/staff.css";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser("staff");
  if (!user || user.role !== "admin") redirect("/personal");
  return (
    <div className="st-page">
      <header className="st-top">
        <Brand subtitle="Administración" />
        <AdminNav />
        <div className="st-top__right">
          <span className="vc-muted" style={{ fontWeight: 800 }}>{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="ad-main">{children}</main>
    </div>
  );
}
