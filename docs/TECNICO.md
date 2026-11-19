# Vibe Coffee — Documento técnico

Diseño y contratos de la app. Para instalarla y usarla: [README.md](../README.md). Para trabajar
en el repo: [CLAUDE.md](../CLAUDE.md). Criterios de aceptación y resultados:
[docs/VALIDACION.md](VALIDACION.md). Requisitos originales: [spec-1.md](../spec-1.md) (tarea 1) y
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

### Tarea 2: partes en paralelo (hecha)

El coordinador escribió primero los contratos de la tarea 2 (al final de `lib/contracts.ts`, íconos
nuevos en `ICON_KEYS`, `app/admin/layout.tsx` con las pestañas y `app/admin/admin.css`). Con eso se
lanzaron juntos:

| Parte | Archivos propios |
|---|---|
| Usuarios y roles | `lib/services/users.ts`, `app/api/admin/users/**`, `app/admin/usuarios/**` |
| Catálogo | `lib/services/admin-catalog.ts`, `app/api/admin/{catalog,categories,products}/**`, `app/admin/catalogo/**` |
| Kiosco «Pedí lo de siempre» | `getLastOrder` en `lib/services/orders.ts`, `app/api/orders/last`, kiosco (`app/page.tsx` y sus componentes) |
| Datos de demo e íconos | semilla en `lib/db.ts` (catálogo completo, clientes, pedidos anteriores), `components/icons.tsx` |
| Pruebas | `tests/**` (CA-15 a CA-21) |
| Documentación | `README.md`, `CLAUDE.md`, este documento, `docs/VALIDACION.md` |

Después: revisión de código y revisión de diseño de todas las pantallas por agentes distintos de los
que construyeron, y verificación en la app (etapa 5 y estado limpio) por el coordinador, con los
resultados en [docs/VALIDACION.md](VALIDACION.md).

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
- CA-21 (T2): solo admin accede a la gestión; cliente y cocina reciben 403 en la API y redirección en las páginas.
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
- **Semilla con `INSERT OR IGNORE`** por clave natural (email, slug): se puede correr cuantas veces
  se quiera sin duplicar ni pisar lo editado. La app la aplica sola al abrir la base.
- **SQLite síncrono** (`better-sqlite3`): API simple, sin pool; suficiente para una demo local.
- **No se borran productos ni usuarios** (tarea 2): un producto se marca no disponible y un usuario
  se da de baja (`active = 0`). Así el historial de pedidos sigue completo y consistente; solo se
  borran categorías vacías.
- **Slug generado en el servidor** para categorías y productos (único, a partir del nombre): el
  formulario no lo pide y no puede chocar con la clave natural de la semilla.
- **Semilla de pedidos idempotente**: los pedidos no tienen clave natural, así que la semilla carga
  los pedidos anteriores de un cliente de demo solo si ese cliente todavía no tiene ningún pedido
  `pagado`, `listo` o `entregado` (los pendientes o cancelados no cuentan como historial).
- **«Pedí lo de siempre» reusa `createOrder`**: el kiosco toma los items de `getLastOrder` y crea un
  pedido nuevo; precios, disponibilidad y límites se validan igual que en un pedido armado a mano.

## Modelo de datos

Esquema completo en [lib/db.ts](../lib/db.ts) (`SCHEMA`). Fechas en texto ISO UTC; booleanos como 0/1.

| Tabla | Campos principales | Notas |
|---|---|---|
| `users` | `email` único (sin distinguir mayúsculas), `name`, `role` ∈ cliente/cocina/admin, `password_hash`, `active` | `password_hash` solo para personal; baja = `active = 0` |
| `sessions` | `token` (PK), `user_id` | se borran con el usuario (`ON DELETE CASCADE`) |
| `categories` | `slug` único, `name`, `sort` | |
| `products` | `slug` único, `category_id`, `name`, `description`, `price` entero > 0, `icon`, `available`, `sort` | `icon` ∈ `ICON_KEYS` |
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

Tarea 2:

