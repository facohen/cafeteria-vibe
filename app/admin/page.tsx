// Administración mínima (tarea 1). Solo rol "admin".
import { redirect } from "next/navigation";
import { Brand, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "../personal/LogoutButton";
import "../personal/staff.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/personal");
  return (
    <div className="st-page">
      <header className="st-top">
        <Brand subtitle="Administración" />
        <LogoutButton />
      </header>
      <main className="st-admin">
        <Card className="st-admin__card">
          <h1>¡Hola, {user.name}!</h1>
          <p className="st-admin__notice">
            La gestión de usuarios, roles, categorías, productos, precios y disponibilidad se construye en la tarea 2.
          </p>
          <p className="vc-muted" style={{ margin: 0 }}>
            Por ahora podés salir y entrar con la cuenta de cocina para ver el tablero de pedidos.
          </p>
        </Card>
      </main>
    </div>
  );
}
