# Vibe Coffee — Documento técnico

Diseño y contratos de la app. Para instalarla y usarla: [README.md](../README.md). Para trabajar
en el repo: [CLAUDE.md](../CLAUDE.md). Requisitos originales: [spec-1.md](../spec-1.md) (tarea 1) y
[spec-2.md](../spec-2.md) (tarea 2).

## Plan

### Etapas (marco SDLC)

1. **Planificación**: entorno (Node 24, npm), dependencias, riesgos y tareas en paralelo (esta sección).
2. **Requisitos**: usuarios, alcance, reglas críticas, supuestos y criterios de aceptación ([Requisitos](#requisitos)).
3. **Diseño**: arquitectura, datos, contratos y seguridad (secciones siguientes), escritos antes de implementar.
4. **Implementación**: primero el recorrido principal integrado (kiosco → pago → cocina → aviso); el resto en paralelo.
5. **Verificación y validación**: `npm test`, `npm run typecheck` y recorrido en la app con dos ventanas,
   incluyendo lo que no debe poder hacerse; revisión por agentes distintos de los que construyeron.

### Riesgos del entorno

| Riesgo | Mitigación |
|---|---|
| `better-sqlite3` es un módulo nativo: puede fallar la compilación/binario al instalar o al empaquetarlo Next | `serverExternalPackages: ["better-sqlite3"]` en `next.config.ts`; usarlo solo en código de servidor; si falla, `npm rebuild better-sqlite3` |
| Next.js 16 es reciente: APIs que cambian (p. ej. `params` y `cookies()` asíncronos) | seguir la API vigente, compilar con `npm run build` y probar en la app, no solo typecheck |
| Varios agentes con `next dev` a la vez chocan en `.next`, el puerto y la base | cada instancia con `NEXT_DIST_DIR`, `VIBE_DB_PATH` y puerto propios (ver CLAUDE.md) |
| La semilla corre con `node` sobre TypeScript | requiere Node 24 (carga TypeScript nativo) |

### Tarea 1: partes en paralelo

Un **coordinador** escribió primero los contratos compartidos (`lib/contracts.ts`, `lib/db.ts`,
`components/ui.tsx`, `app/globals.css`, sección [Contratos](#contratos)). Con eso se lanzaron juntos:

| Parte | Archivos propios |
|---|---|
| Backend: servicios y API | `lib/services/**`, `app/api/**` |
| Kiosco | `app/page.tsx` y componentes del kiosco, `components/icons.tsx` |
| Personal y cocina | `app/personal/**`, `app/cocina/**`, `app/admin/**` (mínima) |
| Pruebas | `tests/**` (Vitest sobre los servicios con base `:memory:`, más `tests/http.test.ts` sobre los Route Handlers) |
| Documentación | `README.md`, `CLAUDE.md`, `docs/TECNICO.md` |

Después: integración por el coordinador, **revisión** y **verificación** en la app por agentes
distintos de los que construyeron cada parte, correcciones y commit.

### Tarea 2: partes en paralelo

El coordinador amplió primero los contratos (sección «Contratos de la tarea 2» al final de
`lib/contracts.ts`, `ICON_KEYS` nuevos) y escribió el marco de `/admin` (`app/admin/layout.tsx`,
`AdminNav.tsx`, `page.tsx`, `admin.css`). Con eso se lanzaron juntos:

| Parte | Archivos propios |
|---|---|
| Administración de usuarios y roles | `lib/services/users.ts`, `app/api/admin/users/**`, `app/admin/usuarios/**` |
| Administración del catálogo | `lib/services/catalog-admin.ts`, `app/api/admin/{catalog,categories,products}/**`, `app/admin/catalogo/**` |
| «Pedí lo de siempre» | `getLastOrder` en `lib/services/orders.ts`, `app/api/orders/last/**`, `app/kiosco/**` |
| Datos de demo completos | semilla en `lib/db.ts` (`SEED` y `seed`), `components/icons.tsx` (íconos nuevos) |
| Pruebas ampliadas | `tests/**` |
| Documentación | `README.md`, `CLAUDE.md`, `docs/TECNICO.md`, `docs/VALIDACION.md` |

Después: integración, revisión de diseño de todas las pantallas contra las restricciones, etapa 5
completa en la app (cliente, cocina, administración y lo que no debe poder hacerse) por agentes
distintos de los constructores, verificación desde un estado limpio y commit. Resultados en
[docs/VALIDACION.md](VALIDACION.md).

## Requisitos

### Usuarios y roles

Roles fijos: `cliente` (usa el kiosco, entra con Google simulado), `cocina` (tablero de pedidos)
y `admin` (gestión de usuarios y catálogo). El personal (cocina y admin) entra por `/personal`.

### Alcance por tarea

- **Tarea 1**: recorrido principal en SQLite (Google simulado → menú por categorías y carrito →
  QR simulado → cocina en tiempo real → aviso de listo → terminar); entrada única del personal;
  `/admin` mínima; permisos y validaciones en el servidor; base de diseño; datos mínimos
  repetibles; pruebas de un comando; README, CLAUDE y este documento.
- **Tarea 2**: administración de usuarios/roles y del catálogo; «Pedí lo de siempre»; datos de
  demo completos (catálogo, clientes, pedidos anteriores); pruebas ampliadas; revisión de diseño;
  `docs/VALIDACION.md`; verificación desde estado limpio.

### Reglas críticas

- Toda pantalla y operación verifica sesión y rol en el servidor.
- El importe se calcula en el servidor con los precios guardados; el cliente no manda precios.
- Un cliente solo ve y opera sus propios pedidos.
- Solo cocina marca pedidos listos; solo admin gestiona usuarios y catálogo.
- Un pedido sin pagar no llega a cocina ni se puede marcar listo.
- Un producto no disponible no se puede pedir; un usuario dado de baja no puede entrar.
- Volver a cargar la semilla no duplica ni pisa datos.

### Supuestos

De la spec:

- SUPUESTO: el login con Google simulado consiste en elegir una de las cuentas de cliente de demo; crea una sesión real en la app, sin OAuth.
- SUPUESTO: el pago simulado muestra un QR con el importe del pedido y se aprueba desde la misma pantalla del kiosco, sin escanearlo. El pedido llega a cocina recién cuando está pagado.
- SUPUESTO: «Pedí lo de siempre» repite el último pedido del cliente y lo lleva directo al pago; se ofrece solo si tiene un pedido anterior.
- SUPUESTO: después de pagar, el kiosco muestra el pedido y su estado; ahí aparece el aviso cuando cocina lo marca listo, y el cliente termina para dejar el kiosco libre.
- SUPUESTO: hay una cuenta de demo por cada rol del personal; la entrada viene completada con una y permite elegir la otra en un toque.
- SUPUESTO: los roles son fijos (cliente, cocina y administración). Gestionar usuarios es darlos de alta, editarlos y darlos de baja; gestionar roles es asignar el de cada usuario.
- SUPUESTO: la disponibilidad es una marca por producto; un producto no disponible no se puede pedir.
- SUPUESTO: la interfaz va en español rioplatense, como «Pedí lo de siempre».

Propios:

- SUPUESTO: precios en pesos argentinos enteros (sin centavos).
- SUPUESTO: «tiempo real» es polling cada 2 s (kiosco y cocina).
- SUPUESTO: cantidad por producto de 1 a 20 y como máximo 30 líneas por pedido.
- SUPUESTO: el personal entra con contraseña de demo (`cafe1234`), precargada en `/personal`; es dato de demo, no un secreto.
- SUPUESTO: «Terminar» pasa el pedido a `entregado` y cierra la sesión del kiosco, que vuelve a la bienvenida.
- SUPUESTO: antes de pagar el cliente puede cancelar el pedido (`pendiente_pago → cancelado`).
- SUPUESTO: «Pedí lo de siempre» toma el último pedido pagado (pagado, listo o entregado) y recalcula con los precios actuales.

### Criterios de aceptación

**Tarea 1**

- CA-1 (T1): en `/` el cliente elige una cuenta de Google simulado y queda con sesión; ve el menú por categorías.
- CA-2 (T1): agrega, cambia cantidades y quita productos del carrito; el total mostrado coincide con el calculado por el servidor.
- CA-3 (T1): al confirmar se crea el pedido en `pendiente_pago`, se muestra un QR con el importe y «Simular pago aprobado» lo pasa a `pagado`.
- CA-4 (T1): un pedido `pagado` aparece en `/cocina` en ≤ 3 s sin recargar; uno `pendiente_pago` o `cancelado` nunca aparece.
- CA-5 (T1): «Listo» en cocina pasa el pedido a `listo` y el kiosco muestra el aviso en ≤ 3 s sin recargar.
- CA-6 (T1): «Terminar» pasa el pedido a `entregado`, cierra la sesión y el kiosco vuelve a la bienvenida.
- CA-7 (T1): `/personal` viene precargada con la cuenta de cocina y un toque cambia a la de admin; cocina llega a `/cocina` y admin a `/admin` (pantalla mínima).
- CA-8 (T1): sin sesión o con otro rol, `/cocina` y `/admin` redirigen a `/personal`, y la API responde 401/403.
- CA-9 (T1): un cliente no puede leer ni operar un pedido ajeno (403) y no puede marcar pedidos listos (403).
- CA-10 (T1): crear un pedido con producto inexistente o no disponible, cantidad fuera de 1–20 o no entera, lista vacía o de más de 30 líneas responde 400; precios enviados por el cliente se ignoran.
- CA-11 (T1): transiciones inválidas (marcar listo un pedido sin pagar, pagar dos veces, terminar sin estar listo) responden 409.
- CA-12 (T1): `npm run seed` dos veces seguidas deja los mismos datos, sin duplicados.
- CA-13 (T1): `npm test` pasa y cubre el recorrido principal y los casos prohibidos de CA-8 a CA-11.
- CA-14 (T1): las pantallas usan el verde de marca, fondo blanco, toques grandes e íconos propios para las bebidas.

**Tarea 2**

- CA-15 (T2): admin da de alta, edita y da de baja usuarios y asigna su rol; los datos inválidos (email repetido o mal formado, nombre vacío, rol inexistente) se rechazan.
- CA-16 (T2): un usuario dado de baja no puede entrar y su sesión previa deja de funcionar.
- CA-17 (T2): admin gestiona categorías y productos (nombre, descripción, precio, ícono, disponibilidad) con validación; los cambios se ven en el kiosco.
- CA-18 (T2): un producto marcado no disponible no se puede pedir (ni por «Pedí lo de siempre»).
- CA-19 (T2): «Pedí lo de siempre» aparece solo si el cliente tiene un pedido anterior propio, repite sus productos y va directo al pago.
- CA-20 (T2): «Pedí lo de siempre» nunca usa pedidos de otro cliente.
- CA-21 (T2): solo admin accede a la gestión; en la API cocina recibe 403 y un cliente 401 (solo tiene la cookie del kiosco, que la gestión no lee; con un token de cliente en la cookie del personal, 403); las páginas redirigen a `/personal`.
- CA-22 (T2): la semilla completa (catálogo, varios clientes, pedidos anteriores) se puede cargar de nuevo sin duplicar ni pisar datos.
- CA-23 (T2): `npm test` amplía las pruebas con CA-15 a CA-21 y pasa.
- CA-24 (T2): instalación y ejecución verificadas desde un estado limpio, con resultados en `docs/VALIDACION.md`.

## Arquitectura y decisiones

Monolito Next.js 16 (App Router): páginas (Server Components que verifican la sesión + componentes
cliente para la interacción) y Route Handlers en `app/api` que delegan en **servicios de dominio
síncronos** (`lib/services`) sobre `better-sqlite3`. Los servicios no conocen HTTP: reciben el
`actor` y lanzan `AppError`; así se prueban con Vitest sin levantar el servidor.

```
navegador ──fetch JSON / polling 2 s──▶ app/api/**/route.ts ──▶ lib/services/* ──▶ lib/db.ts (SQLite, data/vibe.db)
          ◀── páginas (Server Components verifican sesión y rol)
```

Decisiones:

- **Polling cada 2 s en vez de SSE/WebSocket**: es lo más simple que cumple la demo (un kiosco y
  una cocina en local), no requiere servidor propio ni conexiones persistentes y tolera recargas.
  Costo: hasta 2 s de demora y consultas repetidas, irrelevantes a esta escala.
- **Sesiones en tabla `sessions` con cookie `httpOnly`**: token aleatorio opaco; cerrar sesión o
  dar de baja a un usuario las invalida al instante (no hay JWT que expire después).
- **scrypt** (`node:crypto`) para las contraseñas del personal: incluido en Node, sin dependencias.
- **Precios copiados en `order_items`** (nombre, precio unitario, ícono): el pedido conserva lo que
  se cobró aunque admin cambie el catálogo después.
- **Transiciones atómicas**: cada cambio de estado es un `UPDATE ... WHERE id = ? AND status = ?`
  (o una transacción); si no cambia ninguna fila, `INVALID_TRANSITION`. Evita dobles pagos o
  carreras entre ventanas.
- **Semilla una vez por versión + `INSERT OR IGNORE`**: `seed()` corre dentro de una transacción y
  deja la marca `seed_version` en la tabla `meta`; con la marca al día no hace nada. Así lo que admin
  edite **o borre** (p. ej. el email de una cuenta de demo, una categoría) no reaparece al reiniciar
  —sin la marca, renombrar `admin@vibecoffee.local` hacía que volviera a crearse con la contraseña
  pública—. Una base anterior sin marca (tarea 1) recibe una vez lo que le falta, por clave natural
  (email, slug), sin pisar lo existente. La app la aplica sola al abrir la base.
- **SQLite síncrono** (`better-sqlite3`): API simple, sin pool; suficiente para una demo local.

Decisiones de la tarea 2:

- **Baja lógica de usuarios, sin borrado físico** (`active = 0` + borrar sus sesiones): los pedidos
  referencian al usuario y deben conservarse; la baja es reversible (reactivar con `active = true`).
- **Productos sin borrado**: se marcan no disponibles. `order_items` referencia el producto y
  guarda copia de nombre, precio e ícono, así que el historial no cambia. Las categorías sí se
  borran, pero solo vacías (si tienen productos → `INVALID_TRANSITION`), para no dejar productos huérfanos.
- **Slug automático** a partir del nombre (único, con sufijo `-2`, `-3`…) y fijo después: admin no
  tiene que inventar claves y la semilla, que identifica por slug, sigue siendo idempotente aunque
  se renombre un producto.
- **Pedidos anteriores de la semilla solo si el usuario es cliente y no tiene pedidos**: los pedidos
  no tienen clave natural; ese criterio (más la marca de versión) evita duplicarlos y no toca pedidos reales.
- **«Pedí lo de siempre» reutiliza `POST /api/orders`**: el kiosco manda los `productId` y
  cantidades del último pedido; precios, total y disponibilidad salen de la base como en cualquier
  pedido. No hay un camino de creación aparte que validar.
- **El kiosco recarga el catálogo al entrar cada cliente** (`GET /api/catalog`, sin caché): los
  cambios de admin se ven en el siguiente cliente sin tiempo real ni invalidaciones; si un producto
  se vuelve no disponible con el menú abierto, el servidor igual rechaza el pedido.
- **Personal nuevo sin contraseña recibe la de demo** (`cafe1234`): coherente con la entrada
  precargada; admin puede fijar otra (mínimo 8 caracteres).

## Modelo de datos

Esquema completo en [lib/db.ts](../lib/db.ts) (`SCHEMA`). Fechas en texto ISO UTC; booleanos como 0/1.

| Tabla | Campos principales | Notas |
|---|---|---|
| `users` | `email` único (sin distinguir mayúsculas, guardado en minúsculas), `name`, `role` ∈ cliente/cocina/admin, `password_hash`, `active` | `password_hash` solo para personal; baja lógica = `active = 0` (nunca se borran) |
| `sessions` | `token` (PK), `user_id` | se borran con el usuario (`ON DELETE CASCADE`) |
| `meta` | `key` (PK), `value` | `seed_version`: versión de la semilla ya aplicada |
| `categories` | `slug` único, `name`, `sort` | |
| `products` | `slug` único, `category_id`, `name`, `description`, `price` entero > 0, `icon`, `available`, `sort` | `icon` ∈ `ICON_KEYS`; no se borran (se marcan no disponibles) |
| `orders` | `user_id`, `status`, `total`, `created_at`, `paid_at`, `ready_at`, `finished_at` | índices por usuario/fecha y por estado |
| `order_items` | `order_id`, `product_id`, `name`, `unit_price`, `quantity` 1–20, `icon` | copia histórica del producto |

## Contratos

Fuente de verdad en código: [lib/contracts.ts](../lib/contracts.ts) (tipos, errores, rutas HTTP,
contratos de la tarea 2) y [lib/db.ts](../lib/db.ts) (esquema SQLite y semilla).

### Servicios de dominio (lib/services) — lógica del servidor, probada con Vitest

Todas las funciones son síncronas, usan `getDb()` y reciben `actor: SessionUser | null`
(el usuario de la sesión, resuelto por la capa HTTP). Fallan lanzando `AppError(code, msg)`:

| Función | Archivo | Quién | Efecto / reglas |
|---|---|---|---|
| `listDemoAccounts(): DemoAccounts` | auth.ts | público | clientes activos (Google simulado) y personal activo |
| `loginCustomer(email): { token, user }` | auth.ts | público | solo usuario existente, activo, rol `cliente`; si no, `UNAUTHENTICATED` |
| `loginStaff(email, password): { token, user }` | auth.ts | público | solo `cocina`/`admin` activos con contraseña correcta (scrypt); si no, `UNAUTHENTICATED` |
| `getSessionUser(token?): SessionUser \| null` | auth.ts | — | `null` si no hay token, no existe o el usuario está inactivo |
| `logout(token): void` | auth.ts | — | borra la sesión |
| `requireRole(actor, ...roles): SessionUser` | auth.ts | — | sin actor → `UNAUTHENTICATED`; otro rol → `FORBIDDEN` |
| `getCatalog(actor): Catalog` | catalog.ts | cliente | categorías y productos ordenados por `sort` |
| `createOrder(actor, input): Order` | orders.ts | cliente | valida items (ver abajo); precios y total desde la base; estado `pendiente_pago` |
| `getOrder(actor, id): Order` | orders.ts | cliente dueño | ajeno → `FORBIDDEN`; inexistente → `NOT_FOUND` |
| `payOrder(actor, id): Order` | orders.ts | cliente dueño | `pendiente_pago → pagado`, setea `paidAt` |
| `cancelOrder(actor, id): Order` | orders.ts | cliente dueño | `pendiente_pago → cancelado` |
| `finishOrder(actor, id): Order` | orders.ts | cliente dueño | `listo → entregado`, setea `finishedAt` |
| `listKitchenOrders(actor): Order[]` | orders.ts | cocina | estados `pagado` y `listo` (nunca `pendiente_pago`), del más viejo al más nuevo |
| `markReady(actor, id): Order` | orders.ts | cocina | `pagado → listo`, setea `readyAt`; otro estado → `INVALID_TRANSITION` |

Orden de chequeo en cada operación: sesión (`UNAUTHENTICATED`) → rol (`FORBIDDEN`) →
existencia (`NOT_FOUND`) → propiedad (`FORBIDDEN`) → transición (`INVALID_TRANSITION`).

Validación de `createOrder` (`VALIDATION`): `items` es array de 1 a `LIMITS.maxLines` líneas;
`productId` entero existente; producto `available`; `quantity` entero entre 1 y 20; un mismo
`productId` repetido se suma y la suma también debe ser ≤ 20. Cualquier campo extra (p. ej. `price`)
se ignora: el importe siempre sale de `products.price`.

### Servicios de la tarea 2

Mismas convenciones. En administración todo exige rol `admin`; orden de chequeo: sesión → rol →
validación del id → existencia (`NOT_FOUND`) → validación del cuerpo. Los cuerpos llegan como
`unknown`, los textos se recortan (trim) antes de validar y los campos extra se ignoran. Límites en
`ADMIN_LIMITS` (nombre de usuario 1–60, email ≤ 120 con formato `algo@algo.algo`, contraseña 8–200,
nombre de categoría 1–40, de producto 1–60, descripción ≤ 200, precio entero 1–1.000.000, `sort`
entero 0–10.000).

| Función | Archivo | Quién | Efecto / reglas |
|---|---|---|---|
| `getLastOrder(actor): Order \| null` | orders.ts | cliente | pedido más reciente **propio** en `pagado`/`listo`/`entregado` (nunca `pendiente_pago`, `cancelado` ni ajeno) |
| `listUsers(actor): User[]` | users.ts | admin | todos (activos e inactivos), por rol y nombre |
| `createUser(actor, input): User` | users.ts | admin | `UserInput`; email en minúsculas, único sin distinguir mayúsculas; rol ∈ `ROLES`; personal sin contraseña → la de demo; contraseña ignorada para clientes |
| `updateUser(actor, id, patch): User` | users.ts | admin | `UserPatch` (solo campos presentes), mismas reglas; cambiar rol o `active=false` borra sus sesiones; `active=true` reactiva; admin no puede quitarse el rol ni darse de baja (`VALIDATION`) |
| `deactivateUser(actor, id): User` | users.ts | admin | baja lógica (`active=false` + borra sesiones); sobre sí mismo → `VALIDATION`; idempotente |
| `getAdminCatalog(actor): Catalog` | catalog-admin.ts | admin | como `getCatalog`, incluye no disponibles |
| `createCategory(actor, input): Category` | catalog-admin.ts | admin | `CategoryInput`; slug generado (único); `sort` por defecto al final |
| `updateCategory(actor, id, patch): Category` | catalog-admin.ts | admin | el slug no cambia |
| `deleteCategory(actor, id): void` | catalog-admin.ts | admin | solo vacía; con productos → `INVALID_TRANSITION` |
| `createProduct(actor, input): Product` | catalog-admin.ts | admin | `ProductInput`; slug generado; `VALIDATION` si categoría inexistente, nombre/descripción, precio no entero o fuera de rango, ícono fuera de `ICON_KEYS`, `available` no booleano o `sort` inválido |
| `updateProduct(actor, id, patch): Product` | catalog-admin.ts | admin | mismas reglas; el slug no cambia. No hay borrado de productos |

### HTTP

Rutas en `app/api/**/route.ts` (ver lista en `lib/contracts.ts`). Cada handler: lee la cookie de
su pantalla → `getSessionUser` → llama al servicio → JSON. `AppError` → status de `ERROR_STATUS`
con `{ error: { code, message } }`; cualquier otro error → 500 `INTERNAL` sin detalles internos.
El `:id` de la URL se pasa crudo al servicio, que lo valida después de sesión y rol (así `/api/orders/abc`
sin sesión da 401, no 404).
**Una cookie por pantalla**: `vc_session` (kiosco: `/api/auth/google`, `/api/me`, `/api/catalog`,
`/api/orders/**`, incluida `/api/orders/last`) y `vc_staff_session` (personal: `/api/auth/staff`,
`/api/kitchen/**`, `/api/admin/**` y las páginas `/cocina` y `/admin/**`). Se elige con `handle(fn, "staff")` y
`getCurrentUser("staff")` (por defecto en Server Components). `POST /api/auth/logout` cierra la del
kiosco y `?scope=staff` la del personal. Así kiosco y cocina conviven en el mismo navegador: entrar como
personal no pisa ni revoca la sesión del cliente. Cookie: `httpOnly`, `sameSite=lax`, `path=/`, `maxAge` 12 h, `Secure` solo con `VIBE_COOKIE_SECURE=1`
(la demo corre por HTTP local, también por la IP de red). Anti-CSRF: `handle` rechaza con 403 todo
método distinto de GET cuyo `Origin` no coincida con `Host` (cubre otros puertos del mismo host).
Token: 32 bytes aleatorios (hex). Las sesiones vencen a las 12 h (`SESSION_TTL_HOURS`) y un login
nuevo revoca la sesión previa del mismo navegador.

Rutas de la tarea 2 (JSON; errores como arriba):

| Método y ruta | Cookie | Cuerpo | Respuesta |
|---|---|---|---|
| `GET /api/orders/last` | `vc_session` (cliente) | — | `{ order: Order \| null }` |
| `GET /api/admin/users` | `vc_staff_session` (admin) | — | `{ users: User[] }` |
| `POST /api/admin/users` | ídem | `UserInput` | `{ user: User }` |
| `PATCH /api/admin/users/:id` | ídem | `UserPatch` | `{ user: User }` |
| `DELETE /api/admin/users/:id` | ídem | — | `{ user: User }` (baja lógica) |
| `GET /api/admin/catalog` | ídem | — | `Catalog` |
| `POST /api/admin/categories` | ídem | `CategoryInput` | `{ category: Category }` |
| `PATCH /api/admin/categories/:id` | ídem | `CategoryPatch` | `{ category: Category }` |
| `DELETE /api/admin/categories/:id` | ídem | — | `{ ok: true }` |
| `POST /api/admin/products` | ídem | `ProductInput` | `{ product: Product }` |
| `PATCH /api/admin/products/:id` | ídem | `ProductPatch` | `{ product: Product }` |

En `/api/admin/**`: sin sesión del personal → 401 (es el caso de un cliente: solo tiene `vc_session`); sesión del personal sin rol admin (cocina) → 403.

### Páginas

| Ruta | Rol | Contenido |
|---|---|---|
| `/` | público → cliente | kiosco (`app/kiosco/**`): bienvenida + Google simulado → «Pedí lo de siempre» (si hay pedido anterior) o menú por categorías + carrito → QR → estado/aviso → terminar |
| `/personal` | público | entrada única del personal, precargada con la cuenta de cocina; un toque cambia a admin |
| `/cocina` | cocina | tablero de pedidos pagados en tiempo real (polling 2 s), botón «Marcar listo» |
| `/admin` | admin | redirige a `/admin/catalogo` |
| `/admin/catalogo` | admin | categorías y productos (precio, ícono, orden, disponibilidad) |
| `/admin/usuarios` | admin | usuarios y roles (alta, edición, baja/reactivación) |

Las páginas protegidas verifican sesión y rol en el servidor (Server Component) y redirigen a
`/personal` si no corresponde. `app/admin/layout.tsx` pone la barra y las pestañas y verifica el
rol, y cada página hija lo vuelve a verificar (los layouts no se re-ejecutan en cada navegación).
La API vuelve a verificar todo: la página no es el control.

### Diseño

- Variables: `app/globals.css` (`--vc-green` verde claro de marca, `--vc-green-strong`,
  `--vc-green-soft`, `--vc-ink`, `--vc-muted`, `--vc-surface`, `--vc-line`, `--vc-radius`,
  `--vc-tap` 64 px de toque mínimo, `--vc-kiosk-width`) y clases `vc-*`.
- Componentes: `components/ui.tsx` (`Button`, `Card`, `Brand`, `Price`, `formatPrice`,
  `StatusBadge`, `STATUS_LABEL`, `orderNumber`, `api` para fetch JSON) y
  `components/icons.tsx` (`ProductIcon({ icon: IconKey, size })`, un SVG propio por `ICON_KEYS`).

## Seguridad

- **Sesión y rol en el servidor**: cada página protegida los verifica en el Server Component y
  cada ruta de la API vuelve a hacerlo con `requireRole` en el servicio. La interfaz no es un control.
- **Importe en el servidor**: `createOrder` toma precios de `products` e ignora cualquier precio
  recibido; el total se guarda con el pedido.
- **Propiedad de pedidos**: un cliente solo lee y opera los suyos (`FORBIDDEN` si no); cocina solo
  ve pedidos pagados.
- **Validación de entradas**: tipos, enteros, rangos y existencia se validan en los servicios
  ([LIMITS](../lib/contracts.ts)); las consultas SQL usan parámetros, nunca concatenación.
- **Contraseñas**: hash scrypt con sal por usuario; `password_hash` nunca sale de la capa de datos
  (`User` no lo incluye). El login del personal hace el mismo trabajo de scrypt exista o no el
  usuario y limita la contraseña a 200 caracteres. Cookie de sesión `httpOnly` y `sameSite=lax`,
  token aleatorio de 32 bytes, vencimiento a las 12 h (las vencidas se borran al crear sesiones)
  y revocación de la sesión previa al entrar.
- **CSRF**: POST/PUT/DELETE desde otro origen se rechazan (chequeo de `Origin` en `handle`), además
  de `sameSite=lax`.
- **Kiosco compartido**: «Terminar» cierra la sesión del cliente; si alguien se va sin tocarlo,
  la sesión vence sola a las 12 h.
- **Sin secretos en el repo**: no hay claves ni credenciales reales. La contraseña de demo del
  personal (`cafe1234`) es un dato de demo público, expuesto a propósito para precargar `/personal`.
- **Errores**: `AppError` devuelve código y mensaje pensados para el usuario; cualquier otro error
  es 500 genérico, sin detalles internos (se registra solo en la consola del servidor).
- **Mínimo acceso**: cada rol accede solo a sus rutas (cliente: catálogo y sus pedidos; cocina:
  tablero; admin: gestión); `/api/auth/demo-accounts` expone solo email, nombre y rol de cuentas activas, más la contraseña de demo.
- **Administración solo con la sesión del personal**: `/api/admin/**` usa `handle(fn, "staff")` y
  lee solo `vc_staff_session`; una sesión de kiosco nunca da acceso a la gestión, y cada servicio
  exige rol `admin` (401 sin sesión del personal —incluido un cliente—, 403 cocina).
- **Validación en el servidor** de todo alta y edición (tipos, formato de email, unicidad, rol ∈
  `ROLES`, ícono ∈ `ICON_KEYS`, enteros y rangos de `ADMIN_LIMITS`); la interfaz de admin no es el control.
- **Baja y cambio de rol efectivos al instante**: dar de baja o cambiar el rol borra las sesiones
  del usuario, así una sesión abierta no conserva permisos viejos; `getSessionUser` además ignora
  usuarios inactivos y los logins los rechazan.
- **`password_hash` nunca expuesto**: los servicios de usuarios devuelven `User` (sin hash) y la
  contraseña recibida solo se guarda hasheada con scrypt.
- **Cambio de contraseña del personal** también borra sus sesiones abiertas.
- **Personal nuevo sin contraseña** recibe la de demo (`cafe1234`) y, como toda cuenta activa del
  personal, aparece en `/personal` con la contraseña precargada: es una decisión de demo; en un uso
  real habría que pedir contraseña propia.
- **Admin no se auto-bloquea**: un admin no puede quitarse el rol `admin` ni darse de baja
  (`VALIDATION`), así siempre queda al menos quien está administrando.

## Pendientes

- Un pedido `listo` que el cliente no termina queda así; cocina no tiene acción para entregarlo
  (la sesión del kiosco vence sola a las 12 h).
- Los cambios de catálogo no llegan a un menú ya abierto: se ven al entrar el siguiente cliente
  (el servidor igual rechaza productos no disponibles).
- Resultados de la verificación y otros pendientes de la entrega: [docs/VALIDACION.md](VALIDACION.md).
