// Tarea 2 — gestión de usuarios (CA-15, CA-16, CA-21). Contrato: lib/contracts.ts (UserInput, users.ts).
import { describe, expect, it } from "vitest";
import { ADMIN_LIMITS, type User } from "@/lib/contracts";
import { createUser, deactivateUser, listUsers, updateUser } from "@/lib/services/users";
import { getSessionUser, loginCustomer, loginStaff } from "@/lib/services/auth";
import { createOrder, listKitchenOrders } from "@/lib/services/orders";
import {
  ADMIN_EMAIL,
  CUSTOMER_EMAIL,
  KITCHEN_EMAIL,
  MISSING_ID,
  STAFF_DEMO_PASSWORD,
  adminActor,
  count,
  customerActor,
  db,
  expectCode,
  kitchenActor,
  sampleInput,
  sessionCount,
  useFreshDb,
  userId,
} from "./helpers";

useFreshDb();

const newUser = (over: Record<string, unknown> = {}) => ({
  email: "nuevo@gmail.com",
  name: "Nuevo Cliente",
  role: "cliente",
  ...over,
});

function expectNoSecrets(u: User) {
  expect(u).not.toHaveProperty("password_hash");
  expect(u).not.toHaveProperty("passwordHash");
  expect(u).not.toHaveProperty("password");
}

describe("permisos: solo admin gestiona usuarios", () => {
  it("sin sesión → UNAUTHENTICATED en cada servicio (aun con id inexistente o entrada inválida)", () => {
    expectCode(() => listUsers(null), "UNAUTHENTICATED");
    expectCode(() => createUser(null, newUser()), "UNAUTHENTICATED");
    expectCode(() => createUser(null, "basura"), "UNAUTHENTICATED");
    expectCode(() => updateUser(null, userId(CUSTOMER_EMAIL), { name: "X" }), "UNAUTHENTICATED");
    expectCode(() => updateUser(null, MISSING_ID, { name: "" }), "UNAUTHENTICATED");
    expectCode(() => deactivateUser(null, userId(CUSTOMER_EMAIL)), "UNAUTHENTICATED");
    expectCode(() => deactivateUser(null, "abc"), "UNAUTHENTICATED");
  });

  it("cliente y cocina → FORBIDDEN en cada servicio (rol antes que existencia y validación)", () => {
    for (const actor of [customerActor(), kitchenActor()]) {
      expectCode(() => listUsers(actor), "FORBIDDEN");
      expectCode(() => createUser(actor, newUser()), "FORBIDDEN");
      expectCode(() => createUser(actor, newUser({ role: "admin", email: "colado@gmail.com" })), "FORBIDDEN");
      expectCode(() => createUser(actor, null), "FORBIDDEN");
      expectCode(() => updateUser(actor, actor.id, { role: "admin" }), "FORBIDDEN");
      expectCode(() => updateUser(actor, MISSING_ID, { name: "" }), "FORBIDDEN");
      expectCode(() => deactivateUser(actor, userId(ADMIN_EMAIL)), "FORBIDDEN");
      expectCode(() => deactivateUser(actor, MISSING_ID), "FORBIDDEN");
    }
    // nada cambió
    expect(count("users", "email = 'nuevo@gmail.com' OR email = 'colado@gmail.com'")).toBe(0);
    expect(count("users", "role = 'admin'")).toBe(1);
    expect(getSessionUser(loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD).token)?.active).toBe(true);
  });
});

