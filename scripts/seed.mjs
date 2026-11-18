// npm run seed — aplica esquema y semilla idempotente sobre data/vibe.db (o VIBE_DB_PATH).
// Node 24 carga lib/db.ts directamente (type stripping).
import path from "node:path";
const { openDb } = await import("../lib/db.ts");
const file = process.env.VIBE_DB_PATH || path.join(process.cwd(), "data", "vibe.db");
const db = openDb(file);
const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
console.log(`Semilla aplicada en ${file}: ${count("users")} usuarios, ${count("categories")} categorías, ${count("products")} productos.`);
db.close();
