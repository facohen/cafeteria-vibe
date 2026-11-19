"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/catalogo", label: "Catálogo" },
  { href: "/admin/usuarios", label: "Usuarios y roles" },
];

export default function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="ad-tabs" aria-label="Secciones de administración">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`ad-tab ${path?.startsWith(t.href) ? "ad-tab--on" : ""}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
