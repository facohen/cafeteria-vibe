// Tarea 2 — administración de usuarios (CA-15, CA-16, CA-21) contra el contrato de lib/contracts.ts.
import { describe, expect, it } from "vitest";
import { ADMIN_LIMITS, ROLES, type SessionUser } from "@/lib/contracts";
import { createUser, deactivateUser, listUsers, updateUser } from "@/lib/services/users";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";
import { createOrder, getOrder } from "@/lib/services/orders";
import {
  ADMIN_EMAIL,
  CUSTOMER_EMAIL,
  KITCHEN_EMAIL,
  STAFF_DEMO_PASSWORD,
  adminActor,
  createCustomer,
  customerActor,
  db,
  expectCode,
  expectNoSecrets,
  kitchenActor,
  sampleInput,
  sessionCount,
  userRow,
  useFreshDb,
} from "./helpers";

useFreshDb();

const valid = () => ({ email: "nueva@gmail.com", name: "Nueva Clienta", role: "cliente" });

describe("permisos: solo admin gestiona usuarios", () => {
  it("sin sesión → UNAUTHENTICATED en cada operación (aun con id o datos inválidos)", () => {
    const id = userRow(CUSTOMER_EMAIL).id;
    expectCode(() => listUsers(null), "UNAUTHENTICATED");
    expectCode(() => createUser(null, valid()), "UNAUTHENTICATED");
    expectCode(() => createUser(null, {}), "UNAUTHENTICATED");
    expectCode(() => updateUser(null, id, { name: "X" }), "UNAUTHENTICATED");
    expectCode(() => updateUser(null, "abc", {}), "UNAUTHENTICATED");
    expectCode(() => deactivateUser(null, id), "UNAUTHENTICATED");
    expectCode(() => deactivateUser(null, 99999), "UNAUTHENTICATED");
  });

  for (const [label, actor] of [
    ["cliente", () => customerActor()],
    ["cocina", () => kitchenActor()],
  ] as const) {
    it(`${label} → FORBIDDEN en cada operación (rol antes que id y validación)`, () => {
      const a: SessionUser = actor();
      const id = userRow(CUSTOMER_EMAIL).id;
      expectCode(() => listUsers(a), "FORBIDDEN");
      expectCode(() => createUser(a, valid()), "FORBIDDEN");
      expectCode(() => createUser(a, { role: "admin" }), "FORBIDDEN");
      expectCode(() => updateUser(a, id, { role: "admin" }), "FORBIDDEN");
      expectCode(() => updateUser(a, a.id, { role: "admin" }), "FORBIDDEN");
      expectCode(() => updateUser(a, "abc", {}), "FORBIDDEN");
      expectCode(() => deactivateUser(a, id), "FORBIDDEN");
      expectCode(() => deactivateUser(a, 99999), "FORBIDDEN");
      // nada cambió
      expect(userRow(CUSTOMER_EMAIL).active).toBe(1);
      expect(() => userRow("nueva@gmail.com")).toThrow();
    });
  }

  it("admin → OK", () => {
    const admin = adminActor();
    expect(listUsers(admin).length).toBeGreaterThan(0);
    const u = createUser(admin, valid());
    expect(updateUser(admin, u.id, { name: "Otra" }).name).toBe("Otra");
    expect(deactivateUser(admin, u.id).active).toBe(false);
  });
});

describe("listUsers", () => {
  it("devuelve todos (activos e inactivos) sin password_hash", () => {
    const admin = adminActor();
    const inactiveId = createCustomer("baja@gmail.com", "De Baja", false);
    const users = listUsers(admin);
    const total = userRowCount();
    expect(users).toHaveLength(total);
    expect(users.find((u) => u.id === inactiveId)).toMatchObject({ email: "baja@gmail.com", active: false, role: "cliente" });
    expect(users.find((u) => u.email === ADMIN_EMAIL)).toMatchObject({ role: "admin", active: true });
    for (const u of users) {
      expect(Object.keys(u).sort()).toEqual(["active", "email", "id", "name", "role"]);
      expect(typeof u.active).toBe("boolean");
      expect(ROLES).toContain(u.role);
    }
    expectNoSecrets(users);
  });
});

