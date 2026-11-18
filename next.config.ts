import type { NextConfig } from "next";
// NEXT_DIST_DIR permite varias instancias de dev en paralelo (una por agente).
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // La demo con dos ventanas abre el kiosco en 127.0.0.1 (otro origen = otra cookie). Next en dev
  // solo permite localhost y sus subdominios; sin esto falla el WebSocket de recarga (HMR).
  allowedDevOrigins: ["127.0.0.1"],
};
export default nextConfig;
