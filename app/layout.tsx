import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Vibe Coffee", description: "Kiosco de autopedido take away" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