function userRowCount(): number {
  return (db().prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
}

describe("createUser", () => {
  it("alta de cliente: email en minúsculas y sin espacios, nombre recortado, activo por defecto; puede entrar", () => {
    const admin = adminActor();
    const u = createUser(admin, { email: "  Nueva.Clienta@Gmail.COM ", name: "  Nueva Clienta  ", role: "cliente" });
    expect(u).toMatchObject({ email: "nueva.clienta@gmail.com", name: "Nueva Clienta", role: "cliente", active: true });
    expect(u.id).toEqual(expect.any(Number));
    expectNoSecrets(u);
    expect(loginCustomer("nueva.clienta@gmail.com").user.id).toBe(u.id);
    expect(userRow("nueva.clienta@gmail.com").password_hash).toBeNull();
  });

  it("alta de personal sin contraseña usa la de demo; con contraseña, la propia", () => {
    const admin = adminActor();
    const k = createUser(admin, { email: "barista@vibecoffee.local", name: "Barista", role: "cocina" });
    expectNoSecrets(k);
    expect(loginStaff("barista@vibecoffee.local", STAFF_DEMO_PASSWORD).user.id).toBe(k.id);

    const a = createUser(admin, { email: "gerente@vibecoffee.local", name: "Gerente", role: "admin", password: "secreta-123" });
    expectNoSecrets(a);
    expect(loginStaff("gerente@vibecoffee.local", "secreta-123").user.role).toBe("admin");
    expectCode(() => loginStaff("gerente@vibecoffee.local", STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
    // la contraseña no se guarda en claro
    expect(userRow("gerente@vibecoffee.local").password_hash).not.toContain("secreta-123");
  });

  it("alta con active=false: existe pero no puede entrar", () => {
    const admin = adminActor();
    const u = createUser(admin, { ...valid(), active: false });
    expect(u.active).toBe(false);
    expectCode(() => loginCustomer(u.email), "UNAUTHENTICATED");
  });

  it("campos extra se ignoran (no puede inyectar id ni password_hash)", () => {
    const admin = adminActor();
    const u = createUser(admin, { ...valid(), id: 1, password_hash: "x:y", extra: true } as never);
    expect(u.id).not.toBe(1);
    expect(userRow(u.email).password_hash).toBeNull();
  });

  it("límites: nombre de 60 y email de 120 caracteres se aceptan; password de 8 se acepta", () => {
    const admin = adminActor();
    const local = "a".repeat(ADMIN_LIMITS.email.max - "@gmail.com".length);
    const u = createUser(admin, { email: `${local}@gmail.com`, name: "N".repeat(60), role: "cliente" });
    expect(u.name).toHaveLength(60);
    expect(u.email).toHaveLength(120);
    createUser(admin, { email: "ocho@vibecoffee.local", name: "Ocho", role: "cocina", password: "12345678" });
    expect(loginStaff("ocho@vibecoffee.local", "12345678").user.role).toBe("cocina");
  });

  const invalid: [string, unknown][] = [
    ["cuerpo null", null],
    ["cuerpo string", "hola"],
    ["cuerpo array", []],
    ["sin email", { name: "X", role: "cliente" }],
    ["email no string", { email: 123, name: "X", role: "cliente" }],
    ["email vacío", { email: "  ", name: "X", role: "cliente" }],
    ["email sin @", { email: "nueva.gmail.com", name: "X", role: "cliente" }],
    ["email sin dominio con punto", { email: "nueva@gmail", name: "X", role: "cliente" }],
    ["email sin usuario", { email: "@gmail.com", name: "X", role: "cliente" }],
    ["email con espacio interno", { email: "nue va@gmail.com", name: "X", role: "cliente" }],
    ["email con dos @", { email: "a@b@gmail.com", name: "X", role: "cliente" }],
    ["email > 120", { email: `${"a".repeat(121)}@gmail.com`, name: "X", role: "cliente" }],
    ["email repetido", { email: CUSTOMER_EMAIL, name: "X", role: "cliente" }],
    ["email repetido con mayúsculas", { email: "SOFIA@Gmail.Com", name: "X", role: "cliente" }],
    ["email repetido con espacios", { email: `  ${KITCHEN_EMAIL.toUpperCase()}  `, name: "X", role: "cocina" }],
    ["sin nombre", { email: "n@gmail.com", role: "cliente" }],
    ["nombre vacío", { email: "n@gmail.com", name: "", role: "cliente" }],
    ["nombre solo espacios", { email: "n@gmail.com", name: "    ", role: "cliente" }],
    ["nombre > 60", { email: "n@gmail.com", name: "N".repeat(61), role: "cliente" }],
    ["nombre no string", { email: "n@gmail.com", name: 42, role: "cliente" }],
    ["sin rol", { email: "n@gmail.com", name: "X" }],
    ["rol inexistente", { email: "n@gmail.com", name: "X", role: "superadmin" }],
    ["rol con mayúsculas", { email: "n@gmail.com", name: "X", role: "Admin" }],
    ["active string", { email: "n@gmail.com", name: "X", role: "cliente", active: "true" }],
    ["active número", { email: "n@gmail.com", name: "X", role: "cliente", active: 1 }],
    ["password corta (personal)", { email: "n@vibecoffee.local", name: "X", role: "cocina", password: "1234567" }],
    ["password > 200 (personal)", { email: "n@vibecoffee.local", name: "X", role: "admin", password: "p".repeat(201) }],
    ["password no string (personal)", { email: "n@vibecoffee.local", name: "X", role: "cocina", password: 12345678 }],
  ];
  for (const [label, input] of invalid) {
    it(`VALIDATION: ${label}`, () => {
      const admin = adminActor();
      const before = userRowCount();
      expectCode(() => createUser(admin, input), "VALIDATION");
      expect(userRowCount()).toBe(before);
    });
  }
});

describe("updateUser", () => {
  it("edición parcial: solo cambia lo presente; nunca devuelve password_hash", () => {
    const admin = adminActor();
    const id = userRow(CUSTOMER_EMAIL).id;
    const u = updateUser(admin, id, { name: "  Sofía M.  " });
    expect(u).toMatchObject({ id, email: CUSTOMER_EMAIL, name: "Sofía M.", role: "cliente", active: true });
    expectNoSecrets(u);
    const u2 = updateUser(admin, id, { email: " Sofia.M@Gmail.com " });
    expect(u2).toMatchObject({ email: "sofia.m@gmail.com", name: "Sofía M." });
    expect(loginCustomer("sofia.m@gmail.com").user.id).toBe(id);
  });

  it("acepta el mismo email propio con otras mayúsculas (no es repetido consigo mismo)", () => {
    const admin = adminActor();
    const id = userRow(CUSTOMER_EMAIL).id;
    expect(updateUser(admin, id, { email: CUSTOMER_EMAIL.toUpperCase() }).email).toBe(CUSTOMER_EMAIL);
  });

  it("id inválido → VALIDATION; inexistente → NOT_FOUND (antes que validar el cuerpo)", () => {
    const admin = adminActor();
    for (const bad of ["abc", 0, -1, 1.5, null, "", "1e3"]) {
      expectCode(() => updateUser(admin, bad, { name: "X" }), "VALIDATION");
    }
    expectCode(() => updateUser(admin, 99999, { name: "X" }), "NOT_FOUND");
    expectCode(() => updateUser(admin, 99999, { role: "nope" }), "NOT_FOUND");
    expectCode(() => updateUser(admin, "99999", { name: "X" }), "NOT_FOUND");
  });

  it("acepta el id como string numérico (viene de la URL)", () => {
    const admin = adminActor();
    const id = userRow(CUSTOMER_EMAIL).id;
    expect(updateUser(admin, String(id), { name: "Sofi" }).name).toBe("Sofi");
  });

  const invalidPatches: [string, unknown][] = [
    ["patch null", null],
    ["email mal formado", { email: "sin-arroba" }],
    ["email repetido de otro usuario (mayúsculas)", { email: KITCHEN_EMAIL.toUpperCase() }],
    ["nombre vacío", { name: "   " }],
    ["nombre > 60", { name: "x".repeat(61) }],
    ["rol inexistente", { role: "gerente" }],
    ["active string", { active: "false" }],
    ["active null", { active: null }],
  ];
  for (const [label, patch] of invalidPatches) {
    it(`VALIDATION: ${label} (y no cambia nada)`, () => {
      const admin = adminActor();
      const before = userRow(CUSTOMER_EMAIL);
      expectCode(() => updateUser(admin, before.id, patch), "VALIDATION");
      expect(userRow(CUSTOMER_EMAIL)).toEqual(before);
    });
  }

  it("password corta al editar personal → VALIDATION", () => {
    const admin = adminActor();
    const id = userRow(KITCHEN_EMAIL).id;
    expectCode(() => updateUser(admin, id, { password: "corta" }), "VALIDATION");
    expect(loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).user.id).toBe(id);
  });

  it("cambiar el rol borra las sesiones de ese usuario", () => {
    const admin = adminActor();
    const { token, user } = loginCustomer(CUSTOMER_EMAIL);
    expect(getSessionUser(token)?.role).toBe("cliente");
    const u = updateUser(admin, user.id, { role: "cocina" });
    expect(u.role).toBe("cocina");
    expect(getSessionUser(token)).toBeNull();
    expect(sessionCount(user.id)).toBe(0);
    // un cliente pasado a cocina sin contraseña previa entra con la de demo
    expect(loginStaff(CUSTOMER_EMAIL, STAFF_DEMO_PASSWORD).user.role).toBe("cocina");
    // y ya no entra por el kiosco
    expectCode(() => loginCustomer(CUSTOMER_EMAIL), "UNAUTHENTICATED");
  });

  it("cambiar el rol de cocina a admin también revoca sus sesiones", () => {
    const admin = adminActor();
    const { token, user } = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD);
    updateUser(admin, user.id, { role: "admin" });
    expect(getSessionUser(token)).toBeNull();
    expect(loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).user.role).toBe("admin");
  });

  it("editar solo el nombre no borra sesiones", () => {
    const admin = adminActor();
    const { token, user } = loginCustomer(CUSTOMER_EMAIL);
    updateUser(admin, user.id, { name: "Sofi" });
    expect(getSessionUser(token)?.name).toBe("Sofi");
  });

  it("active=false da de baja y borra sesiones; active=true lo reactiva", () => {
    const admin = adminActor();
    const { token, user } = loginCustomer(CUSTOMER_EMAIL);
    expect(updateUser(admin, user.id, { active: false }).active).toBe(false);
    expect(getSessionUser(token)).toBeNull();
    expect(sessionCount(user.id)).toBe(0);
    expectCode(() => loginCustomer(CUSTOMER_EMAIL), "UNAUTHENTICATED");
    expect(updateUser(admin, user.id, { active: true }).active).toBe(true);
    expect(getSessionUser(loginCustomer(CUSTOMER_EMAIL).token)?.id).toBe(user.id);
  });

  it("un admin no puede quitarse el rol admin ni darse de baja a sí mismo", () => {
    const admin = adminActor();
    expectCode(() => updateUser(admin, admin.id, { role: "cocina" }), "VALIDATION");
    expectCode(() => updateUser(admin, admin.id, { role: "cliente" }), "VALIDATION");
    expectCode(() => updateUser(admin, admin.id, { active: false }), "VALIDATION");
    expectCode(() => updateUser(admin, String(admin.id), { active: false }), "VALIDATION");
    const row = userRow(ADMIN_EMAIL);
    expect(row.role).toBe("admin");
    expect(row.active).toBe(1);
    // sí puede editar su nombre y su sesión sigue viva
    expect(updateUser(admin, admin.id, { name: "Admin Nuevo" }).name).toBe("Admin Nuevo");
    expect(listUsers(admin).length).toBeGreaterThan(0);
  });

  it("un admin puede quitarle el rol admin a OTRO admin", () => {
    const admin = adminActor();
    const other = createUser(admin, { email: "otro.admin@vibecoffee.local", name: "Otro", role: "admin" });
    expect(updateUser(admin, other.id, { role: "cocina" }).role).toBe("cocina");
  });
});

