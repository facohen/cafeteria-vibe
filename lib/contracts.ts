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
  // Tarea 2 (catálogo completo). components/icons.tsx dibuja cada una.
  "americano",
  "flat_white",
  "mocha",
  "submarino",
  "cafe_helado",
  "chai",
  "limonada",
  "licuado",
  "agua",
  "alfajor",
  "cookie",
  "torta",
  "tostadas",
  "yogur",
] as const;
export type IconKey = (typeof ICON_KEYS)[number];

/** Nombre legible de cada ícono (selector de íconos en administración). */
export const ICON_LABEL: Record<IconKey, string> = {
  espresso: "Espresso",
  cortado: "Cortado",
  latte: "Latte",
  cappuccino: "Cappuccino",
  te: "Té",
  jugo: "Jugo",
  medialuna: "Medialuna",
  tostado: "Tostado",
  budin: "Budín",
  generico: "Genérico",
  americano: "Americano",
  flat_white: "Flat white",
  mocha: "Mocha",
  submarino: "Submarino",
  cafe_helado: "Café helado",
  chai: "Chai",
  limonada: "Limonada",
  licuado: "Licuado",
  agua: "Agua",
  alfajor: "Alfajor",
  cookie: "Cookie",
  torta: "Torta",
  tostadas: "Tostadas",
  yogur: "Yogur",
};

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

// ============================================================================================
// ---- Contratos de la tarea 2 ----
// ============================================================================================

/**
 * «Pedí lo de siempre» — lib/services/orders.ts:
 *   getLastOrder(actor: SessionUser | null): Order | null
 * - solo rol cliente (si no, UNAUTHENTICATED / FORBIDDEN);
 * - devuelve el pedido más reciente (created_at, luego id) DEL PROPIO actor con estado
 *   pagado | listo | entregado (nunca pendiente_pago ni cancelado, nunca de otro usuario);
 * - el kiosco lo repite llamando a POST /api/orders con sus items (productId, quantity): los precios
 *   se recalculan con los actuales; si algún producto ya no está disponible, createOrder falla con
 *   VALIDATION y el kiosco lo avisa y deja armar el pedido a mano.
 * - Ruta: GET /api/orders/last (kiosco, cookie vc_session) -> { order: Order | null }.
 */

/**
 * Administración — todo exige rol admin con la sesión del PERSONAL (STAFF_SESSION_COOKIE,
 * `handle(fn, "staff")`). Sin sesión -> UNAUTHENTICATED (401); cliente o cocina -> FORBIDDEN (403).
 * Orden de chequeo: sesión → rol → validación de id → existencia (NOT_FOUND) → validación del cuerpo.
 * Los cuerpos se reciben como `unknown` y se validan en el servicio; campos extra se ignoran.
 */

/** Alta de usuario. `email` se guarda en minúsculas y sin espacios. */
export interface UserInput {
  email: string;
  name: string;
  role: Role;
  /** Por defecto true. */
  active?: boolean;
  /**
   * Solo personal (cocina/admin). Opcional: si se omite al dar de alta personal (o al pasar un
   * cliente a cocina/admin sin contraseña previa), se usa la contraseña de demo (STAFF_DEMO_PASSWORD).
   * Se ignora para clientes. Nunca se devuelve.
   */
  password?: string;
}
/** Edición parcial: solo se cambian los campos presentes. */
export type UserPatch = Partial<UserInput>;

export interface CategoryInput {
  name: string;
  /** Orden en el kiosco; entero >= 0. Por defecto: al final. */
  sort?: number;
}
export type CategoryPatch = Partial<CategoryInput>;

export interface ProductInput {
  categoryId: number;
  name: string;
  /** Por defecto "". */
  description?: string;
  price: number;
  /** Por defecto "generico". */
  icon?: IconKey;
  /** Por defecto true. */
  available?: boolean;
  /** Orden dentro de la categoría; entero >= 0. Por defecto: al final. */
  sort?: number;
}
export type ProductPatch = Partial<ProductInput>;

