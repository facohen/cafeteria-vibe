# Vibe Coffee

App take away de cafetería para una demo en vivo: un **kiosco táctil vertical** donde el cliente
entra con Google (simulado), arma su pedido o repite el último («Pedí lo de siempre») y paga con QR
(simulado); una **pantalla de cocina** que recibe los pedidos en tiempo real y los marca listos, y una
**administración** de usuarios, roles y catálogo. Todo corre en local con Next.js y SQLite.

Estado: **tarea 2 de 2 (completa)**. Diseño y contratos en [docs/TECNICO.md](docs/TECNICO.md);
criterios de aceptación y resultados en [docs/VALIDACION.md](docs/VALIDACION.md); guía para trabajar
en el repo en [CLAUDE.md](CLAUDE.md).

## Funcionalidades

- Kiosco (`/`): bienvenida → elegir cuenta de Google simulado → menú por categorías con carrito →
  QR con el importe → estado del pedido con aviso «¡Tu pedido está listo!» → «Terminar».
  Los productos no disponibles se ven deshabilitados.
- «Pedí lo de siempre»: si el cliente tiene un pedido anterior, un toque lo repite con los precios
  actuales y va directo al QR. Si algún producto ya no está disponible, avisa y deja armar el pedido.
- Entrada del personal (`/personal`): una sola entrada, precargada con la cuenta de cocina; un
  toque cambia a la de administración. El rol decide a dónde se entra.
- Cocina (`/cocina`): pedidos pagados en tiempo real, del más viejo al más nuevo, con botón «Marcar listo».
- Administración (`/admin`, pestañas):
  - `/admin/catalogo`: categorías y productos (nombre, descripción, precio, ícono, disponibilidad);
    los cambios se ven en el kiosco.
  - `/admin/usuarios`: alta, edición y baja de usuarios, y asignación de rol.
- Permisos, importes y validaciones se controlan en el servidor.

## Requisitos

- **Node.js 24** (la semilla carga TypeScript nativo) y npm.
- Linux, macOS o Windows con lo necesario para el módulo nativo `better-sqlite3` (normalmente se
  descarga un binario precompilado; si no, hace falta un compilador de C++).

## Instalación

```bash
npm install
npm run seed      # crea data/vibe.db con los datos de demo (se puede repetir: no duplica)
```

La semilla es opcional: la app la aplica sola al arrancar.

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

| Rol | Cuenta | Cómo entra |
|---|---|---|
| Cliente | `sofia@gmail.com`, `lucas@gmail.com`, `valentina@gmail.com`, `martin@gmail.com` (con pedidos anteriores) | en `/`, «Tocá para pedir» → «Continuar con Google · simulado» y elegir la cuenta (sin contraseña) |
| Cliente | `camila@gmail.com` (sin pedidos: no ve «Pedí lo de siempre») | igual que los anteriores |
| Cocina | `cocina@vibecoffee.local` | en `/personal`, contraseña de demo `cafe1234` (ya precargada) |
| Administración | `admin@vibecoffee.local` | en `/personal`, contraseña de demo `cafe1234` |

El personal que da de alta admin (cocina o admin) entra con la misma contraseña de demo `cafe1234`.

## Recorrido de demo (dos ventanas)

Pasos detallados, con lo que no debería poder hacerse, en [docs/VALIDACION.md](docs/VALIDACION.md).


1. Ventana A: abrí http://localhost:3000/personal y entrá con la cuenta de cocina → `/cocina`.
2. Ventana B (otra pestaña del mismo navegador sirve): abrí el kiosco en http://localhost:3000.
   Kiosco y personal usan cookies de sesión distintas (`vc_session` y `vc_staff_session`), así que
   conviven en el mismo navegador sin pisarse. Si abrís la app desde otro host en `npm run dev`
   (p. ej. la IP de red), agregalo a `allowedDevOrigins` en `next.config.ts` y reiniciá el servidor.
3. En B: «Tocá para pedir» → Sofía → agregá productos de varias categorías → confirmá.
4. En B: aparece el QR con el importe → «Simular pago aprobado».
5. En A: el pedido aparece solo, en unos 2 s. Tocá «Marcar listo».
6. En B: aparece el aviso «¡Tu pedido está listo!» → «Terminar»; el kiosco vuelve a la bienvenida.
7. En B: «Tocá para pedir» → Lucas → «Pedí lo de siempre» → va directo al QR con su último pedido.
   Con Camila el botón no aparece.
8. En A: «Salir» y entrá como admin → `/admin/catalogo`. Cambiá el precio de un producto y marcá otro
   como no disponible; en B, al volver al menú, se ve el precio nuevo y el otro deshabilitado.
9. En A: `/admin/usuarios` → dá de baja a un cliente (p. ej. Martín). En B ya no aparece entre las
   cuentas de Google simulado y no puede entrar.

## Verificación

```bash
npm test           # Vitest: lógica del servidor y capa HTTP (recorrido, permisos, administración, «de siempre»)
npm run typecheck  # TypeScript sin emitir
```

El tiempo real no tiene pruebas automáticas: se comprueba con el recorrido de dos ventanas.

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

- Los productos no se borran: se marcan no disponibles (los pedidos guardan su copia). Una
  categoría solo se borra si no tiene productos.
- Los usuarios no se borran: se dan de baja (y se pueden reactivar). Un admin no puede darse de baja
  ni quitarse el rol a sí mismo.
- La semilla no pisa lo editado, pero sí vuelve a crear lo que falte: si borrás una categoría de demo,
  `npm run seed` (o reiniciar la app) la recrea.
- Un pedido `listo` que el cliente no termina queda así; cocina no tiene acción para entregarlo.
- Sin stock ni opciones de producto. Todo en local; no se usa el celular.
- Precios en pesos enteros; hasta 20 unidades por producto y 30 productos distintos por pedido.
