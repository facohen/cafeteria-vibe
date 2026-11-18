"use client";
import { useEffect, useState } from "react";
import type { DemoAccounts } from "@/lib/contracts";
import { api } from "@/components/ui";

type Customer = DemoAccounts["customers"][number];

const AVATAR_COLORS = ["#7ed957", "#f7a531", "#8ab4f8", "#f28b82", "#c58af9", "#78d9ec"];

/** Paso (b): selector de cuentas estilo Google (simulado: no hay OAuth, se elige una cuenta de demo). */
export function AccountPicker({
  onPick,
  onClose,
  busyEmail,
  error,
}: {
  onPick: (email: string) => void;
  onClose: () => void;
  busyEmail: string | null;
  error: string | null;
}) {
  const [accounts, setAccounts] = useState<Customer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<DemoAccounts>("/api/auth/demo-accounts")
      .then((d) => !cancelled && setAccounts(d.customers))
      .catch((e: Error) => !cancelled && setLoadError(e.message || "No pudimos cargar las cuentas."));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="k-modal" role="dialog" aria-modal="true" aria-labelledby="k-picker-title" onClick={onClose}>
      <div className="k-picker" onClick={(e) => e.stopPropagation()}>
        <div className="k-picker__head">
          <span className="k-picker__google" aria-hidden>
            <span style={{ color: "#4285f4" }}>G</span>
          </span>
          <span className="k-picker__brand">Continuar con Google</span>
          <span className="k-picker__demo">simulado</span>
        </div>
        <h2 id="k-picker-title" className="k-picker__title">
          Elegí tu cuenta
        </h2>
        <p className="k-picker__sub">para continuar en Vibe Coffee</p>

        <ul className="k-picker__list">
          {!accounts && !loadError && <li className="k-picker__loading">Cargando cuentas…</li>}
          {accounts?.length === 0 && <li className="k-picker__loading">No hay cuentas de cliente disponibles.</li>}
          {accounts?.map((a, i) => (
            <li key={a.email}>
              <button
                type="button"
                className="k-picker__account"
                onClick={() => onPick(a.email)}
                disabled={busyEmail !== null}
              >
                <span className="k-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }} aria-hidden>
                  {a.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="k-picker__who">
                  <strong>{a.name}</strong>
                  <span>{a.email}</span>
                </span>
                {busyEmail === a.email && <span className="k-spinner" aria-label="Entrando" />}
              </button>
            </li>
          ))}
        </ul>

        {(loadError || error) && (
          <p className="vc-error k-picker__error" role="alert">
            {loadError || error}
          </p>
        )}

        <p className="k-picker__legal">
          Es una demo: no se conecta con Google ni comparte datos. Solo abre una sesión en este kiosco.
        </p>
        <button type="button" className="vc-btn vc-btn--secondary vc-btn--block" onClick={onClose}>
          Volver
        </button>
      </div>
    </div>
  );
}
