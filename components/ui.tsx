// COMPONENTES DE INTERFAZ COMPARTIDOS — usar en kiosco, cocina y administración.
// Contrato: docs/TECNICO.md §Diseño. Estilos en app/globals.css (clases vc-*).
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { ApiError, OrderStatus } from "@/lib/contracts";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  block,
  size,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; size?: "sm" }) {
  const cls = ["vc-btn", `vc-btn--${variant}`, block && "vc-btn--block", size && `vc-btn--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...rest} />;
}

export function Card({ children, className = "", ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`vc-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Logo de la marca. */
export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <span className="vc-brand">
      <span className="vc-brand__dot" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1f2a1f" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
          <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
        </svg>
      </span>
      Vibe Coffee
      {subtitle && <span className="vc-muted" style={{ fontWeight: 700, fontSize: "1rem" }}>· {subtitle}</span>}
    </span>
  );
}

/** Formato de precio ARS: 3400 -> "$ 3.400". */
export function formatPrice(n: number): string {
  return "$ " + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export function Price({ value }: { value: number }) {
  return <span style={{ fontWeight: 800 }}>{formatPrice(value)}</span>;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente_pago: "Esperando pago",
  pagado: "En preparación",
  listo: "¡Listo para retirar!",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = status === "listo" ? "green" : status === "pagado" || status === "pendiente_pago" ? "warn" : "";
  return <span className={`vc-badge ${tone ? `vc-badge--${tone}` : ""}`}>{STATUS_LABEL[status]}</span>;
}

/** Número de pedido visible: #0042 */
export function orderNumber(id: number): string {
  return "#" + String(id).padStart(4, "0");
}

/** fetch JSON para el cliente: lanza Error con el mensaje de la API si falla. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as ApiError)?.error?.message ?? `Error ${res.status}`) as Error & { status?: number; code?: string };
    err.status = res.status;
    err.code = (data as ApiError)?.error?.code;
    throw err;
  }
  return data as T;
}
