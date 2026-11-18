import type { NextConfig } from "next";
// NEXT_DIST_DIR permite varias instancias de dev en paralelo (una por agente).
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  distDir: process.env.NEXT_DIST_DIR || ".next",
};
export default nextConfig;
