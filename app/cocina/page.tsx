// Tablero de cocina. Solo rol "cocina"; la API vuelve a verificar cada operación.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import KitchenBoard from "./KitchenBoard";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "cocina") redirect("/personal");
  return <KitchenBoard userName={user.name} />;
}
