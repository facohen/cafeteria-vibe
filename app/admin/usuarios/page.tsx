// Administración de usuarios y roles. Verifica rol admin en el servidor (el layout no se re-ejecuta
// en cada navegación) y carga la lista inicial.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listUsers } from "@/lib/services/users";
import UsersAdmin from "./UsersAdmin";
import "./usuarios.css";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const user = await getCurrentUser("staff");
  if (!user || user.role !== "admin") redirect("/personal");
  return <UsersAdmin initialUsers={listUsers(user)} meId={user.id} />;
}
