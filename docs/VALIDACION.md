# Vibe Coffee — Validación

Criterios de aceptación, pruebas, resultados, recorrido de demostración y pendientes. Los criterios
completos están en [docs/TECNICO.md](TECNICO.md#criterios-de-aceptación); la instalación, en
[README.md](../README.md).

Un resultado dice «pendiente» hasta que se ejecuta la comprobación; no se declara verificado lo que
no se ejecutó.

## Criterios de aceptación

| Criterio | Cómo se verifica | Resultado |
|---|---|---|
| CA-1 Google simulado → sesión y menú por categorías | recorrido, paso K1; `flow.test.ts`, `auth.test.ts` | ✅ recorrido en Chrome (Sofía) + pruebas |
| CA-2 carrito: agregar, cambiar, quitar; total = servidor | recorrido, paso K2; `validation.test.ts` (precios desde la base) | ✅ pruebas (`validation.test.ts`); total del QR = servidor en el recorrido |
| CA-3 pedido `pendiente_pago`, QR con importe, pago → `pagado` | recorrido, paso K3; `flow.test.ts` | ✅ recorrido (QR $ 5.900 → pago) + `flow.test.ts` |
| CA-4 pagado aparece en cocina en ≤ 3 s; sin pagar o cancelado nunca | recorrido, pasos K3–C1 (cronometrado a ojo); `permissions.test.ts`, `transitions.test.ts` | ✅ recorrido: el pedido apareció en cocina en ≤ 3 s sin recargar; pruebas |
| CA-5 «Listo» → aviso en el kiosco en ≤ 3 s | recorrido, paso C2 | ✅ recorrido: aviso «¡Tu pedido está listo!» en ≤ 3 s |
| CA-6 «Terminar» → `entregado`, cierra sesión, vuelve a la bienvenida | recorrido, paso K4; `flow.test.ts` | ✅ recorrido: «Ya lo retiré · Terminar» volvió a la bienvenida; `flow.test.ts` |
| CA-7 `/personal` precargada con cocina; un toque cambia a admin; cada rol a su pantalla | recorrido, pasos C0 y A0 | ✅ recorrido: precargada con cocina → `/cocina`; un toque a admin → `/admin/catalogo` |
| CA-8 sin sesión u otro rol: `/cocina` y `/admin` redirigen; API 401/403 | recorrido, pasos N1–N3; `permissions.test.ts`, `http.test.ts` | ✅ curl: cliente → `/cocina` y `/admin/usuarios` 307 a `/personal`; pruebas |
| CA-9 pedido ajeno 403; cliente no marca listo | `permissions.test.ts` | ✅ curl: pedido ajeno 403; `permissions.test.ts` |
| CA-10 items inválidos → 400; precios del cliente ignorados | `validation.test.ts` | ✅ `validation.test.ts` |
| CA-11 transiciones inválidas → 409 | `transitions.test.ts` | ✅ `transitions.test.ts` |
| CA-12 `npm run seed` ×2 sin duplicados | `seed.test.ts`; verificación desde estado limpio | ✅ `seed.test.ts`, `demo-seed.test.ts`; seed ×2 en clon limpio |
| CA-13 `npm test` pasa y cubre recorrido y CA-8 a CA-11 | `npm test` | ✅ `npm test` 175/175 |
| CA-14 verde de marca, fondo blanco, toques grandes, íconos propios | revisión de diseño de todas las pantallas | ✅ revisión de diseño en Chrome de kiosco, cocina, `/personal`, `/admin/catalogo` y `/admin/usuarios` |
| CA-15 admin da de alta, edita, da de baja y asigna rol; datos inválidos rechazados | recorrido, paso A2; pruebas de usuarios (tarea 2, en curso) | ✅ recorrido: email repetido rechazado con mensaje; baja con confirmación en la fila; `admin-users.test.ts`, `review-rules.test.ts` |
| CA-16 usuario dado de baja no entra y su sesión previa deja de funcionar | recorrido, paso A3; pruebas de usuarios (tarea 2, en curso) | ✅ recorrido: Camila dada de baja desaparece del selector y su login da 401; pruebas |
| CA-17 admin gestiona categorías y productos con validación; se ve en el kiosco | recorrido, paso A1; pruebas de catálogo (tarea 2, en curso) | ✅ recorrido: precio de Espresso 2.200 → 2.500 y alta de «Flat white» visibles en el kiosco; precio 0 rechazado; `admin-catalog.test.ts` |
| CA-18 producto no disponible no se puede pedir (ni por «de siempre») | recorrido, pasos A1 y K6; `validation.test.ts` y pruebas nuevas (tarea 2, en curso) | ✅ recorrido: Cappuccino no disponible → deshabilitado en el menú y «de siempre» de Sofía bloqueado con aviso; pruebas |
| CA-19 «Pedí lo de siempre» solo con pedido anterior propio; repite y va al pago | recorrido, pasos K5 y K7 | ✅ recorrido: Sofía → «Pedí lo de siempre» → QR directo; `last-order.test.ts` (Camila → null) |
| CA-20 «Pedí lo de siempre» nunca usa pedidos de otro cliente | pruebas de `getLastOrder` (tarea 2, en curso) | ✅ `last-order.test.ts`; curl: Lucas recibe solo el suyo |
| CA-21 solo admin accede a la gestión: 403 en la API y redirección en páginas | recorrido, pasos N2–N3; pruebas de permisos de admin (tarea 2, en curso) | ✅ recorrido: cocina → `/admin/usuarios` redirige; API admin 403 (cocina) y 401 (cookie del kiosco); `http-admin.test.ts` |
| CA-22 semilla completa repetible sin duplicar ni pisar | `seed.test.ts` (ampliado, tarea 2, en curso); verificación desde estado limpio | ✅ `demo-seed.test.ts`, `review-rules.test.ts`; seed ×2 en clon limpio |
| CA-23 `npm test` amplía con CA-15 a CA-21 y pasa | `npm test` | ✅ `npm test` 175/175 (13 archivos) |
| CA-24 instalación y ejecución desde estado limpio | [Verificación desde estado limpio](#verificación-desde-estado-limpio) | ✅ ver [Verificación desde estado limpio](#verificación-desde-estado-limpio) |

## Pruebas automáticas

```bash
npm test           # Vitest sobre los servicios (base :memory:) y la capa HTTP
npm run typecheck
```

| Archivo | Qué cubre |
|---|---|
| `tests/helpers.ts` | base nueva en memoria por prueba, actores de cada rol y matcher de `AppError` |
| `tests/flow.test.ts` | recorrido principal: pedido → pago → cocina → listo → terminar |
| `tests/auth.test.ts` | `loginCustomer`, `loginStaff`, sesiones (vencimiento, logout, inactivos), `requireRole`, `listDemoAccounts` |
| `tests/permissions.test.ts` | sin sesión → 401, rol incorrecto → 403, pedidos ajenos y existencia |
| `tests/validation.test.ts` | `createOrder`: estructura de items, `productId`, cantidades, precios desde la base |
| `tests/transitions.test.ts` | transiciones válidas e inválidas (`INVALID_TRANSITION`) |
| `tests/seed.test.ts` | semilla idempotente |
| `tests/http.test.ts` | Route Handlers: orden sesión → rol → existencia, chequeo de `Origin`, una cookie por pantalla |
| `tests/admin-users.test.ts` | CA-15, CA-16, CA-21: permisos, validación de alta/edición, baja y reactivación, contraseña de demo del personal nuevo |
| `tests/admin-catalog.test.ts` | CA-17, CA-18, CA-21: categorías y productos, validación, slugs, cambios visibles en el kiosco |
| `tests/last-order.test.ts` | CA-18, CA-19, CA-20: `getLastOrder` propio, ignora pendientes/cancelados, repetir con precios actuales |
| `tests/demo-seed.test.ts` | CA-22: semilla completa idempotente, no pisa ediciones ni reactiva bajas |
| `tests/http-admin.test.ts` | rutas `/api/admin/**` y `GET /api/orders/last`: 401/403, cookie por pantalla, `Origin` |
| `tests/review-rules.test.ts` | reglas surgidas de la revisión: siempre queda un admin activo, actor degradado → 403, nombres con control o invisibles, semilla para clientes sin historial |
| `tests/http-helpers.ts` | utilidades para invocar Route Handlers |

El tiempo real (polling) no tiene pruebas automáticas: se comprueba en el recorrido.

Resultado de la última ejecución (2026-11-19): `npm test` → 13 archivos, **175 pruebas, 0 fallas**; `npm run typecheck` sin errores.

## Recorrido de demostración

Con la app corriendo (`npm run dev` o `npm run build && npm start`) y la base recién cargada
(`rm -f data/vibe.db* && npm run seed`). Ventana **A**: personal (cocina y admin). Ventana **B**:
kiosco, idealmente en vertical. Pueden ser dos pestañas del mismo navegador.

**Cocina y kiosco**

- C0. A: http://localhost:3000/personal viene con la cuenta de cocina → «Entrar» → `/cocina`.
- K1. B: http://localhost:3000 → «Tocá para pedir» → Sofía → menú por categorías.
- K2. B: agregá productos de dos categorías, cambiá una cantidad y quitá uno; el total se actualiza.
- K3. B: confirmá → QR con el importe → «Simular pago aprobado».
- C1. A: el pedido aparece solo en ≤ 3 s.
- C2. A: «Marcar listo» → B muestra «¡Tu pedido está listo!» en ≤ 3 s.
- K4. B: «Terminar» → vuelve a la bienvenida.
- K5. B: «Tocá para pedir» → Lucas → «Pedí lo de siempre» → va directo al QR con su último pedido
  (precios actuales). Pagalo y verificá que llega a cocina.
- K7. B: con Camila (sin pedidos) el botón «Pedí lo de siempre» no aparece.

**Administración**

- A0. A: «Salir» → en `/personal`, un toque cambia a la cuenta de admin → «Entrar» → `/admin/catalogo`.
- A1. A: cambiá el precio de un producto y marcá otro como no disponible. En B (nuevo cliente) el
  menú muestra el precio nuevo y el otro deshabilitado; no se puede agregar.
- K6. B: si el último pedido de un cliente incluye el producto no disponible, «Pedí lo de siempre»
  avisa y ofrece armar el pedido.
- A2. A: `/admin/usuarios` → alta de un usuario de cocina (entra con `cafe1234`), edición de nombre
  y rol; probá un email repetido o mal formado y un nombre vacío: se rechazan con mensaje.
- A3. A: dá de baja a un cliente (p. ej. Martín). En B ya no aparece entre las cuentas de Google
  simulado; si tenía sesión abierta, deja de funcionar.

**Lo que no debería poder hacerse**

- N1. Sin sesión de personal, abrir `/cocina` o `/admin/usuarios` → redirige a `/personal`.
- N2. Con sesión de cocina, abrir `/admin/catalogo` → redirige a `/personal`; `GET /api/admin/users`
  → 403.
- N3. Con sesión de cliente (kiosco), `GET /api/kitchen/orders` y `GET /api/admin/catalog` → 401
  (la cookie del kiosco no vale para el personal).
- N4. Como admin, intentar darse de baja o quitarse el rol admin → se rechaza.
- N5. Entrar a `/personal` con una contraseña incorrecta → se rechaza.

Resultado (2026-11-19, Chrome con dos pestañas sobre `next dev` y base nueva; los casos N con curl
y `fetch` desde la página): C0, K1, K3, C1, C2, K4, K5 (con Sofía), A0, A1, K6, A2 (email repetido,
alta de producto, precio 0 rechazado), A3 (baja de Camila), N1 (cliente → `/cocina` y
`/admin/usuarios`: 307), N2 (cocina: 307 y API 403), N3 (cookie del kiosco en `/api/admin/*`: 401)
**pasaron**. Además: pedido ajeno 403 y login de cliente dado de baja 401. K2, K7, N4 y N5 se
cubren con pruebas automáticas (no se repitieron a mano). Sin errores en el log del servidor.

**Revisión**: dos revisores independientes (usuarios + «de siempre»; catálogo + semilla + íconos)
encontraron 2 bugs de lógica (podía quedar sin admins con un actor desactualizado; la tarjeta «de
siempre» se perdía al retomar un pedido pendiente) y 3 de interfaz en el catálogo (el formulario de
edición pisaba cambios, reordenamiento a medias, interruptor optimista). Todos se corrigieron y
quedaron cubiertos por `review-rules.test.ts` o verificados en la app.

## Verificación desde estado limpio

```bash
DIR=$(mktemp -d) && git clone <repo> "$DIR/cafeteria-vibe" && cd "$DIR/cafeteria-vibe"
git checkout <rama>
npm install
npm run seed        # primera carga
npm run seed        # segunda: no duplica ni pisa (comparar conteos de users, categories, products, orders)
npm run build
npm start           # http://localhost:3000 → recorrido de demostración
```

| Paso | Resultado |
|---|---|
| `npm install` | pendiente |
| `npm run seed` ×2 (mismos conteos) | pendiente |
| `npm run build` | pendiente |
| `npm start` + recorrido | pendiente |

## Pendientes

- Completar los resultados de este documento con lo ejecutado (pruebas, recorrido, estado limpio).
- Completar la tabla de pruebas automáticas con los archivos nuevos de la tarea 2.
- Abiertos del producto: ver [Pendientes en docs/TECNICO.md](TECNICO.md#pendientes).
