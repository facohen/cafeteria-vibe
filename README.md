# Vibe Coffee

App take away de cafetería para una demo en vivo: un **kiosco táctil vertical** donde el cliente
entra con Google (simulado), arma su pedido o lo repite en un toque («Pedí lo de siempre») y paga
con QR (simulado); una **pantalla de cocina** que recibe los pedidos en tiempo real y los marca
listos; y una **administración** de usuarios, roles y catálogo. Todo corre en local con Next.js y SQLite.

Estado: **tarea 2 de 2 completa**. Diseño y contratos en [docs/TECNICO.md](docs/TECNICO.md);
criterios de aceptación y pruebas en [docs/VALIDACION.md](docs/VALIDACION.md); guía para trabajar
en el repo en [CLAUDE.md](CLAUDE.md).

## Funcionalidades

- Kiosco (`/`): bienvenida → elegir cuenta de Google simulado → menú por categorías con carrito →
  QR con el importe → estado del pedido con aviso «¡Tu pedido está listo!» → «Terminar».
- **«Pedí lo de siempre»**: si el cliente tiene un pedido anterior propio (pagado, listo o
  entregado), un toque lo repite con los precios actuales y va directo al pago. Si algún producto
  ya no está disponible, el kiosco lo avisa y deja armar el pedido a mano.
- Entrada del personal (`/personal`): una sola entrada, precargada con la cuenta de cocina; un
  toque cambia a la de administración. El rol decide a dónde se entra.
- Cocina (`/cocina`): pedidos pagados en tiempo real, del más viejo al más nuevo, con botón «Marcar listo».
- Administración (`/admin`):
  - **Catálogo** (`/admin/catalogo`): alta, edición y orden de categorías (se borran solo si están
    vacías); alta y edición de productos (nombre, descripción, precio, ícono, orden y
    **disponibilidad**). Los productos no se borran: se marcan no disponibles. Los cambios se ven
    en el kiosco al entrar el siguiente cliente.
  - **Usuarios y roles** (`/admin/usuarios`): alta, edición, baja (y reactivación) y asignación de
    rol. Un usuario dado de baja no puede entrar y su sesión abierta deja de funcionar.
- Permisos, importes y validaciones se controlan en el servidor.

## Requisitos

- **Node.js 24** (la semilla carga TypeScript nativo) y npm.
- Linux, macOS o Windows con lo necesario para el módulo nativo `better-sqlite3` (normalmente se
  descarga un binario precompilado; si no, hace falta un compilador de C++).

## Instalación

```bash
npm install
npm run seed      # crea data/vibe.db con los datos de demo (se puede repetir: no duplica ni pisa)
```

La semilla es opcional: la app la aplica sola al arrancar. Carga el catálogo completo, los
clientes de demo, el personal y pedidos anteriores (`entregado`) para que «Pedí lo de siempre»
funcione desde el primer uso. Volver a correrla no duplica nada ni pisa (ni resucita) lo editado o borrado en administración: se aplica una sola vez por versión.

## Configuración

No hace falta configurar nada. Variables opcionales:

| Variable | Para qué | Por defecto |
|---|---|---|
| `VIBE_DB_PATH` | ruta del archivo SQLite | `data/vibe.db` |
| `NEXT_DIST_DIR` | carpeta de build alternativa, para correr varias instancias en paralelo | `.next` |
| `VIBE_COOKIE_SECURE` | `1` para marcar la cookie de sesión `Secure` (solo si se sirve por HTTPS) | sin marcar: la demo es HTTP local |

## Ejecución

```bash
npm run dev                  # desarrollo: http://localhost:3000
npm run build && npm start   # producción local: http://localhost:3000
```

## Usuarios de prueba

Personal (entra en `/personal`; contraseña de demo `cafe1234`, ya precargada):

| Rol | Cuenta |
|---|---|
| Cocina | `cocina@vibecoffee.local` |
| Administración | `admin@vibecoffee.local` |

Clientes (en `/`, «Tocá para pedir» → «Continuar con Google · simulado» y elegir la cuenta, sin contraseña):

