// Entrada única del personal (cocina y administración). Pública.
import { listDemoAccounts } from "@/lib/services/auth";
import StaffLogin from "./StaffLogin";

export const dynamic = "force-dynamic";

export default function PersonalPage() {
  const demo = listDemoAccounts();
  // Una cuenta de demo por rol, cocina primero (es la precargada por defecto).
  const staff = (["cocina", "admin"] as const)
    .map((role) => demo.staff.find((a) => a.role === role))
    .filter((a): a is (typeof demo.staff)[number] => Boolean(a));
  return <StaffLogin accounts={staff} demoPassword={demo.staffDemoPassword} />;
}
