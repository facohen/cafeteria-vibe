# Vibe Coffee

App take away de cafetería para una demo en vivo: un **kiosco táctil vertical** donde el cliente
entra con Google (simulado), arma su pedido y paga con QR (simulado), y una **pantalla de cocina**
que recibe los pedidos en tiempo real y los marca listos. Todo corre en local con Next.js y SQLite.

Estado: **tarea 1 de 2** (recorrido principal). Diseño y contratos en
[docs/TECNICO.md](docs/TECNICO.md); guía para trabajar en el repo en [CLAUDE.md](CLAUDE.md).

## Funcionalidades

- Kiosco (`/`): bienvenida → elegir cuenta de Google simulado → menú por categorías con carrito →
  QR con el importe → estado del pedido con aviso «¡Tu pedido está listo!» → «Terminar».
- Entrada del personal (`/personal`): una sola entrada, precargada con la cuenta de cocina; un
  toque cambia a la de administración. El rol decide a dónde se entra.
- Cocina (`/cocina`): pedidos pagados en tiempo real, del más viejo al más nuevo, con botón «Marcar listo».
- Administración (`/admin`): pantalla mínima; la gestión llega en la tarea 2.
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
| Cliente | `sofia@gmail.com` (Sofía Martínez) | en `/`, «Tocá para pedir» → «Continuar con Google · simulado» y elegir la cuenta (sin contraseña) |
| Cocina | `cocina@vibecoffee.local` | en `/personal`, contraseña de demo `cafe1234` (ya precargada) |
| Administración | `admin@vibecoffee.local` | en `/personal`, contraseña de demo `cafe1234` |

## Recorrido de demo (dos ventanas)

1. Ventana A: abrí http://localhost:3000/personal y entrá con la cuenta de cocina → `/cocina`.
2. Ventana B (otra pestaña del mismo navegador sirve): abrí el kiosco en http://localhost:3000.
   Kiosco y personal usan cookies de sesión distintas (`vc_session` y `vc_staff_session`), así que
   conviven en el mismo navegador sin pisarse. Si abrís la app desde otro host en `npm run dev`
   (p. ej. la IP de red), agregalo a `allowedDevOrigins` en `next.config.ts` y reiniciá el servidor.
3. En B: «Tocá para pedir» → Sofía → agregá productos de varias categorías → confirmá.
4. En B: aparece el QR con el importe → «Simular pago aprobado».
5. En A: el pedido aparece solo, en unos 2 s. Tocá «Marcar listo».
6. En B: aparece el aviso «¡Tu pedido está listo!» → «Terminar»; el kiosco vuelve a la bienvenida.

## Verificación

```bash
npm test           # Vitest: lógica del servidor (recorrido principal y lo que no debe poder hacerse)
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

- Tarea 1: no hay administración (usuarios, roles, catálogo, precios, disponibilidad) ni
  «Pedí lo de siempre»; el catálogo y los usuarios de demo son mínimos.
- Sin stock ni opciones de producto. Todo en local; no se usa el celular.
- Precios en pesos enteros; hasta 20 unidades por producto y 30 productos distintos por pedido.
