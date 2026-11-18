# Construí esta aplicación — Tarea 2 de 2: administración, «Pedí lo de siempre», datos de demo, pruebas y documentación

## Idea
Vibe Coffee es una app take away de cafetería, pensada para una demo en
vivo. Tiene tres roles: cliente, cocina y administración.

- Cliente: en un kiosco táctil vertical entra con Google, arma su pedido
  o lo repite en un toque («Pedí lo de siempre») y paga con QR. Después
  ve en pantalla el aviso de que su pedido está listo.
- Personal: cocina y administración comparten una entrada única, con la
  cuenta de demo precargada; el rol lleva a cocina o a administración.
- Cocina: recibe los pedidos en tiempo real y los marca listos.
- Administración: gestiona usuarios, roles, categorías, productos,
  precios y disponibilidad.

Interpretaciones menores:

- SUPUESTO: el login con Google simulado consiste en elegir una de las
  cuentas de cliente de demo; crea una sesión real en la app, sin OAuth.
- SUPUESTO: el pago simulado muestra un QR con el importe del pedido y
  se aprueba desde la misma pantalla del kiosco, sin escanearlo. El
  pedido llega a cocina recién cuando está pagado.
- SUPUESTO: «Pedí lo de siempre» repite el último pedido del cliente y
  lo lleva directo al pago; se ofrece solo si tiene un pedido anterior.
- SUPUESTO: después de pagar, el kiosco muestra el pedido y su estado;
  ahí aparece el aviso cuando cocina lo marca listo, y el cliente
  termina para dejar el kiosco libre.
- SUPUESTO: hay una cuenta de demo por cada rol del personal; la entrada
  viene completada con una y permite elegir la otra en un toque.
- SUPUESTO: los roles son fijos (cliente, cocina y administración).
  Gestionar usuarios es darlos de alta, editarlos y darlos de baja;
  gestionar roles es asignar el de cada usuario.
- SUPUESTO: la disponibilidad es una marca por producto; un producto no
  disponible no se puede pedir.
- SUPUESTO: la interfaz va en español rioplatense, como «Pedí lo de
  siempre».

## Restricciones
- Next.js y SQLite, todo en local, con datos de demo.
- Login con Google y pago con QR simulados. No se usa el celular.
- Tiempo real con la solución más simple, sin pruebas automáticas de esa
  parte.
- Sin stock ni opciones de producto.
- Diseño: como los kioscos de autopedido de McDonald's, adaptado a café.
  Pocas pantallas y pocos toques, mucho blanco, verde claro como color
  de marca e íconos propios para las bebidas.
- Lo que no está definido acá lo decidís vos.

## Alcance de esta tarea
Empezá leyendo README.md, CLAUDE.md y docs/TECNICO.md, sin releer todo
el código ni rehacer el plan. Lo construido en la tarea 1 (recorrido
principal, entrada del personal, permisos y contratos) se conserva.

Incluye, con un agente por parte y todos lanzados en paralelo:

- Administración de usuarios y roles: alta, edición y baja de usuarios,
  y asignación de rol. Reemplaza la pantalla mínima que dejó la tarea 1.
- Administración del catálogo: categorías, productos, precios y
  disponibilidad. Los cambios se ven en el kiosco.
- «Pedí lo de siempre» en el kiosco.
- Datos de demo completos y repetibles: el catálogo completo de la
  cafetería con íconos propios para las bebidas, varios clientes de demo
  y pedidos anteriores para que «Pedí lo de siempre» funcione desde el
  primer uso. Cargarlos de nuevo no duplica ni pisa datos.
- Pruebas, que amplían el comando de la tarea 1 con lo nuevo: solo
  administración gestiona usuarios y catálogo; las altas y ediciones
  validan sus datos; un producto no disponible no se puede pedir; «Pedí
  lo de siempre» solo usa pedidos propios; un usuario dado de baja no
  puede entrar. Sin pruebas automáticas del tiempo real.
- Documentación: README.md, CLAUDE.md y docs/TECNICO.md actualizados, y
  docs/VALIDACION.md.

Después de integrar:

- Revisá el diseño de todas las pantallas (kiosco, cocina y
  administración) contra las Restricciones.
- Hacé la etapa 5 completa usando la app: el recorrido del cliente,
  cocina y administración, y lo que no debería poder hacerse.
- Verificá la instalación y la ejecución desde un estado limpio, hacé el
  commit y entregá el informe de cierre.

No incluye:

- Rehacer el recorrido principal, la entrada del personal ni los
  contratos de la tarea 1. Si algo de eso tiene que cambiar, justificalo
  y documentalo.

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
