"use client";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { ProductIcon } from "@/components/icons";

/** Paso (a): pantalla de bienvenida. Todo el centro es un único botón gigante. */
export function Welcome({ onStart, notice }: { onStart: () => void; notice?: string | null }) {
  return (
    <div className="k-welcome">
      <header className="k-welcome__top">
        <Brand />
      </header>

      <button type="button" className="k-welcome__tap" onClick={onStart}>
        <span className="k-welcome__icons" aria-hidden>
          <ProductIcon icon="cappuccino" size={150} />
          <ProductIcon icon="medialuna" size={150} />
          <ProductIcon icon="jugo" size={150} />
        </span>
        <span className="k-welcome__title">¡Hola! Pedí tu café acá</span>
        <span className="k-welcome__sub">Elegís, pagás con QR y te avisamos cuando está listo.</span>
        <span className="k-welcome__cta">Tocá para pedir</span>
      </button>

      {notice && (
        <p className="k-welcome__notice" role="status">
          {notice}
        </p>
      )}

      <footer className="k-footer">
        <span className="vc-muted">Take away · Vibe Coffee</span>
        <Link href="/personal" className="k-footer__link">
          Personal
        </Link>
      </footer>
    </div>
  );
}
