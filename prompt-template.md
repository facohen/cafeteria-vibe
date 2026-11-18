# Preparación de la especificación

Convertí idea.md (la descripción del producto) en dos specs
encadenados, spec-1.md y spec-2.md, usando el template de abajo. En este
paso no construyas la aplicación. Cada spec se corre en una sesión
nueva, que recibe el estado por el repositorio (README.md, CLAUDE.md,
docs/TECNICO.md y un commit) y no por el historial: así se gastan menos
tiempo y tokens, y si algo falla se repite solo esa tarea.

**Pasos**

1. Leé idea.md. Consultá las ambigüedades que impidan definir el
   producto; no conviertas decisiones esenciales en supuestos.
2. Completá Idea y Restricciones sin agregar funcionalidades ni
   restricciones, y marcá como SUPUESTO las interpretaciones menores.
   Dejá abiertas las decisiones técnicas no indicadas.
3. Repartí las funcionalidades de la Idea entre las dos tareas, según la
   división de abajo.
4. Escribí cada spec: {{TAREA}} como "Tarea N de 2: nombre" y
   {{ALCANCE}} con lo que incluye y lo que no, nombrando funcionalidades
   concretas. Todo lo demás es idéntico en los dos archivos.
5. Eliminá este encabezado. Los specs se revisan antes de pedir su
   implementación.

**División**

- Tarea 1 · Núcleo básico y probado. Etapas 1 a 3 del marco para el
  producto completo, con los contratos de lo que queda para la tarea 2.
  El flujo principal integrado de punta a punta, con lo que requiera
  (persistencia, permisos, validaciones del lado confiable) y datos
  mínimos de arranque. Pruebas básicas de un solo comando: el flujo
  principal y los casos que no deben poder hacerse que apliquen (acceso
  sin autorización, datos ajenos, entradas o transiciones inválidas).
  Documentación mínima para pasar el estado. Termina con un commit.
- Tarea 2 · Funcionalidad, pruebas y documentación. Empieza leyendo
  README.md, CLAUDE.md y docs/TECNICO.md, sin releer todo el código ni
  rehacer el plan. Lanza en paralelo un agente por módulo restante, uno
  de datos de ejemplo completos y repetibles si el producto los usa, uno
  de pruebas (amplía el mismo comando) y uno de documentación (incluye
  docs/VALIDACION.md). Integra, hace la etapa 5 completa, verifica desde
  un estado limpio, hace el commit y el informe de cierre.

Va a la tarea 1 lo que todo lo demás necesita y no se puede
paralelizar; a la tarea 2, los módulos que se apoyan en contratos ya
fijados. En cada tarea, las revisiones y verificaciones cubren lo
construido en ella; lo que el alcance asigna a la otra tarea no se hace.
Los cambios a lo existente se justifican y documentan.

---

# Construí esta aplicación — {{TAREA}}

## Idea
{{IDEA}}

## Restricciones
{{RESTRICCIONES}}

## Alcance de esta tarea
{{ALCANCE}}

## Marco SDLC
El marco no se negocia: cada etapa tiene que quedar cumplida. Dentro de
él, el cómo es tuyo. Desarrollá de manera iterativa; podés solapar y
repetir etapas sin omitir sus resultados.

1. Planificación: comprobá entorno, dependencias y riesgos. Definí un
   plan breve e identificá las tareas que pueden avanzar en paralelo.
2. Requisitos: identificá usuarios, alcance, reglas críticas y criterios
   de aceptación verificables. Explicitá los supuestos.
3. Diseño: elegí arquitectura, datos e interfaces, y justificá las
   decisiones principales. Partes con límites claros y contratos
   compartidos mínimos, escritos en el repositorio. Seguridad: entradas
   y permisos validados del lado confiable, con el mínimo acceso y sin
   exponer secretos ni datos sensibles.
4. Implementación: el recorrido principal completo, con persistencia
   cuando corresponda, es lo primero integrado y funcionando; el resto
   avanza al mismo tiempo. Incrementos versionados que funcionen,
   preservando el trabajo existente.
5. Verificación y validación: probá funcionalidad, permisos, errores y
   regresiones usando la aplicación; compilar no alcanza. Probá también
   lo que no debería poder hacerse. Corregí los problemas y contrastá
   el resultado con los criterios de aceptación. Dejalo listo para que
   el usuario lo pruebe y acepte.

## Agentes y paralelismo
La prioridad es reducir el tiempo total hasta una entrega verificada:
ante dos caminos válidos, el más rápido. Usá agentes para las tareas
independientes en paralelo y para revisar lo construido; trabajá en
serie solo por una dependencia real. Creá los agentes y las skills que
hagan falta y elegí su cantidad y responsabilidades.

- Lanzá juntas las tareas independientes y no esperes a ninguna. Cada
  encargo es autosuficiente: objetivo, límites, contratos y
  comprobaciones.
- Cada agente construye y prueba su parte sin tocar la de otro.
- Todo lo construido se verifica y se revisa, por agentes distintos de
  los que lo construyeron.
- Coordiná dependencias y cambios compartidos, integrá con frecuencia y
  respondé por el funcionamiento del conjunto.

Si el entorno no permite agentes, informalo y continuá sin simularlos.

## Documentación
Mantené un conjunto breve, suficiente y actualizado:

- README.md: propósito, funcionalidades, requisitos, instalación,
  configuración, ejecución, usuarios de prueba si los hay y comandos de
  verificación. Incluí simulaciones y limitaciones.
- docs/TECNICO.md: arquitectura, modelo de datos, contratos principales,
  decisiones y controles de seguridad.
- docs/VALIDACION.md: criterios de aceptación, pruebas realizadas,
  resultados, recorrido de demostración y pendientes.
- CLAUDE.md: comandos, convenciones, coordinación entre agentes,
  verificaciones y referencias a los documentos anteriores. Indicá que
  cada cambio debe actualizar la documentación afectada.

Usá spec-1.md y spec-2.md como referencia de requisitos. Evitá
duplicaciones y preservá las instrucciones existentes que sigan siendo válidas.

## Autonomía y consultas
Decidí herramientas, arquitectura y organización dentro de las
restricciones; quien decide responde por lo que hizo y lo deja
comprobado. Priorizá lo simple, funcional y fácil de modificar.

Resolvé por tu cuenta lo que puedas decidir con la información
disponible, sin ampliar el alcance. Explicitá los supuestos relevantes.

Cuando falte información que no puedas inferir responsablemente, haya
requisitos contradictorios o necesites una decisión o acceso del
usuario, preguntá de forma concreta. Agrupá las consultas y proponé una
opción cuando sea posible. No inventes la respuesta ni avances en lo
que dependa de ella; continuá mientras tanto con lo independiente.

## Cierre
Avanzá hasta una entrega comprobada: la aplicación funcionando, las
instrucciones de instalación y ejecución verificadas desde un estado
limpio, y la configuración inicial repetible sin perder ni duplicar
datos.

Corregí los problemas y repetí las comprobaciones afectadas sin
debilitar las pruebas ni los criterios de aceptación para ocultar
fallos.

Informá qué implementaste, simulaste, verificaste y qué queda
pendiente. No declares verificado lo que no ejecutaste.
