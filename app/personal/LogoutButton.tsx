"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Cierra la sesión del personal y vuelve a la entrada. */
export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/personal");
    router.refresh();
  }
  return (
    <Button variant="secondary" size="sm" onClick={logout} disabled={busy}>
      {busy ? "Saliendo…" : "Salir"}
    </Button>
  );
}
