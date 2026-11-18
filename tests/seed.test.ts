import { describe, expect, it } from "vitest";
import { SEED, seed } from "@/lib/db";
import { db, useFreshDb } from "./helpers";

useFreshDb();

const count = (table: string) => (db().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("semilla idempotente", () => {
  it("openDb carga la semilla", () => {
    expect(count("users")).toBe(SEED.users.length);
    expect(count("categories")).toBe(SEED.categories.length);
    expect(count("products")).toBe(SEED.products.length);
  });

  it("correr seed dos veces no duplica usuarios, categorías ni productos", () => {
    seed(db());
    seed(db());
    expect(count("users")).toBe(SEED.users.length);
    expect(count("categories")).toBe(SEED.categories.length);
    expect(count("products")).toBe(SEED.products.length);
  });

  it("no pisa un precio editado ni la contraseña existente", () => {
    db().prepare("UPDATE products SET price = 9999 WHERE slug = 'latte'").run();
    const hashBefore = (db().prepare("SELECT password_hash FROM users WHERE email = 'cocina@vibecoffee.local'").get() as {
      password_hash: string;
    }).password_hash;
    seed(db());
    seed(db());
    expect((db().prepare("SELECT price FROM products WHERE slug = 'latte'").get() as { price: number }).price).toBe(9999);
    expect(
      (db().prepare("SELECT password_hash FROM users WHERE email = 'cocina@vibecoffee.local'").get() as { password_hash: string })
        .password_hash,
    ).toBe(hashBefore);
  });

  it("clientes sin contraseña; personal con hash", () => {
    const rows = db().prepare("SELECT role, password_hash FROM users").all() as { role: string; password_hash: string | null }[];
    for (const r of rows) {
      if (r.role === "cliente") expect(r.password_hash).toBeNull();
      else expect(r.password_hash).toEqual(expect.any(String));
    }
  });
});
