# Vibe Coffee — Validación

Criterios de aceptación, pruebas realizadas, resultados y recorrido de demostración. El texto
completo de cada criterio está en [docs/TECNICO.md](TECNICO.md#criterios-de-aceptación); uso e
instalación en [README.md](../README.md).

Resultados del 2026-11-18 (commit de cierre de la tarea 2). «ok» = ejecutado y correcto; cuando
algo se comprobó solo por pruebas automáticas o por HTTP, y no en el navegador, se indica.

## Criterios de aceptación

| CA | Resumen | Cómo se verifica | Resultado |
|---|---|---|---|
| CA-1 | Cliente entra con Google simulado y ve el menú por categorías | app (kiosco) + `tests/` | ok: navegador (Sofía, Valentina) + pruebas |
| CA-2 | Carrito: agregar, cambiar cantidad, quitar; total igual al del servidor | app + `npm test` | ok: pruebas (total del servidor); en el navegador se agregó y se vio el total, quitar/cambiar cantidad solo por pruebas en esta tarea |
| CA-3 | Confirmar → `pendiente_pago`, QR con importe, «Simular pago aprobado» → `pagado` | app + `npm test` | ok: navegador (QR $ 5.800 → pagado) + pruebas |
| CA-4 | Pedido `pagado` en `/cocina` en ≤ 3 s; `pendiente_pago`/`cancelado` nunca | app (dos ventanas) + `npm test` (filtro) | ok: navegador, apareció en cocina en ≤ 3 s con aviso «nuevo» |
| CA-5 | «Marcar listo» → `listo` y aviso en el kiosco en ≤ 3 s | app (dos ventanas) | ok: navegador, aviso «¡Tu pedido está listo!» en ≤ 3 s |
| CA-6 | «Terminar» → `entregado`, cierra sesión, vuelve a la bienvenida | app + `npm test` | ok: navegador, «Ya lo retiré · Terminar» → bienvenida |
| CA-7 | `/personal` precargada con cocina, un toque a admin; cada rol a su pantalla | app | ok: navegador (cocina precargada, un toque a admin) |
| CA-8 | Sin sesión u otro rol: `/cocina` y `/admin` redirigen; API 401/403 | app + `npm test` (HTTP) | ok: HTTP (cliente en `/cocina` y `/admin/*`, cocina en `/admin/*` → 307 `/personal`) + pruebas |
| CA-9 | Cliente no opera pedidos ajenos ni marca listos (403) | `npm test` | ok: pruebas + HTTP (pedido ajeno → 403) |
| CA-10 | Pedido inválido → 400; precios del cliente ignorados | `npm test` | ok: pruebas + HTTP (producto no disponible → 400) |
| CA-11 | Transiciones inválidas → 409 | `npm test` | ok: pruebas |
| CA-12 | `npm run seed` dos veces sin duplicados | `npm test` + seed doble y conteo | ok: `npm run seed` ×2 en clon limpio: 8/5/30/9 ambas veces |
| CA-13 | `npm test` cubre recorrido principal y CA-8 a CA-11 | `npm test` | ok: 318/318 |
| CA-14 | Verde de marca, fondo blanco, toques grandes, íconos propios | revisión de diseño | ok: revisión en navegador (ver «Diseño») |
| CA-15 | Admin: alta, edición, baja y rol de usuarios; datos inválidos rechazados | app (`/admin/usuarios`) + `npm test` | ok: navegador (alta de cocina; email mal formado rechazado; baja y «Reactivar» visibles) + HTTP del agente de usuarios (cambio de rol, reactivación) + pruebas |
| CA-16 | Usuario dado de baja no entra y su sesión previa deja de funcionar | app + `npm test` | ok: navegador (sesión abierta de Sofía → «Tu sesión se cerró»; ya no aparece para entrar) + HTTP (`/api/auth/google` → 401) + pruebas |
| CA-17 | Admin gestiona categorías y productos con validación; se ve en el kiosco | app (`/admin/catalogo` → kiosco) + `npm test` | ok: navegador (precio Latte 3.400 → 3.600 visto en el kiosco; precio 0 rechazado; disponibilidad de un toque) + pruebas; borrar categoría con productos → 409 por pruebas y HTTP |
| CA-18 | Producto no disponible no se puede pedir (tampoco con «Pedí lo de siempre») | app + `npm test` | ok: navegador (Medialuna no disponible → «de siempre» avisa y deja armar a mano; Carrot cake deshabilitado) + HTTP + pruebas |
| CA-19 | «Pedí lo de siempre» solo con pedido anterior propio; repite y va al pago | app (cliente con y sin pedidos) + `npm test` | ok: navegador (Sofía la ve y va directo al QR; Valentina no) + pruebas |
| CA-20 | «Pedí lo de siempre» nunca usa pedidos de otro cliente | `npm test` | ok: pruebas (`tests/last-order.test.ts`) |
| CA-21 | Solo admin gestiona: API cocina 403, cliente 401 (sin cookie del personal); páginas redirigen | app + `npm test` (HTTP) | ok: HTTP (cocina 403, cliente 401, sin sesión 401; páginas 307) + pruebas |
| CA-22 | Semilla completa repetible sin duplicar ni pisar | seed doble + conteo; editar en admin y volver a sembrar | ok: pruebas (`tests/seed.test.ts`, `tests/seed-version.test.ts`) + clon limpio. Se encontró y corrigió que la semilla recreaba cuentas de demo renombradas y categorías borradas |
| CA-23 | `npm test` amplía con CA-15 a CA-21 y pasa | `npm test` | ok: 12 archivos, 318 pruebas |
| CA-24 | Instalación y ejecución desde estado limpio | ver «Instalación desde estado limpio» | ok: ver abajo |

## Pruebas realizadas

### Automáticas

| Prueba | Comando | Resultado |
|---|---|---|
| Pruebas de servicios y HTTP (Vitest, base `:memory:`) | `npm test` | ok: 12 archivos, 318 pruebas (repo y clon limpio) |
| Tipos | `npm run typecheck` | ok, sin errores |
| Build de producción | `npm run build` | ok (Next 16, compilado sin errores) |

El tiempo real (polling) no tiene pruebas automáticas, por la spec: se verifica en la app.

### En la app

| Recorrido | Qué se comprueba | Resultado |
|---|---|---|
| Cliente | Google simulado → menú → carrito → QR → pago → aviso de listo → «Terminar» | ok (navegador, kiosco 820 px + cocina en otra pestaña) |
| Cliente: «Pedí lo de siempre» | aparece solo con pedido anterior; repite productos con precios actuales y va al QR; no aparece para el cliente sin pedidos | ok (Sofía $ 5.800; con Latte a $ 3.600, $ 6.000; Valentina sin tarjeta) |
| Cocina | el pedido pagado aparece solo (≤ 3 s), «Marcar listo» → aviso en el kiosco | ok |
| Admin: catálogo | alta/edición de categoría y producto; cambio de precio y de disponibilidad visible en el kiosco; borrar categoría con productos se rechaza | ok en navegador: precio y disponibilidad (visto en el kiosco), validación de precio; alta/borrado de categoría y 409: HTTP y pruebas |
| Admin: usuarios | alta de cliente y de personal (contraseña de demo), cambio de rol, baja y reactivación; datos inválidos rechazados | ok en navegador: alta de cocina sin contraseña, email inválido rechazado, baja con confirmación; cambio de rol y reactivación: HTTP y pruebas |
| No debería poder hacerse | cliente o cocina en `/admin` → `/personal`; cliente en `/cocina` → `/personal`; API admin con cookie de kiosco → 401; usuario dado de baja no entra y su sesión abierta deja de funcionar; producto no disponible no se pide (tampoco por «de siempre»); admin no puede darse de baja ni quitarse el rol | ok (navegador + HTTP + pruebas) |
| Diseño | kiosco, cocina y administración contra las restricciones (blanco, verde claro, toques grandes, íconos propios) | ok tras dos arreglos: en una columna la lista de categorías de `/admin/catalogo` era sticky y tapaba la primera fila de productos; la tabla de usuarios cortaba emails a mitad de palabra |

### Instalación desde estado limpio

Clon limpio (o `git clean -xdf` en una copia) → `npm install` → `npm run seed` (dos veces) →
`npm run build && npm start` → recorrido de demostración.

| Paso | Resultado |
|---|---|
| `npm install` | ok (npm avisa que no corre el script de `better-sqlite3`; no hace falta: el paquete trae binarios precompilados en `prebuilds/`) |
| `npm run seed` ×2 sin duplicados | ok: 8 usuarios, 5 categorías, 30 productos, 9 pedidos ambas veces; tras un pedido real, 10 (sin pedidos de ejemplo nuevos) |
| `npm run build && npm start` | ok (`next start`, `GET /` 200) |
| Recorrido de demostración completo | ok por HTTP en el clon (login, «de siempre», pago, cocina, listo, admin); en el navegador, sobre el repo con `npm run dev` |

## Recorrido de demostración

Para quien acepta. Con la app corriendo (`npm run dev` o `npm start`) en http://localhost:3000;
cuentas en el [README](../README.md#usuarios-de-prueba).

1. **Cocina** (ventana A): abrí `/personal`, viene precargada la cuenta de cocina → «Entrar» → `/cocina`.
2. **Kiosco** (ventana B, otra pestaña sirve): abrí `/` → «Tocá para pedir» → Sofía Martínez
   (su «de siempre» es Latte + 2 Medialunas).
3. Tocá **«Pedí lo de siempre»**: va directo al QR con el importe → «Simular pago aprobado».
4. En A, el pedido aparece solo en unos 2 s → «Marcar listo».
5. En B aparece «¡Tu pedido está listo!» → «Terminar»: vuelve a la bienvenida.
6. En B entrá con Valentina López (sin pedidos): no ve «Pedí lo de siempre». Armá un pedido a mano
   con productos de varias categorías, cambiá cantidades, quitá uno y pagá; el Carrot cake (no
   disponible) no se puede agregar. Cocina lo marca listo y terminás.
7. En A: «Salir» → en `/personal` tocá la cuenta de administración → `/admin/catalogo`.
8. Cambiá el precio de un producto y marcá otro como no disponible.
9. En B entrá con un cliente: el precio nuevo se ve y el producto no disponible no se puede agregar.
   Si estaba en su «de siempre», el kiosco avisa y deja armar el pedido a mano.
10. En A: `/admin/usuarios` → dá de alta un usuario de cocina (sin contraseña: queda `cafe1234`) y
    dá de baja a un cliente. En B, ese cliente ya no aparece para entrar.
11. Lo que no debe poder hacerse: con la sesión de cocina, `/admin` redirige a `/personal`; en
    `/admin/usuarios`, el admin no puede darse de baja a sí mismo; borrar una categoría con
    productos se rechaza.

## Pendientes

- Un pedido `listo` que el cliente no termina queda así; cocina no tiene acción para entregarlo.
- Los cambios de catálogo se ven al entrar el siguiente cliente, no en un menú ya abierto.
- El personal dado de alta sin contraseña recibe la de demo y aparece en `/personal` con ella precargada (decisión de demo, ver docs/TECNICO.md §Seguridad).
- La administración está pensada para pantalla de escritorio; en anchos menores a ~800 px la tabla de usuarios se desplaza horizontalmente.
- Sin pruebas automáticas del tiempo real (por la spec): verificado a mano en el navegador.
