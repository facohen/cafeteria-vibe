# Vibe Coffee — Validación

Criterios de aceptación, pruebas realizadas, resultados y recorrido de demostración. El texto
completo de cada criterio está en [docs/TECNICO.md](TECNICO.md#criterios-de-aceptación); uso e
instalación en [README.md](../README.md).

<!-- RESULTADOS: el coordinador completa la columna Resultado con lo ejecutado (fecha, ok / falla y
detalle). No marcar «ok» lo que no se ejecutó. -->

## Criterios de aceptación

| CA | Resumen | Cómo se verifica | Resultado |
|---|---|---|---|
| CA-1 | Cliente entra con Google simulado y ve el menú por categorías | app (kiosco) + `tests/` | pendiente |
| CA-2 | Carrito: agregar, cambiar cantidad, quitar; total igual al del servidor | app + `npm test` | pendiente |
| CA-3 | Confirmar → `pendiente_pago`, QR con importe, «Simular pago aprobado» → `pagado` | app + `npm test` | pendiente |
| CA-4 | Pedido `pagado` en `/cocina` en ≤ 3 s; `pendiente_pago`/`cancelado` nunca | app (dos ventanas) + `npm test` (filtro) | pendiente |
| CA-5 | «Marcar listo» → `listo` y aviso en el kiosco en ≤ 3 s | app (dos ventanas) | pendiente |
| CA-6 | «Terminar» → `entregado`, cierra sesión, vuelve a la bienvenida | app + `npm test` | pendiente |
| CA-7 | `/personal` precargada con cocina, un toque a admin; cada rol a su pantalla | app | pendiente |
| CA-8 | Sin sesión u otro rol: `/cocina` y `/admin` redirigen; API 401/403 | app + `npm test` (HTTP) | pendiente |
| CA-9 | Cliente no opera pedidos ajenos ni marca listos (403) | `npm test` | pendiente |
| CA-10 | Pedido inválido → 400; precios del cliente ignorados | `npm test` | pendiente |
| CA-11 | Transiciones inválidas → 409 | `npm test` | pendiente |
| CA-12 | `npm run seed` dos veces sin duplicados | `npm test` + seed doble y conteo | pendiente |
| CA-13 | `npm test` cubre recorrido principal y CA-8 a CA-11 | `npm test` | pendiente |
| CA-14 | Verde de marca, fondo blanco, toques grandes, íconos propios | revisión de diseño | pendiente |
| CA-15 | Admin: alta, edición, baja y rol de usuarios; datos inválidos rechazados | app (`/admin/usuarios`) + `npm test` | pendiente |
| CA-16 | Usuario dado de baja no entra y su sesión previa deja de funcionar | app + `npm test` | pendiente |
| CA-17 | Admin gestiona categorías y productos con validación; se ve en el kiosco | app (`/admin/catalogo` → kiosco) + `npm test` | pendiente |
| CA-18 | Producto no disponible no se puede pedir (tampoco con «Pedí lo de siempre») | app + `npm test` | pendiente |
| CA-19 | «Pedí lo de siempre» solo con pedido anterior propio; repite y va al pago | app (cliente con y sin pedidos) + `npm test` | pendiente |
| CA-20 | «Pedí lo de siempre» nunca usa pedidos de otro cliente | `npm test` | pendiente |
| CA-21 | Solo admin gestiona: API cocina 403, cliente 401 (sin cookie del personal); páginas redirigen | app + `npm test` (HTTP) | pendiente |
| CA-22 | Semilla completa repetible sin duplicar ni pisar | seed doble + conteo; editar en admin y volver a sembrar | pendiente |
| CA-23 | `npm test` amplía con CA-15 a CA-21 y pasa | `npm test` | pendiente |
| CA-24 | Instalación y ejecución desde estado limpio | ver «Instalación desde estado limpio» | pendiente |

## Pruebas realizadas

### Automáticas

| Prueba | Comando | Resultado |
|---|---|---|
| Pruebas de servicios y HTTP (Vitest, base `:memory:`) | `npm test` | pendiente |
| Tipos | `npm run typecheck` | pendiente |
| Build de producción | `npm run build` | pendiente |

El tiempo real (polling) no tiene pruebas automáticas, por la spec: se verifica en la app.

### En la app

| Recorrido | Qué se comprueba | Resultado |
|---|---|---|
| Cliente | Google simulado → menú → carrito → QR → pago → aviso de listo → «Terminar» | pendiente |
| Cliente: «Pedí lo de siempre» | aparece solo con pedido anterior; repite productos con precios actuales y va al QR; no aparece para el cliente sin pedidos | pendiente |
| Cocina | el pedido pagado aparece solo (≤ 3 s), «Marcar listo» → aviso en el kiosco | pendiente |
| Admin: catálogo | alta/edición de categoría y producto; cambio de precio y de disponibilidad visible en el kiosco; borrar categoría con productos se rechaza | pendiente |
| Admin: usuarios | alta de cliente y de personal (contraseña de demo), cambio de rol, baja y reactivación; datos inválidos rechazados | pendiente |
| No debería poder hacerse | cliente o cocina en `/admin` → `/personal`; cliente en `/cocina` → `/personal`; API admin con cookie de kiosco → 401; usuario dado de baja no entra y su sesión abierta deja de funcionar; producto no disponible no se pide (tampoco por «de siempre»); admin no puede darse de baja ni quitarse el rol | pendiente |
| Diseño | kiosco, cocina y administración contra las restricciones (blanco, verde claro, toques grandes, íconos propios) | pendiente |

### Instalación desde estado limpio

Clon limpio (o `git clean -xdf` en una copia) → `npm install` → `npm run seed` (dos veces) →
`npm run build && npm start` → recorrido de demostración.

| Paso | Resultado |
|---|---|
| `npm install` | pendiente |
| `npm run seed` ×2 sin duplicados | pendiente |
| `npm run build && npm start` | pendiente |
| Recorrido de demostración completo | pendiente |

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
- <!-- PENDIENTES: el coordinador agrega lo que quede abierto tras la verificación. -->