| Función | Archivo | Quién | Efecto / reglas |
|---|---|---|---|
| `getLastOrder(actor): Order \| null` | orders.ts | cliente | último pedido **propio** en `pagado`/`listo`/`entregado`; `null` si no tiene |
| `listUsers(actor): User[]` | users.ts | admin | todos, por rol y nombre |
| `createUser(actor, input): User` | users.ts | admin | valida como `UserInput`; personal nuevo recibe la contraseña de demo |
| `updateUser(actor, id, patch): User` | users.ts | admin | edición parcial (incluye rol y reactivar); `active=false` o cambio de rol borran sus sesiones |
| `deactivateUser(actor, id): User` | users.ts | admin | baja: `active=false` y borra sus sesiones |
| `getAdminCatalog(actor): Catalog` | admin-catalog.ts | admin | todas las categorías y productos, incluidos no disponibles |
| `createCategory` / `updateCategory(actor, …): Category` | admin-catalog.ts | admin | valida `CategoryInput`; slug generado en el servidor |
| `deleteCategory(actor, id): void` | admin-catalog.ts | admin | solo si no tiene productos; si no, `VALIDATION` |
| `createProduct` / `updateProduct(actor, …): Product` | admin-catalog.ts | admin | valida `ProductInput` (precio, ícono, disponibilidad…); edición parcial; no hay borrado |

Orden de chequeo en cada operación: sesión (`UNAUTHENTICATED`) → rol (`FORBIDDEN`) →
existencia (`NOT_FOUND`) → propiedad (`FORBIDDEN`) → transición (`INVALID_TRANSITION`). En la
administración: sesión → rol → existencia → validación (`VALIDATION`).

Validación de la administración (límites en `ADMIN_LIMITS`): email recortado, en minúsculas, con
formato `x@y.z` y único sin distinguir mayúsculas; nombres recortados y no vacíos; rol ∈ `ROLES`;
precio entero entre `minPrice` y `maxPrice`; ícono ∈ `ICON_KEYS`; `categoryId` existente; `sort`
entero ≥ 0. Detalle en los comentarios de `UserInput`, `CategoryInput` y `ProductInput`.

Validación de `createOrder` (`VALIDATION`): `items` es array de 1 a `LIMITS.maxLines` líneas;
`productId` entero existente; producto `available`; `quantity` entero entre 1 y 20; un mismo
`productId` repetido se suma y la suma también debe ser ≤ 20. Cualquier campo extra (p. ej. `price`)
se ignora: el importe siempre sale de `products.price`.

### HTTP

Rutas en `app/api/**/route.ts` (ver lista en `lib/contracts.ts`). Cada handler: lee la cookie de
su pantalla → `getSessionUser` → llama al servicio → JSON. `AppError` → status de `ERROR_STATUS`
con `{ error: { code, message } }`; cualquier otro error → 500 `INTERNAL` sin detalles internos.
El `:id` de la URL se pasa crudo al servicio, que lo valida después de sesión y rol (así `/api/orders/abc`
sin sesión da 401, no 404).
**Una cookie por pantalla**: `vc_session` (kiosco: `/api/auth/google`, `/api/me`, `/api/catalog`,
`/api/orders/**`) y `vc_staff_session` (personal: `/api/auth/staff`, `/api/kitchen/**` y las páginas
`/cocina`, `/admin/**` y las rutas `/api/admin/**`). Se elige con `handle(fn, "staff")` y
`getCurrentUser("staff")` (por defecto en Server Components). `POST /api/auth/logout` cierra la del
kiosco y `?scope=staff` la del personal. Así kiosco y cocina conviven en el mismo navegador: entrar como
personal no pisa ni revoca la sesión del cliente. Cookie: `httpOnly`, `sameSite=lax`, `path=/`, `maxAge` 12 h, `Secure` solo con `VIBE_COOKIE_SECURE=1`
(la demo corre por HTTP local, también por la IP de red). Anti-CSRF: `handle` rechaza con 403 todo
método distinto de GET cuyo `Origin` no coincida con `Host` (cubre otros puertos del mismo host).
Token: 32 bytes aleatorios (hex). Las sesiones vencen a las 12 h (`SESSION_TTL_HOURS`) y un login
nuevo revoca la sesión previa del mismo navegador.

Rutas de la tarea 2:

| Ruta | Cookie | Respuesta |
|---|---|---|
| `GET /api/orders/last` | kiosco | `{ order: Order \| null }` |
| `GET /api/admin/users` · `POST` (`UserInput`) | personal | `{ users }` · `{ user }` |
| `PATCH /api/admin/users/:id` (`Partial<UserInput>`) · `DELETE` (baja) | personal | `{ user }` |
| `GET /api/admin/catalog` | personal | `Catalog` (incluye no disponibles) |
| `POST /api/admin/categories` · `PATCH`/`DELETE /api/admin/categories/:id` | personal | `{ category }` · `{ ok: true }` |
| `POST /api/admin/products` · `PATCH /api/admin/products/:id` | personal | `{ product }` |

### Páginas