describe("deactivateUser (CA-16)", () => {
  it("cliente dado de baja: no puede entrar, su sesión previa deja de valer; vuelve si se reactiva", () => {
    const admin = adminActor();
    const { token, user } = loginCustomer(CUSTOMER_EMAIL);
    const u = deactivateUser(admin, user.id);
    expect(u).toMatchObject({ id: user.id, active: false });
    expectNoSecrets(u);
    expect(getSessionUser(token)).toBeNull();
    expect(sessionCount(user.id)).toBe(0);
    expectCode(() => loginCustomer(CUSTOMER_EMAIL), "UNAUTHENTICATED");
    expectCode(() => loginCustomer(CUSTOMER_EMAIL.toUpperCase()), "UNAUTHENTICATED");
    // sigue listado (baja lógica)
    expect(listUsers(admin).find((x) => x.id === user.id)?.active).toBe(false);
    // reactivar
    updateUser(admin, user.id, { active: true });
    const again = loginCustomer(CUSTOMER_EMAIL);
    expect(getSessionUser(again.token)?.id).toBe(user.id);
  });

  it("cocina dada de baja: loginStaff → UNAUTHENTICATED y su token deja de valer", () => {
    const admin = adminActor();
    const { token, user } = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD);
    deactivateUser(admin, user.id);
    expect(getSessionUser(token)).toBeNull();
    expectCode(() => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
    updateUser(admin, user.id, { active: true });
    expect(loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).user.id).toBe(user.id);
  });

  it("otro admin dado de baja pierde el acceso", () => {
    const admin = adminActor();
    const other = createUser(admin, { email: "otro.admin@vibecoffee.local", name: "Otro", role: "admin" });
    const { token } = loginStaff(other.email, STAFF_DEMO_PASSWORD);
    deactivateUser(admin, other.id);
    expect(getSessionUser(token)).toBeNull();
    expectCode(() => loginStaff(other.email, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("es idempotente", () => {
    const admin = adminActor();
    const id = userRow(CUSTOMER_EMAIL).id;
    deactivateUser(admin, id);
    expect(deactivateUser(admin, id).active).toBe(false);
  });

  it("sobre sí mismo → VALIDATION", () => {
    const admin = adminActor();
    expectCode(() => deactivateUser(admin, admin.id), "VALIDATION");
    expect(userRow(ADMIN_EMAIL).active).toBe(1);
  });

  it("id inválido → VALIDATION; inexistente → NOT_FOUND", () => {
    const admin = adminActor();
    for (const bad of ["abc", 0, -3, 2.5, null]) expectCode(() => deactivateUser(admin, bad), "VALIDATION");
    expectCode(() => deactivateUser(admin, 99999), "NOT_FOUND");
  });

  it("no borra físicamente: sus pedidos siguen existiendo", () => {
    const admin = adminActor();
    const cliente = customerActor();
    const order = createOrder(cliente, sampleInput());
    deactivateUser(admin, cliente.id);
    reactivate(admin, cliente.id);
    expect(getOrder(customerActor(), order.id).id).toBe(order.id);
  });
});

function reactivate(admin: SessionUser, id: number) {
  updateUser(admin, id, { active: true });
}

describe("cambio de contraseña", () => {
  it("password nueva para personal: borra sus sesiones; entra con la nueva y no con la vieja", () => {
    const admin = adminActor();
    const { token, user } = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD);
    const u = updateUser(admin, user.id, { password: "nueva-clave-1" });
    expectNoSecrets(u);
    expect(getSessionUser(token)).toBeNull();
    expect(sessionCount(user.id)).toBe(0);
    expectCode(() => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
    expect(loginStaff(KITCHEN_EMAIL, "nueva-clave-1").user.id).toBe(user.id);
  });

  it("password para un cliente se ignora: sin hash y su sesión sigue viva", () => {
    const admin = adminActor();
    const { token, user } = loginCustomer(CUSTOMER_EMAIL);
    const u = updateUser(admin, user.id, { password: "lo-que-sea-123" });
    expect(u.role).toBe("cliente");
    expect(userRow(CUSTOMER_EMAIL).password_hash).toBeNull();
    expect(getSessionUser(token)?.id).toBe(user.id);
    expectCode(() => loginStaff(CUSTOMER_EMAIL, "lo-que-sea-123"), "UNAUTHENTICATED");
  });
});

