// CONTRATOS COMPARTIDOS — Vibe Coffee (tarea 1, usados también por la tarea 2).
// Cambiar este archivo es un cambio de contrato: actualizar docs/TECNICO.md.

export type Role = "cliente" | "cocina" | "admin";
export const ROLES: Role[] = ["cliente", "cocina", "admin"];

/** Usuario visible en la app (nunca incluye password_hash). */
export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
}
/** Usuario autenticado resuelto desde la cookie de sesión. */
export type SessionUser = User;

export interface Category {
  id: number;
  slug: string;
  name: string;
  sort: number;
}

/** Claves de íconos propios (components/icons.tsx dibuja cada una). */
export const ICON_KEYS = [
  "espresso",
  "cortado",
  "latte",
  "cappuccino",
  "te",
  "jugo",
  "medialuna",
  "tostado",
  "budin",
  "generico",
  // Tarea 2 (catálogo completo): íconos propios para las bebidas nuevas y algo de pastelería.
  "americano",
  "mocha",
  "frio",
  "chocolate",
  "limonada",
  "agua",
  "alfajor",
  "cookie",
  "muffin",
] as const;
export type IconKey = (typeof ICON_KEYS)[number];

export interface Product {
  id: number;
  slug: string;
  categoryId: number;
  name: string;
  description: string;
  /** Precio en pesos enteros (ARS). Fuente de verdad: la base. */
  price: number;
  icon: IconKey;
  available: boolean;
  sort: number;
}

export interface Catalog {
  categories: Category[];
  products: Product[];
}

/**
 * Estados del pedido y transiciones válidas (únicas):
 *   pendiente_pago --pay (cliente dueño)--> pagado      (recién ahí llega a cocina)
 *   pendiente_pago --cancel (cliente dueño)--> cancelado
 *   pagado --ready (cocina)--> listo
 *   listo --finish (cliente dueño)--> entregado         (libera el kiosco)
 */
export type OrderStatus = "pendiente_pago" | "pagado" | "listo" | "entregado" | "cancelado";

export interface OrderItem {
  productId: number;
  /** Nombre y precio copiados al crear el pedido (histórico). */
  name: string;
  unitPrice: number;
  quantity: number;
  icon: IconKey;
}

export interface Order {
  id: number;
  userId: number;
  customerName: string;
  status: OrderStatus;
  /** Calculado en el servidor: suma de unitPrice * quantity. */
  total: number;
  items: OrderItem[];
  createdAt: string; // ISO
  paidAt: string | null;
  readyAt: string | null;
  finishedAt: string | null;
}

/** Entrada para crear un pedido. El cliente NO manda precios. */
export interface CreateOrderInput {
  items: { productId: number; quantity: number }[];
}

export const LIMITS = {
  minQuantity: 1,
  maxQuantity: 20,
  maxLines: 30,
} as const;

export type ErrorCode =
  | "UNAUTHENTICATED" // 401: sin sesión válida o usuario dado de baja
  | "FORBIDDEN" // 403: rol incorrecto o recurso ajeno
  | "NOT_FOUND" // 404
  | "VALIDATION" // 400: entrada inválida (cantidades, producto inexistente/no disponible...)
  | "INVALID_TRANSITION" // 409: cambio de estado no permitido
  | "INTERNAL"; // 500: error inesperado, sin detalles internos

export const ERROR_STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  INVALID_TRANSITION: 409,
  INTERNAL: 500,
};

/** Error de dominio; las rutas HTTP lo traducen a { error: { code, message } } con ERROR_STATUS. */
export class AppError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
  }
}

/** Cuerpo JSON de error de toda la API. */
export interface ApiError {
  error: { code: ErrorCode; message: string };
}

/** Cuentas de demo públicas (picker de Google simulado y entrada del personal precargada). */
export interface DemoAccounts {
  customers: { email: string; name: string }[];
  staff: { email: string; name: string; role: Exclude<Role, "cliente"> }[];
  /** Contraseña de demo del personal, solo para precargar la entrada (es dato de demo, no secreto). */
  staffDemoPassword: string;
}