| Ruta | Rol | Contenido |
|---|---|---|
| `/` | público → cliente | kiosco: bienvenida + Google simulado → menú por categorías + carrito → QR → estado/aviso → terminar |
| `/personal` | público | entrada única del personal, precargada con la cuenta de cocina; un toque cambia a admin |
| `/cocina` | cocina | tablero de pedidos pagados en tiempo real (polling 2 s), botón «Listo» |
| `/admin` | admin | redirige a `/admin/catalogo` |
| `/admin/catalogo` | admin | categorías y productos: alta, edición, precio, ícono, disponibilidad |
| `/admin/usuarios` | admin | usuarios: alta, edición, rol, baja y reactivación |

`app/admin/layout.tsx` pone la barra superior y las pestañas (`AdminTabs`) de la administración y
redirige a `/personal` si no es admin; cada página y cada ruta `/api/admin/**` vuelve a verificar.
Las páginas protegidas verifican sesión y rol en el servidor (Server Component) y redirigen a
`/personal` si no corresponde. La API vuelve a verificar todo: la página no es el control.

### Diseño

- Variables: `app/globals.css` (`--vc-green` verde claro de marca, `--vc-green-strong`,
  `--vc-green-soft`, `--vc-ink`, `--vc-muted`, `--vc-surface`, `--vc-line`, `--vc-radius`,
  `--vc-tap` 64 px de toque mínimo, `--vc-kiosk-width`) y clases `vc-*`.
- Componentes: `components/ui.tsx` (`Button`, `Card`, `Brand`, `Price`, `formatPrice`,
  `StatusBadge`, `STATUS_LABEL`, `orderNumber`, `api` para fetch JSON) y
  `components/icons.tsx` (`ProductIcon({ icon: IconKey, size })`, un SVG propio por `ICON_KEYS`).
- Íconos de la tarea 2: `americano`, `mocha`, `frio`, `chocolate`, `limonada`, `agua`, `alfajor`,
  `cookie`, `muffin` (catálogo completo).
- Administración: `app/admin/admin.css` con clases `ad-*` compartidas (`ad-main`, `ad-tabs`/`ad-tab`,
  `ad-head`, `ad-title`, `ad-table`, `ad-form`/`ad-field`, `ad-actions`, `ad-msg`…), sobre las
  variables `--vc-*`; cada sección suma lo propio con prefijo `adc-` (catálogo) o `adu-` (usuarios).
  Reusa la barra del personal (`app/personal/staff.css`).

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
- **Administración** (tarea 2): toda validación de usuarios y catálogo se hace en el servidor
  (`users.ts`, `admin-catalog.ts`), con la cookie del personal y rol `admin`. Un admin no puede
  darse de baja ni quitarse el rol `admin` a sí mismo (`VALIDATION`), y ningún cambio puede dejar
  cero admins activos (`VALIDATION`, chequeado dentro de la transacción). Las operaciones de
  usuarios vuelven a leer al actor dentro de la transacción: un admin degradado o dado de baja con
  una petición en vuelo recibe `FORBIDDEN`. Los nombres (usuarios, categorías, productos) rechazan
  caracteres de control, saltos de línea y nombres hechos solo de caracteres invisibles.
  Dar de baja o cambiar el rol borra todas las sesiones del usuario: no puede entrar ni seguir con una sesión previa
  (`getSessionUser` además ignora usuarios inactivos). Las respuestas nunca incluyen `password_hash`.
- **Personal nuevo**: el que da de alta admin recibe la contraseña de demo (`STAFF_DEMO_PASSWORD`,
  `cafe1234`), guardada con scrypt. Es un dato de demo documentado, no un secreto; en un despliegue
  real habría que pedir una contraseña propia.
- **«Pedí lo de siempre»**: `getLastOrder` filtra por el usuario de la sesión; nunca recibe un id de
  pedido ni de cliente desde la interfaz.
- **Mínimo acceso**: cada rol accede solo a sus rutas (cliente: catálogo y sus pedidos; cocina:
  tablero; admin: gestión); `/api/auth/demo-accounts` expone solo email, nombre y rol de cuentas activas, más la contraseña de demo.

## Pendientes

- Un pedido `listo` que el cliente no termina queda así; cocina no tiene acción para entregarlo
  (alcanza para la demo: «Terminar» en el kiosco lo cierra).
- El personal nuevo usa la contraseña de demo; no hay cambio de contraseña.
- Volver a cargar la semilla (o reiniciar la app) recrea una categoría de demo que admin haya
  borrado, porque la semilla completa lo que falta por slug.
- Resultados de la verificación en la app y desde estado limpio: ver [docs/VALIDACION.md](VALIDACION.md).
