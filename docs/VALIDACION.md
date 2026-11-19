# Vibe Coffee — Validación

Criterios de aceptación, pruebas, resultados, recorrido de demostración y pendientes. Los criterios
completos están en [docs/TECNICO.md](TECNICO.md#criterios-de-aceptación); la instalación, en
[README.md](../README.md).

Un resultado dice «pendiente» hasta que se ejecuta la comprobación; no se declara verificado lo que
no se ejecutó.

## Criterios de aceptación

| Criterio | Cómo se verifica | Resultado |
|---|---|---|
| CA-1 Google simulado → sesión y menú por categorías | recorrido, paso K1; `flow.test.ts`, `auth.test.ts` | pendiente |
| CA-2 carrito: agregar, cambiar, quitar; total = servidor | recorrido, paso K2; `validation.test.ts` (precios desde la base) | pendiente |
| CA-3 pedido `pendiente_pago`, QR con importe, pago → `pagado` | recorrido, paso K3; `flow.test.ts` | pendiente |
| CA-4 pagado aparece en cocina en ≤ 3 s; sin pagar o cancelado nunca | recorrido, pasos K3–C1 (cronometrado a ojo); `permissions.test.ts`, `transitions.test.ts` | pendiente |
| CA-5 «Listo» → aviso en el kiosco en ≤ 3 s | recorrido, paso C2 | pendiente |
| CA-6 «Terminar» → `entregado`, cierra sesión, vuelve a la bienvenida | recorrido, paso K4; `flow.test.ts` | pendiente |
| CA-7 `/personal` precargada con cocina; un toque cambia a admin; cada rol a su pantalla | recorrido, pasos C0 y A0 | pendiente |
| CA-8 sin sesión u otro rol: `/cocina` y `/admin` redirigen; API 401/403 | recorrido, pasos N1–N3; `permissions.test.ts`, `http.test.ts` | pendiente |
| CA-9 pedido ajeno 403; cliente no marca listo | `permissions.test.ts` | pendiente |
| CA-10 items inválidos → 400; precios del cliente ignorados | `validation.test.ts` | pendiente |
| CA-11 transiciones inválidas → 409 | `transitions.test.ts` | pendiente |
| CA-12 `npm run seed` ×2 sin duplicados | `seed.test.ts`; verificación desde estado limpio | pendiente |
| CA-13 `npm test` pasa y cubre recorrido y CA-8 a CA-11 | `npm test` | pendiente |
| CA-14 verde de marca, fondo blanco, toques grandes, íconos propios | revisión de diseño de todas las pantallas | pendiente |
| CA-15 admin da de alta, edita, da de baja y asigna rol; datos inválidos rechazados | recorrido, paso A2; pruebas de usuarios (tarea 2, en curso) | pendiente |
| CA-16 usuario dado de baja no entra y su sesión previa deja de funcionar | recorrido, paso A3; pruebas de usuarios (tarea 2, en curso) | pendiente |
| CA-17 admin gestiona categorías y productos con validación; se ve en el kiosco | recorrido, paso A1; pruebas de catálogo (tarea 2, en curso) | pendiente |
| CA-18 producto no disponible no se puede pedir (ni por «de siempre») | recorrido, pasos A1 y K6; `validation.test.ts` y pruebas nuevas (tarea 2, en curso) | pendiente |
| CA-19 «Pedí lo de siempre» solo con pedido anterior propio; repite y va al pago | recorrido, pasos K5 y K7 | pendiente |
| CA-20 «Pedí lo de siempre» nunca usa pedidos de otro cliente | pruebas de `getLastOrder` (tarea 2, en curso) | pendiente |
| CA-21 solo admin accede a la gestión: 403 en la API y redirección en páginas | recorrido, pasos N2–N3; pruebas de permisos de admin (tarea 2, en curso) | pendiente |
| CA-22 semilla completa repetible sin duplicar ni pisar | `seed.test.ts` (ampliado, tarea 2, en curso); verificación desde estado limpio | pendiente |
| CA-23 `npm test` amplía con CA-15 a CA-21 y pasa | `npm test` | pendiente |
| CA-24 instalación y ejecución desde estado limpio | [Verificación desde estado limpio](#verificación-desde-estado-limpio) | pendiente |

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
| pruebas de administración de usuarios | (tarea 2, en curso) CA-15, CA-16, CA-21 |
| pruebas de administración del catálogo | (tarea 2, en curso) CA-17, CA-18, CA-21 |
| pruebas de «Pedí lo de siempre» | (tarea 2, en curso) CA-18, CA-19, CA-20 |

El tiempo real (polling) no tiene pruebas automáticas: se comprueba en el recorrido.

Resultado de la última ejecución: pendiente.

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

Resultado: pendiente.

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
