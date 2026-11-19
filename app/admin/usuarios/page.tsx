// Administración de usuarios y roles. Solo rol "admin"; cada ruta /api/admin/users** vuelve a verificar.
import { redirect } from "next/navigation";
import { STAFF_DEMO_PASSWORD } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { listUsers } from "@/lib/services/users";
import UsersAdmin from "./UsersAdmin";
import "./usuarios.css";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/personal");
  return <UsersAdmin initialUsers={listUsers(user)} meId={user.id} demoPassword={STAFF_DEMO_PASSWORD} />;
}