/**
 * Una cookie por pantalla, para que kiosco y personal convivan en el mismo navegador:
 * SESSION_COOKIE la usa el kiosco (login Google simulado, catálogo, pedidos, /api/me);
 * STAFF_SESSION_COOKIE la usa el personal (login staff, cocina y, en la tarea 2, administración).
 * Cada ruta lee SOLO la cookie de su pantalla.
 */
export const SESSION_COOKIE = "vc_session";
export const STAFF_SESSION_COOKIE = "vc_staff_session";
export type SessionScope = "kiosk" | "staff";

/**
 * API HTTP (Route Handlers en app/api). JSON in/out. Sesión por cookie httpOnly: SESSION_COOKIE en las
 * rutas del kiosco y STAFF_SESSION_COOKIE en /api/auth/staff y /api/kitchen/** (ver arriba).
 *
 *  GET  /api/auth/demo-accounts       público -> DemoAccounts
 *  POST /api/auth/google  {email}     público; solo cuentas rol cliente activas -> { user: User }  (setea cookie)
 *  POST /api/auth/staff   {email,password} público; solo cocina/admin activos -> { user: User, redirect: "/cocina"|"/admin" }
 *  POST /api/auth/logout[?scope=staff] -> { ok: true } (borra la sesión y la cookie del kiosco o, con scope=staff, del personal)
 *  GET  /api/me                       -> { user: User | null }
 *
 *  GET  /api/catalog                  cliente -> Catalog (todas las categorías y productos, con `available`)
 *  POST /api/orders  CreateOrderInput cliente -> { order: Order } (estado pendiente_pago)
 *  GET  /api/orders/:id               cliente dueño -> { order: Order }
 *  POST /api/orders/:id/pay           cliente dueño, pendiente_pago -> pagado -> { order }
 *  POST /api/orders/:id/cancel        cliente dueño, pendiente_pago -> cancelado -> { order }
 *  POST /api/orders/:id/finish        cliente dueño, listo -> entregado -> { order }
 *
 *  GET  /api/kitchen/orders           cocina -> { orders: Order[] } (todos los pagado y listo, más viejo primero)
 *  POST /api/kitchen/orders/:id/ready cocina, pagado -> listo -> { order }
 *
 * Tiempo real: polling cada 2 s de GET /api/orders/:id (kiosco) y GET /api/kitchen/orders (cocina).
 */

// ---- Contratos de la tarea 2 ----
/**
 * «Pedí lo de siempre» — lib/services/orders.ts exporta
 *   getLastOrder(actor: SessionUser | null): Order | null
 * - solo rol cliente (si no, UNAUTHENTICATED / FORBIDDEN); devuelve el pedido más reciente
 *   DEL PROPIO actor con estado pagado | listo | entregado (nunca pendiente_pago ni cancelado);
 *   null si no tiene ninguno.
 * - el kiosco lo repite llamando a createOrder con sus items (productId, quantity): los precios se
 *   recalculan con los actuales y si algún producto ya no está disponible createOrder falla con
 *   VALIDATION (el kiosco avisa y ofrece armar el pedido). Después va directo al pago (QR).
 * - Ruta: GET /api/orders/last (cookie del kiosco) -> { order: Order | null }.
 */

/** Límites de validación de la administración (los aplica el servidor). */
export const ADMIN_LIMITS = {
  emailMax: 120,
  userNameMax: 60,
  categoryNameMax: 40,
  productNameMax: 60,
  descriptionMax: 200,
  minPrice: 1,
  maxPrice: 1_000_000,
} as const;

