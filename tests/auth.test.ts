import { describe, expect, it } from "vitest";
import { getSessionUser, listDemoAccounts, loginCustomer, loginStaff, logout, requireRole } from "@/lib/services/auth";
import {
  ADMIN_EMAIL,
  CUSTOMER_EMAIL,
  KITCHEN_EMAIL,
  STAFF_DEMO_PASSWORD,
  createCustomer,
  db,
  expectCode,
  useFreshDb,
} from "./helpers";

useFreshDb();

describe("loginCustomer", () => {
  it("cliente activo existente entra y obtiene token válido", () => {
    const { token, user } = loginCustomer(CUSTOMER_EMAIL);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(user).toMatchObject({ email: CUSTOMER_EMAIL, role: "cliente", active: true });
    expect(getSessionUser(token)?.id).toBe(user.id);
  });

  it("token: 32 bytes aleatorios en hex y distinto en cada login", () => {
    const a = loginCustomer(CUSTOMER_EMAIL).token;
    const b = loginCustomer(CUSTOMER_EMAIL).token;
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("email de personal → UNAUTHENTICATED", () => {
    expectCode(() => loginCustomer(KITCHEN_EMAIL), "UNAUTHENTICATED");
    expectCode(() => loginCustomer(ADMIN_EMAIL), "UNAUTHENTICATED");
  });

  it("email inexistente → UNAUTHENTICATED", () => {
    expectCode(() => loginCustomer("nadie@gmail.com"), "UNAUTHENTICATED");
  });

  it("cliente inactivo → UNAUTHENTICATED", () => {
    createCustomer("baja@gmail.com", "Baja", false);
    expectCode(() => loginCustomer("baja@gmail.com"), "UNAUTHENTICATED");
  });

  it("el User devuelto no expone password_hash", () => {
    const { user } = loginCustomer(CUSTOMER_EMAIL);
    expect(user).not.toHaveProperty("password_hash");
    expect(user).not.toHaveProperty("passwordHash");
  });
});

describe("loginStaff", () => {
  it("cocina con contraseña correcta", () => {
    const { token, user } = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD);
    expect(user).toMatchObject({ email: KITCHEN_EMAIL, role: "cocina", active: true });
    expect(getSessionUser(token)?.role).toBe("cocina");
  });

  it("admin con contraseña correcta", () => {
    const { token, user } = loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD);
    expect(user.role).toBe("admin");
    expect(getSessionUser(token)?.role).toBe("admin");
  });

  it("contraseña mala → UNAUTHENTICATED", () => {
    expectCode(() => loginStaff(KITCHEN_EMAIL, "mala"), "UNAUTHENTICATED");
    expectCode(() => loginStaff(ADMIN_EMAIL, ""), "UNAUTHENTICATED");
  });

  it("email de cliente → UNAUTHENTICATED (aunque mande la contraseña de demo)", () => {
    expectCode(() => loginStaff(CUSTOMER_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("email inexistente → UNAUTHENTICATED", () => {
    expectCode(() => loginStaff("x@vibecoffee.local", STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("personal inactivo → UNAUTHENTICATED", () => {
    db().prepare("UPDATE users SET active = 0 WHERE email = ?").run(KITCHEN_EMAIL);
    expectCode(() => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("el User devuelto no expone password_hash", () => {
    const { user, token } = loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD);
    expect(user).not.toHaveProperty("password_hash");
    expect(user).not.toHaveProperty("passwordHash");
    expect(getSessionUser(token)).not.toHaveProperty("password_hash");
  });
});

describe("getSessionUser / logout", () => {
  it("sin token o token inválido → null", () => {
    expect(getSessionUser(undefined)).toBeNull();
    expect(getSessionUser()).toBeNull();
    expect(getSessionUser("")).toBeNull();
    expect(getSessionUser("no-existe")).toBeNull();
  });

  it("usuario desactivado después de loguearse → null", () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    expect(getSessionUser(token)).not.toBeNull();
    db().prepare("UPDATE users SET active = 0 WHERE email = ?").run(CUSTOMER_EMAIL);
    expect(getSessionUser(token)).toBeNull();
  });

  it("logout invalida el token (y solo ese)", () => {
    const a = loginCustomer(CUSTOMER_EMAIL).token;
    const b = loginCustomer(CUSTOMER_EMAIL).token;
    logout(a);
    expect(getSessionUser(a)).toBeNull();
    expect(getSessionUser(b)).not.toBeNull();
  });

  it("devuelve User completo con active boolean", () => {
    const { token } = loginCustomer(CUSTOMER_EMAIL);
    const u = getSessionUser(token)!;
    expect(u).toEqual({
      id: expect.any(Number),
      email: CUSTOMER_EMAIL,
      name: "Sofía Martínez",
      role: "cliente",
      active: true,
    });
  });
});

describe("requireRole", () => {
  it("sin actor → UNAUTHENTICATED", () => {
    expectCode(() => requireRole(null, "cliente"), "UNAUTHENTICATED");
  });

  it("otro rol → FORBIDDEN; rol permitido → devuelve el actor", () => {
    const actor = getSessionUser(loginCustomer(CUSTOMER_EMAIL).token)!;
    expectCode(() => requireRole(actor, "cocina"), "FORBIDDEN");
    expectCode(() => requireRole(actor, "cocina", "admin"), "FORBIDDEN");
    expect(requireRole(actor, "cliente")).toEqual(actor);
    expect(requireRole(actor, "admin", "cliente")).toEqual(actor);
  });
});

describe("listDemoAccounts", () => {
  it("lista clientes activos y personal activo, sin inactivos", () => {
    createCustomer("baja@gmail.com", "Baja", false);
    const d = listDemoAccounts();
    expect(d.customers.map((c) => c.email)).toContain(CUSTOMER_EMAIL);
    expect(d.customers.map((c) => c.email)).not.toContain("baja@gmail.com");
    expect(d.customers.map((c) => c.email)).not.toContain(KITCHEN_EMAIL);
    expect(d.staff.map((s) => s.email).sort()).toEqual([ADMIN_EMAIL, KITCHEN_EMAIL].sort());
    expect(d.staffDemoPassword).toBe(STAFF_DEMO_PASSWORD);
  });
});
