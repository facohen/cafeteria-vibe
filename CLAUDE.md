# CLAUDE.md — Vibe Coffee

Guía para trabajar en este repo. Uso de la app: [README.md](README.md). Diseño, contratos y
seguridad: [docs/TECNICO.md](docs/TECNICO.md). Criterios de aceptación, pruebas realizadas y
recorrido de demostración: [docs/VALIDACION.md](docs/VALIDACION.md). Requisitos:
[spec-1.md](spec-1.md) (tarea 1) y [spec-2.md](spec-2.md) (tarea 2).

**Regla: cada cambio debe actualizar la documentación afectada** (README, CLAUDE.md, docs/TECNICO.md,
docs/VALIDACION.md) en el mismo commit.

## Comandos

```bash
npm install
npm run seed       # idempotente; crea data/vibe.db (la app también lo aplica al arrancar)
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # Vitest, lógica del servidor
npm run typecheck
rm -f data/vibe.db* && npm run seed   # resetear datos
```

Requiere Node 24 (la semilla carga TypeScript nativo).

## Estructura

```
app/               páginas (App Router) y app/api/**/route.ts (Route Handlers)
  page.tsx         kiosco (/), arma app/kiosco/
  kiosco/          pantallas del kiosco (bienvenida, cuentas, «Pedí lo de siempre», menú, pago, estado)
  personal/        entrada única del personal
  cocina/          tablero de cocina
  admin/           layout.tsx (barra, pestañas, rol admin), page.tsx (→ /admin/catalogo),
                   catalogo/ (categorías y productos), usuarios/ (usuarios y roles)
  api/admin/       users, catalog, categories, products (sesión del personal)
  globals.css      variables de diseño --vc-* y clases vc-*
components/        ui.tsx (componentes compartidos), icons.tsx (íconos propios por IconKey)
lib/contracts.ts   tipos, errores, límites y rutas HTTP (contrato compartido)
lib/db.ts          esquema SQLite, semilla idempotente, getDb()
lib/services/      servicios de dominio: auth.ts, catalog.ts, orders.ts (incluye getLastOrder),
                   users.ts y catalog-admin.ts (administración)
tests/             pruebas Vitest de los servicios y de la capa HTTP (http.test.ts)
scripts/seed.mjs   npm run seed
data/              base SQLite (no versionada)
docs/              TECNICO.md (diseño, contratos, seguridad), VALIDACION.md (aceptación y pruebas)
```

## Convenciones

- **Contratos**: viven en `lib/contracts.ts` y en la sección «Contratos» de docs/TECNICO.md.
  Cambiarlos es un cambio de contrato (ver coordinación).
- **Servicios**: síncronos, usan `getDb()`, reciben `actor: SessionUser | null` como primer
  argumento y fallan con `AppError(code, msg)`. Los Route Handlers solo resuelven la sesión,
  llaman al servicio y traducen errores con `ERROR_STATUS`; los demás errores → 500 sin detalle.
- **Permisos**: todo chequeo de sesión, rol, propiedad e importe se hace en el servidor (servicio
  + Server Component en páginas protegidas). Nunca confiar en la interfaz.
- **Interfaz**: en español rioplatense («Pedí», «Tocá»). Usar los componentes de
  `components/ui.tsx` y las variables de `app/globals.css`; no inventar colores ni tamaños.
  Íconos de productos en `components/icons.tsx` (`ProductIcon`).
- **Administración**: servicios con `requireRole(actor, "admin")`, cuerpos recibidos como `unknown`
  y validados con `ADMIN_LIMITS`; baja lógica de usuarios y sin borrado de productos (ver
  docs/TECNICO.md, «Decisiones de la tarea 2»).
- **Semilla**: se aplica una vez por `SEED_VERSION` (marca en la tabla `meta`) y con INSERT OR
  IGNORE por clave natural (email, slug); los pedidos de ejemplo van solo a clientes sin pedidos.
  Nunca pisar datos existentes. Si agregás datos a la semilla, subí `SEED_VERSION` (una base ya
  sembrada recibe solo lo que falta).
- Código de base de datos solo en el servidor (`better-sqlite3` es nativo).
- Pruebas con base `:memory:` (`openDb(":memory:")` + `setDbForTests`).

## Coordinación entre agentes

- Un agente por parte, con sus archivos propios; no se tocan archivos de otra parte.
- Los cambios de contrato (`lib/contracts.ts`, `lib/db.ts`, `components/ui.tsx`,
  `app/globals.css`, sección Contratos) los hace solo el coordinador, que avisa a las partes.
- Instancias de dev aisladas por agente, para no chocar en build, base ni puerto:
  ```bash
  NEXT_DIST_DIR=.next-kiosco VIBE_DB_PATH=data/kiosco.db npx next dev -p 3101
  ```
  Next agrega `.next-<x>/types/**` al `include` de `tsconfig.json` al arrancar con otro
  `NEXT_DIST_DIR`: no commitear esas líneas (dejar solo `.next/types` y `.next/dev/types`).
  Borrar la carpeta `.next-<x>` al terminar.
- Sesiones: una cookie por pantalla (`vc_session` kiosco, `vc_staff_session` personal; ver
  `lib/contracts.ts`). Toda ruta del personal (`/api/kitchen/**`, `/api/admin/**`) usa
  `handle(fn, "staff")`; las del kiosco, `handle(fn)`. Las cookies no distinguen puerto: dos agentes
  probando en el mismo navegador usan hosts distintos (`<agente>.localhost`) para no pisarse.
- Quien construye una parte no la revisa ni la verifica: lo hace otro agente.

## Antes de commit

1. `npm run typecheck` sin errores.
2. `npm test` en verde (sin debilitar pruebas para que pasen).
3. Recorrido en la app con dos ventanas (kiosco y cocina; ver README), incluyendo algo que no
   debería poder hacerse (p. ej. entrar a `/cocina` como cliente o a `/admin` como cocina).
4. Si se tocó administración o catálogo: recorrido de admin (cambiar precio/disponibilidad y verlo
   en el kiosco; dar de baja un usuario y comprobar que no entra).
5. Documentación afectada actualizada (incluye resultados en docs/VALIDACION.md si cambian).
