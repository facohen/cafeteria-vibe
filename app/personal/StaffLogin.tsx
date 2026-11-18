"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand, Button, Card, api } from "@/components/ui";
import type { DemoAccounts, User } from "@/lib/contracts";
import "./staff.css";

type StaffAccount = DemoAccounts["staff"][number];

const ROLE_LABEL: Record<StaffAccount["role"], string> = { cocina: "Cocina", admin: "Administración" };

export default function StaffLogin({ accounts, demoPassword }: { accounts: StaffAccount[]; demoPassword: string }) {
  const router = useRouter();
  const first = accounts[0];
  const [email, setEmail] = useState(first?.email ?? "");
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pick(acc: StaffAccount) {
    setEmail(acc.email);
    setPassword(demoPassword);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ user: User; redirect: string }>("/api/auth/staff", { json: { email, password } });
      router.push(res.redirect);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 401 ? "El email o la contraseña no son correctos." : "No pudimos entrar. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="st-center">
      <Card className="st-login">
        <Brand subtitle="Personal" />
        <h1 className="st-title">Entrada del personal</h1>
        <p className="vc-muted st-lead">Cocina y administración entran por acá. Elegí una cuenta de demo o usá la tuya.</p>

        {accounts.length > 0 && (
          <div className="st-chips" role="group" aria-label="Cuenta de demo">
            {accounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className={`st-chip ${email === acc.email ? "st-chip--on" : ""}`}
                aria-pressed={email === acc.email}
                onClick={() => pick(acc)}
              >
                {ROLE_LABEL[acc.role]}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="st-form">
          <label className="st-field">
            <span>Email</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="st-field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="vc-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" block disabled={loading || !email || !password}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <Link href="/" className="st-back">
          ← Volver al kiosco
        </Link>
      </Card>
    </main>
  );
}