describe("listUsers", () => {
  it("devuelve todos los usuarios (incluidos dados de baja), sin hash de contraseña", () => {
    const admin = adminActor();
    deactivateUser(admin, userId("lucas@gmail.com"));
    const users = listUsers(admin);
    expect(users.length).toBe(count("users"));
    for (const u of users) {
      expectNoSecrets(u);
      expect(typeof u.active).toBe("boolean");
    }
    expect(users.find((u) => u.email === "lucas@gmail.com")?.active).toBe(false);
    expect(users.map((u) => u.email)).toEqual(expect.arrayContaining([CUSTOMER_EMAIL, KITCHEN_EMAIL, ADMIN_EMAIL]));
  });

  it("agrupa por rol (todos los de un rol juntos)", () => {
    const roles = listUsers(adminActor()).map((u) => u.role);
    const seen: string[] = [];
    for (const r of roles) if (seen[seen.length - 1] !== r) seen.push(r);
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe("createUser", () => {
  it("alta de cliente: email recortado y en minúsculas, activo por defecto, sin contraseña; puede entrar al kiosco", () => {
    const u = createUser(adminActor(), newUser({ email: "  Nuevo@Gmail.COM ", name: "  Nuevo Cliente  " }));
    expect(u).toMatchObject({ email: "nuevo@gmail.com", name: "Nuevo Cliente", role: "cliente", active: true });
    expect(u.id).toEqual(expect.any(Number));
    expectNoSecrets(u);
    const row = db().prepare("SELECT password_hash FROM users WHERE id = ?").get(u.id) as { password_hash: string | null };
    expect(row.password_hash).toBeNull();
    expect(loginCustomer("nuevo@gmail.com").user.id).toBe(u.id);
    expectCode(() => loginStaff("nuevo@gmail.com", STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("personal nuevo (cocina y admin) entra con la contraseña de demo", () => {
    const admin = adminActor();
    const cocina = createUser(admin, { email: "cocina2@vibecoffee.local", name: "Cocina Dos", role: "cocina" });
    const otroAdmin = createUser(admin, { email: "admin2@vibecoffee.local", name: "Admin Dos", role: "admin" });
    const c = loginStaff("cocina2@vibecoffee.local", STAFF_DEMO_PASSWORD);
    expect(c.user).toMatchObject({ id: cocina.id, role: "cocina" });
    const a = loginStaff("admin2@vibecoffee.local", STAFF_DEMO_PASSWORD);
    expect(a.user).toMatchObject({ id: otroAdmin.id, role: "admin" });
    expectCode(() => loginStaff("cocina2@vibecoffee.local", "otra-clave"), "UNAUTHENTICATED");
    // el personal nuevo opera con su rol
    expect(Array.isArray(listKitchenOrders(getSessionUser(c.token)))).toBe(true);
    expect(listUsers(getSessionUser(a.token)).length).toBe(count("users"));
  });

  it("alta con active=false: existe pero no puede entrar", () => {
    const u = createUser(adminActor(), newUser({ active: false }));
    expect(u.active).toBe(false);
    expectCode(() => loginCustomer("nuevo@gmail.com"), "UNAUTHENTICATED");
  });

  it("email repetido → VALIDATION, también con otras mayúsculas o espacios", () => {
    const admin = adminActor();
    const before = count("users");
    expectCode(() => createUser(admin, newUser({ email: CUSTOMER_EMAIL })), "VALIDATION");
    expectCode(() => createUser(admin, newUser({ email: "SOFIA@Gmail.com" })), "VALIDATION");
    expectCode(() => createUser(admin, newUser({ email: `  ${KITCHEN_EMAIL.toUpperCase()} ` })), "VALIDATION");
    createUser(admin, newUser());
    expectCode(() => createUser(admin, newUser({ email: "NUEVO@gmail.com", name: "Otro" })), "VALIDATION");
    expect(count("users")).toBe(before + 1);
  });

  it("email mal formado o demasiado largo → VALIDATION", () => {
    const admin = adminActor();
    const before = count("users");
    for (const email of ["", "   ", "sin-arroba", "a@b", "@gmail.com", "ana@", "a b@gmail.com", "ana@@gmail.com"]) {
      expectCode(() => createUser(admin, newUser({ email })), "VALIDATION");
    }
    const long = "a".repeat(ADMIN_LIMITS.emailMax - "@x.com".length + 1) + "@x.com"; // emailMax + 1
    expect(long.length).toBe(ADMIN_LIMITS.emailMax + 1);
    expectCode(() => createUser(admin, newUser({ email: long })), "VALIDATION");
    expect(count("users")).toBe(before);
  });

  it("nombre vacío o de más de 60 caracteres → VALIDATION; 60 justos se acepta", () => {
    const admin = adminActor();
    expectCode(() => createUser(admin, newUser({ name: "" })), "VALIDATION");
    expectCode(() => createUser(admin, newUser({ name: "    " })), "VALIDATION");
    expectCode(() => createUser(admin, newUser({ name: "x".repeat(ADMIN_LIMITS.userNameMax + 1) })), "VALIDATION");
    const ok = createUser(admin, newUser({ name: "x".repeat(ADMIN_LIMITS.userNameMax) }));
    expect(ok.name.length).toBe(ADMIN_LIMITS.userNameMax);
  });

  it("rol inexistente → VALIDATION", () => {
    const admin = adminActor();
    for (const role of ["superadmin", "Admin", "", "CLIENTE", null, 1]) {
      expectCode(() => createUser(admin, newUser({ role })), "VALIDATION");
    }
    expect(count("users", "email = 'nuevo@gmail.com'")).toBe(0);
  });

  it("tipos incorrectos o campos faltantes → VALIDATION", () => {
    const admin = adminActor();
    const bad: unknown[] = [
      null,
      undefined,
      "nuevo@gmail.com",
      42,
      [],
      [newUser()],
      {},
      { name: "Sin email", role: "cliente" },
      { email: "nuevo@gmail.com", role: "cliente" },
      { email: "nuevo@gmail.com", name: "Sin rol" },
      newUser({ email: 123 }),
      newUser({ email: ["nuevo@gmail.com"] }),
      newUser({ name: 5 }),
      newUser({ name: null }),
      newUser({ active: "true" }),
      newUser({ active: 1 }),
    ];
    for (const input of bad) expectCode(() => createUser(admin, input), "VALIDATION");
    expect(count("users", "email = 'nuevo@gmail.com'")).toBe(0);
  });
});

describe("updateUser", () => {
  it("edición parcial: cambia solo lo enviado", () => {
    const admin = adminActor();
    const id = userId(CUSTOMER_EMAIL);
    const u = updateUser(admin, id, { name: "  Sofía M.  " });
    expect(u).toMatchObject({ id, email: CUSTOMER_EMAIL, name: "Sofía M.", role: "cliente", active: true });
    expectNoSecrets(u);
    const u2 = updateUser(admin, id, { email: " Sofi.M@Gmail.com " });
    expect(u2).toMatchObject({ email: "sofi.m@gmail.com", name: "Sofía M." });
    expect(loginCustomer("sofi.m@gmail.com").user.id).toBe(id);
  });

  it("puede reenviar su propio email (con otras mayúsculas) sin que cuente como repetido", () => {
    const id = userId(CUSTOMER_EMAIL);
    expect(updateUser(adminActor(), id, { email: CUSTOMER_EMAIL.toUpperCase() }).email).toBe(CUSTOMER_EMAIL);
  });

  it("email de otro usuario → VALIDATION (sin distinguir mayúsculas) y no cambia nada", () => {
    const admin = adminActor();
    const id = userId(CUSTOMER_EMAIL);
    expectCode(() => updateUser(admin, id, { email: "LUCAS@gmail.com" }), "VALIDATION");
    expectCode(() => updateUser(admin, id, { email: ADMIN_EMAIL }), "VALIDATION");
    expectCode(() => updateUser(admin, id, { email: "mal-formado" }), "VALIDATION");
    expect(listUsers(admin).find((u) => u.id === id)?.email).toBe(CUSTOMER_EMAIL);
  });

  it("valida cada campo enviado", () => {
    const admin = adminActor();
    const id = userId(CUSTOMER_EMAIL);
    const bad: unknown[] = [
      { name: "" },
      { name: "   " },
      { name: "x".repeat(ADMIN_LIMITS.userNameMax + 1) },
      { name: 7 },
      { role: "superadmin" },
      { role: null },
      { active: "false" },
      { active: 0 },
      { email: 1 },
      null,
      "texto",
      [],
    ];
    const before = listUsers(admin).find((u) => u.id === id);
    for (const patch of bad) expectCode(() => updateUser(admin, id, patch), "VALIDATION");
    expect(listUsers(admin).find((u) => u.id === id)).toEqual(before);
  });

  it("id inexistente o inválido → NOT_FOUND (existencia antes que validación)", () => {
    const admin = adminActor();
    expectCode(() => updateUser(admin, MISSING_ID, { name: "X" }), "NOT_FOUND");
    expectCode(() => updateUser(admin, MISSING_ID, { name: "" }), "NOT_FOUND");
    expectCode(() => updateUser(admin, "abc", { name: "X" }), "NOT_FOUND");
    expectCode(() => updateUser(admin, -1, { name: "X" }), "NOT_FOUND");
    expectCode(() => updateUser(admin, 1.5, { name: "X" }), "NOT_FOUND");
  });

  it("acepta el id como string numérico (viene de la URL)", () => {
    const id = userId(CUSTOMER_EMAIL);
    expect(updateUser(adminActor(), String(id), { name: "Sofi" }).name).toBe("Sofi");
  });

  it("cliente que pasa a cocina recibe la contraseña de demo y entra al personal", () => {
    const admin = adminActor();
    const id = userId("martin@gmail.com");
    expectCode(() => loginStaff("martin@gmail.com", STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
    expect(updateUser(admin, id, { role: "cocina" }).role).toBe("cocina");
    const { user, token } = loginStaff("martin@gmail.com", STAFF_DEMO_PASSWORD);
    expect(user).toMatchObject({ id, role: "cocina" });
    expect(Array.isArray(listKitchenOrders(getSessionUser(token)))).toBe(true);
    expectCode(() => loginCustomer("martin@gmail.com"), "UNAUTHENTICATED");
  });

  it("cambiar el rol aplica a las sesiones existentes (el permiso se resuelve en el servidor)", () => {
    const cocinaToken = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
    updateUser(adminActor(), userId(KITCHEN_EMAIL), { role: "cliente" });
    const actor = getSessionUser(cocinaToken);
    if (actor) expectCode(() => listKitchenOrders(actor), "FORBIDDEN");
    expectCode(() => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("un admin no puede darse de baja ni quitarse el rol admin (VALIDATION) pero sí editar su nombre", () => {
    const admin = adminActor();
    expectCode(() => updateUser(admin, admin.id, { active: false }), "VALIDATION");
    expectCode(() => updateUser(admin, admin.id, { role: "cocina" }), "VALIDATION");
    expectCode(() => updateUser(admin, admin.id, { role: "cliente" }), "VALIDATION");
    expectCode(() => updateUser(admin, String(admin.id), { role: "cliente", active: false }), "VALIDATION");
    expectCode(() => deactivateUser(admin, admin.id), "VALIDATION");
    expectCode(() => deactivateUser(admin, String(admin.id)), "VALIDATION");
    const me = listUsers(admin).find((u) => u.id === admin.id)!;
    expect(me).toMatchObject({ role: "admin", active: true });
    expect(updateUser(admin, admin.id, { name: "Admin Renombrado", role: "admin", active: true })).toMatchObject({
      name: "Admin Renombrado",
      role: "admin",
      active: true,
    });
    expect(loginStaff(ADMIN_EMAIL, STAFF_DEMO_PASSWORD).user.role).toBe("admin");
  });
});

describe("baja de usuarios (CA-16)", () => {
  it("deactivateUser: cliente dado de baja no entra y su sesión previa deja de valer", () => {
    const admin = adminActor();
    const old = loginCustomer(CUSTOMER_EMAIL).token;
    const cliente = getSessionUser(old)!;
    const order = createOrder(cliente, sampleInput());
    const u = deactivateUser(admin, cliente.id);
    expect(u).toMatchObject({ id: cliente.id, active: false });
    expectNoSecrets(u);
    expect(getSessionUser(old)).toBeNull();
    expect(sessionCount(cliente.id)).toBe(0);
    expectCode(() => loginCustomer(CUSTOMER_EMAIL), "UNAUTHENTICATED");
    // no se borra: el usuario y sus pedidos siguen
    expect(count("users", "id = ?", cliente.id)).toBe(1);
    expect(count("orders", "id = ?", order.id)).toBe(1);
  });

  it("deactivateUser: personal dado de baja no entra y su sesión previa deja de valer", () => {
    const old = loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD).token;
    const id = userId(KITCHEN_EMAIL);
    deactivateUser(adminActor(), id);
    expect(getSessionUser(old)).toBeNull();
    expect(sessionCount(id)).toBe(0);
    expectCode(() => loginStaff(KITCHEN_EMAIL, STAFF_DEMO_PASSWORD), "UNAUTHENTICATED");
  });

  it("baja por edición (active=false) también corta las sesiones; reactivar permite volver a entrar", () => {
    const admin = adminActor();
    const old = loginCustomer("valentina@gmail.com").token;
    const id = userId("valentina@gmail.com");
    expect(updateUser(admin, id, { active: false }).active).toBe(false);
    expect(getSessionUser(old)).toBeNull();
    expect(sessionCount(id)).toBe(0);
    expectCode(() => loginCustomer("valentina@gmail.com"), "UNAUTHENTICATED");
    expect(updateUser(admin, id, { active: true }).active).toBe(true);
    expect(getSessionUser(old)).toBeNull(); // la vieja no revive
    expect(loginCustomer("valentina@gmail.com").user.id).toBe(id);
  });

  it("la baja de un usuario no afecta las sesiones de otros", () => {
    const admin = adminActor();
    const otro = loginCustomer("lucas@gmail.com").token;
    deactivateUser(admin, userId(CUSTOMER_EMAIL));
    expect(getSessionUser(otro)?.email).toBe("lucas@gmail.com");
    expect(listUsers(admin).length).toBeGreaterThan(0); // la sesión del admin sigue
  });

  it("deactivateUser con id inexistente o inválido → NOT_FOUND", () => {
    const admin = adminActor();
    expectCode(() => deactivateUser(admin, MISSING_ID), "NOT_FOUND");
    expectCode(() => deactivateUser(admin, "abc"), "NOT_FOUND");
    expectCode(() => deactivateUser(admin, null), "NOT_FOUND");
  });
});