export const ADMIN_LIMITS = {
  userName: { min: 1, max: 60 },
  email: { max: 120 }, // formato: algo@algo.algo, sin espacios
  password: { min: 8, max: 200 },
  categoryName: { min: 1, max: 40 },
  productName: { min: 1, max: 60 },
  productDescription: { max: 200 },
  price: { min: 1, max: 1_000_000 }, // entero, pesos
  sort: { min: 0, max: 10_000 }, // entero
} as const;

/**
 * Servicios de administración (síncronos, `actor` primero, fallan con AppError; textos se recortan
 * con trim antes de validar):
 *
 * lib/services/users.ts
 *   listUsers(actor): User[]                         todos (activos e inactivos), por rol y nombre
 *   createUser(actor, input: unknown): User          VALIDATION: email mal formado o repetido
 *                                                    (sin distinguir mayúsculas), nombre vacío/largo,
 *                                                    rol fuera de ROLES, active no booleano, password
 *                                                    fuera de ADMIN_LIMITS.password
 *   updateUser(actor, id: unknown, patch: unknown): User
 *                                                    mismas reglas; cambiar rol o pasar active=false
 *                                                    borra las sesiones de ese usuario; active=true
 *                                                    lo reactiva. Un admin no puede quitarse a sí
 *                                                    mismo el rol admin ni darse de baja (VALIDATION).
 *   deactivateUser(actor, id: unknown): User         baja lógica: active=false + borra sus sesiones
 *                                                    (no puede entrar ni usar una sesión previa).
 *                                                    Sobre sí mismo -> VALIDATION. Idempotente.
 *   (No hay borrado físico: los pedidos referencian al usuario.)
 *
 * lib/services/catalog-admin.ts
 *   getAdminCatalog(actor): Catalog                  igual que getCatalog pero para admin
 *   createCategory(actor, input: unknown): Category  slug generado del nombre (único; -2, -3...)
 *   updateCategory(actor, id, patch: unknown): Category   el slug no cambia
 *   deleteCategory(actor, id): void                  solo si no tiene productos; si tiene ->
 *                                                    INVALID_TRANSITION (409)
 *   createProduct(actor, input: unknown): Product    slug generado del nombre (único); VALIDATION:
 *                                                    categoryId inexistente, nombre, descripción,
 *                                                    precio no entero o fuera de rango, icon fuera
 *                                                    de ICON_KEYS, available no booleano, sort
 *   updateProduct(actor, id, patch: unknown): Product     mismas reglas; el slug no cambia
 *   (No hay borrado de productos: se marcan no disponibles. Los pedidos guardan copia histórica.)
 *
 * Los cambios de catálogo se ven en el kiosco al recargar el menú (GET /api/catalog no cachea).
 */

/**
 * API de administración (Route Handlers en app/api/admin, todos con `handle(fn, "staff")`):
 *
 *  GET    /api/admin/users                      -> { users: User[] }
 *  POST   /api/admin/users        UserInput     -> { user: User }
 *  PATCH  /api/admin/users/:id    UserPatch     -> { user: User }
 *  DELETE /api/admin/users/:id                  -> { user: User }   (baja lógica)
 *
 *  GET    /api/admin/catalog                    -> Catalog
 *  POST   /api/admin/categories   CategoryInput -> { category: Category }
 *  PATCH  /api/admin/categories/:id CategoryPatch -> { category: Category }
 *  DELETE /api/admin/categories/:id             -> { ok: true }
 *  POST   /api/admin/products     ProductInput  -> { product: Product }
 *  PATCH  /api/admin/products/:id ProductPatch  -> { product: Product }
 *
 * Páginas (Server Components verifican rol admin con getCurrentUser("staff"); si no, redirect a /personal):
 *  /admin            -> redirige a /admin/catalogo
 *  /admin/catalogo   categorías y productos (precio, ícono, disponibilidad)
 *  /admin/usuarios   usuarios y roles
 *  app/admin/layout.tsx (coordinador) pone barra superior, pestañas y verificación de rol.
 */