/**
 * Alta / edición de usuario. Edición = parcial (solo los campos enviados).
 * - email: se recorta y pasa a minúsculas; formato x@y.z; único (sin distinguir mayúsculas).
 * - name: se recorta; 1..userNameMax.  role ∈ ROLES.  active: boolean (edición permite reactivar).
 * - Personal nuevo (o cliente que pasa a cocina/admin sin contraseña) recibe la contraseña de demo
 *   STAFF_DEMO_PASSWORD (lib/db.ts). Los clientes no tienen contraseña (Google simulado).
 * - Un admin no puede darse de baja ni quitarse el rol admin a sí mismo, y ningún cambio puede dejar
 *   cero admins activos (VALIDATION). El actor se relee dentro de la transacción (degradado → FORBIDDEN).
 * - Baja (active=false, por edición o DELETE) o cambio de rol borra todas sus sesiones: no puede entrar
 *   ni usar una sesión previa. No se borran usuarios (sus pedidos siguen en el historial).
 * - Nombres sin caracteres de control ni hechos solo de invisibles (también categorías y productos).
 */
export interface UserInput {
  email: string;
  name: string;
  role: Role;
  active?: boolean; // por defecto true en el alta
}

/** Categoría: name se recorta, 1..categoryNameMax; sort entero >= 0 (por defecto: al final). El slug lo genera el servidor (único). */
export interface CategoryInput {
  name: string;
  sort?: number;
}

/**
 * Producto: categoryId existente; name 1..productNameMax; description 0..descriptionMax;
 * price entero minPrice..maxPrice; icon ∈ ICON_KEYS; available boolean (por defecto true);
 * sort entero >= 0 (por defecto: al final de su categoría). Slug generado por el servidor (único).
 * Edición parcial. No se borran productos: se marcan no disponibles (los pedidos guardan su copia).
 */
export interface ProductInput {
  categoryId: number;
  name: string;
  description?: string;
  price: number;
  icon: IconKey;
  available?: boolean;
  sort?: number;
}

/**
 * Servicios de administración (rol admin; sin sesión UNAUTHENTICATED, otro rol FORBIDDEN;
 * datos inválidos VALIDATION; id inexistente NOT_FOUND). Orden: sesión → rol → existencia → validación.
 *
 * lib/services/users.ts
 *   listUsers(actor): User[]                              (orden: rol, nombre)
 *   createUser(actor, input: unknown): User               (valida como UserInput)
 *   updateUser(actor, id: unknown, patch: unknown): User  (Partial<UserInput>)
 *   deactivateUser(actor, id: unknown): User              (baja: active=false + borra sesiones)
 *
 * lib/services/admin-catalog.ts
 *   getAdminCatalog(actor): Catalog                       (todas las categorías y productos, incluidos no disponibles)
 *   createCategory(actor, input: unknown): Category
 *   updateCategory(actor, id: unknown, patch: unknown): Category
 *   deleteCategory(actor, id: unknown): void              (solo si no tiene productos; si no, VALIDATION)
 *   createProduct(actor, input: unknown): Product
 *   updateProduct(actor, id: unknown, patch: unknown): Product   (precio, disponibilidad, etc.)
 *
 * Rutas (cookie del personal: handle(fn, "staff")):
 *   GET    /api/admin/users              -> { users: User[] }
 *   POST   /api/admin/users      UserInput            -> { user: User }
 *   PATCH  /api/admin/users/:id  Partial<UserInput>   -> { user: User }
 *   DELETE /api/admin/users/:id                       -> { user: User }   (baja)
 *   GET    /api/admin/catalog                         -> Catalog
 *   POST   /api/admin/categories CategoryInput        -> { category: Category }
 *   PATCH  /api/admin/categories/:id Partial<CategoryInput> -> { category: Category }
 *   DELETE /api/admin/categories/:id                  -> { ok: true }
 *   POST   /api/admin/products   ProductInput         -> { product: Product }
 *   PATCH  /api/admin/products/:id Partial<ProductInput> -> { product: Product }
 *
 * Páginas: /admin redirige a /admin/catalogo; /admin/catalogo y /admin/usuarios (rol admin, si no
 * redirigen a /personal). app/admin/layout.tsx pone la barra superior y las pestañas.
 * El kiosco (GET /api/catalog) ya muestra los cambios: no disponibles aparecen deshabilitados.
 */
