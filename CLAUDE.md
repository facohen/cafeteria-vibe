# CLAUDE.md — Vibe Coffee

Guía para trabajar en este repo. Uso de la app: [README.md](README.md). Diseño, contratos y
seguridad: [docs/TECNICO.md](docs/TECNICO.md). Criterios de aceptación, pruebas
y resultados: [docs/VALIDACION.md](docs/VALIDACION.md). Requisitos: [spec-1.md](spec-1.md) (tarea 1) y [spec-2.md](spec-2.md) (tarea 2).

**Regla: cada cambio debe actualizar la documentación afectada** (README, CLAUDE.md, docs/TECNICO.md,
docs/VALIDACION.md) en el mismo commit.

## Comandos

```bash
npm install
npm run seed       # idempotente; crea data/vibe.db (la app también lo aplica al arrancar)
npm run dev        # http://localhost:3000
npm run build && npm start
npm test           # Vitest, servicios y capa HTTP
npm run typecheck
rm -f data/vibe.db* && npm run seed   # resetear datos
```

Requiere Node 24 (la semilla carga TypeScript nativo).

## Estructura

```
app/               páginas (App Router) y app/api/**/route.ts (Route Handlers)
  page.tsx         kiosco (/)
  personal/        entrada única del personal
  cocina/          tablero de cocina
  admin/           administración (solo rol admin)
    layout.tsx     barra superior y pestañas (AdminTabs.tsx); page.tsx redirige a /admin/catalogo
    admin.css      clases ad-* compartidas (catálogo suma adc-*, usuarios adu-*)
    catalogo/      categorías, productos, precios, íconos y disponibilidad
    usuarios/      alta, edición, rol y baja de usuarios
  globals.css      variables de diseño --vc-* y clases vc-*
components/        ui.tsx (componentes compartidos), icons.tsx (íconos propios por IconKey)
lib/contracts.ts   tipos, errores, límites y rutas HTTP (contrato compartido)
lib/db.ts          esquema SQLite, semilla idempotente, getDb()
lib/services/      servicios de dominio: auth.ts, catalog.ts, orders.ts (incluye getLastOrder),
                   users.ts y admin-catalog.ts (administración)
tests/             pruebas Vitest de los servicios y de la capa HTTP (http.test.ts); qué cubre
                   cada archivo en docs/VALIDACION.md
scripts/seed.mjs   npm run seed
data/              base SQLite (no versionada)
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
- Código de base de datos solo en el servidor (`better-sqlite3` es nativo).
- Pruebas con base `:memory:` (`openDb(":memory:")` + `setDbForTests`).

## Coordinación entre agentes

- Un agente por parte, con sus archivos propios; no se tocan archivos de otra parte.
- Los cambios de contrato (`lib/contracts.ts`, `lib/db.ts`, `components/ui.tsx`,
  `app/globals.css`, `app/admin/layout.tsx`, `app/admin/admin.css`, sección Contratos) los hace solo el coordinador, que avisa a las partes.
- Instancias de dev aisladas por agente, para no chocar en build, base ni puerto:
  ```bash
  NEXT_DIST_DIR=.next-kiosco VIBE_DB_PATH=data/kiosco.db npx next dev -p 3101
  ```
  Next agrega `.next-<x>/types/**` al `include` de `tsconfig.json` al arrancar con otro
  `NEXT_DIST_DIR`: no commitear esas líneas (dejar solo `.next/types` y `.next/dev/types`).
  Borrar la carpeta `.next-<x>` al terminar.
- Sesiones: una cookie por pantalla (`vc_session` kiosco, `vc_staff_session` personal; ver
  `lib/contracts.ts`). Toda ruta del personal (cocina y `/api/admin/**`) usa
  `handle(fn, "staff")`; las del kiosco, `handle(fn)`. Las cookies no distinguen puerto: dos agentes
  probando en el mismo navegador usan hosts distintos (`<agente>.localhost`) para no pisarse.
- Quien construye una parte no la revisa ni la verifica: lo hace otro agente.

## Antes de commit

1. `npm run typecheck` sin errores.
2. `npm test` en verde (sin debilitar pruebas para que pasen).
3. Recorrido en la app con dos ventanas (kiosco y cocina/admin; pasos en docs/VALIDACION.md),
   incluyendo algo que no debería poder hacerse (p. ej. entrar a `/cocina` o `/admin` como cliente).
4. Documentación afectada actualizada (y resultados en docs/VALIDACION.md si cambió lo verificado).