| Cliente | Cuenta | «Pedí lo de siempre» repite |
|---|---|---|
| Sofía Martínez | `sofia@gmail.com` | Latte + 2 Medialunas |
| Martín Gómez | `martin.gomez@gmail.com` | Americano + Tostadas con palta |
| Lucía Fernández | `lucia.fernandez@gmail.com` | Chai latte + Budín de limón |
| Julián Rossi | `julian.rossi@gmail.com` | Licuado de banana + Yogur con granola |
| Camila Díaz | `camila.diaz@gmail.com` | 2 Mocha + Torta de chocolate + Agua mineral |
| Valentina López | `valentina.lopez@gmail.com` | — (sin pedidos: no ve el botón) |

El catálogo de demo tiene 5 categorías y 30 productos; el Carrot cake viene **no disponible**
para mostrar que no se puede pedir.

El personal que se da de alta en administración sin contraseña recibe la de demo (`cafe1234`).

## Recorrido de demo (dos ventanas)

1. Ventana A: abrí http://localhost:3000/personal y entrá con la cuenta de cocina → `/cocina`.
2. Ventana B (otra pestaña del mismo navegador sirve): abrí el kiosco en http://localhost:3000.
   Kiosco y personal usan cookies de sesión distintas (`vc_session` y `vc_staff_session`), así que
   conviven en el mismo navegador sin pisarse. Si abrís la app desde otro host en `npm run dev`
   (p. ej. la IP de red), agregalo a `allowedDevOrigins` en `next.config.ts` y reiniciá el servidor.
3. En B: «Tocá para pedir» → Sofía → **«Pedí lo de siempre»**: va
   directo al QR con el importe → «Simular pago aprobado».
4. En A: el pedido aparece solo, en unos 2 s. Tocá «Marcar listo».
5. En B: aparece el aviso «¡Tu pedido está listo!» → «Terminar»; el kiosco vuelve a la bienvenida.
6. En B: Valentina (sin pedidos, no ve «Pedí lo de siempre») arma un pedido a
   mano con productos de varias categorías, paga y se repiten los pasos 4 y 5.
7. En A: «Salir» y entrá con la cuenta de administración → `/admin/catalogo`. Cambiá el precio de
   un producto y marcá otro como no disponible.
8. En B: entrá con un cliente: el producto muestra el precio nuevo y el no disponible no se puede
   agregar. Si el «de siempre» de ese cliente lo incluía, el kiosco avisa y deja armarlo a mano.
9. En A: `/admin/usuarios` → dá de baja a un cliente. En B, ese cliente ya no aparece en el
   Google simulado (y si tenía la sesión abierta, deja de funcionar).
10. Lo que no debe poder hacerse: con la sesión de cocina, abrir `/admin` redirige a `/personal`;
    sin sesión del personal, `/cocina` y `/admin` también.

## Verificación

```bash
npm test           # Vitest: servicios y capa HTTP (recorrido, permisos, validaciones, administración, «Pedí lo de siempre»)
npm run typecheck  # TypeScript sin emitir
```

El tiempo real no tiene pruebas automáticas: se comprueba con el recorrido de dos ventanas.
Criterios de aceptación y resultados: [docs/VALIDACION.md](docs/VALIDACION.md).

## Simulaciones

- **Login con Google**: se elige una cuenta de cliente de demo; crea una sesión real, sin OAuth.
- **Pago con QR**: el QR muestra el importe y no se escanea; «Simular pago aprobado» lo aprueba
  desde el mismo kiosco. Recién ahí el pedido llega a cocina.
- **Tiempo real**: polling cada 2 s (kiosco y cocina).

## Resetear los datos

```bash
rm -f data/vibe.db*   # borra la base (y sus archivos -wal/-shm)
npm run seed
```

## Limitaciones

- Sin stock ni opciones de producto. Todo en local; no se usa el celular.
- Roles fijos (cliente, cocina, administración). Los usuarios y productos no se borran: se dan de
  baja o se marcan no disponibles (los pedidos guardan su historial).
- Los cambios de catálogo se ven en el kiosco al entrar el siguiente cliente (no en un menú ya abierto).
- Un pedido `listo` que el cliente no termina queda así: cocina no tiene acción para entregarlo.
- Precios en pesos enteros; hasta 20 unidades por producto y 30 productos distintos por pedido.
