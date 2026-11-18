# Construí esta aplicación — Tarea 1 de 2: recorrido principal del pedido, básico y probado

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
Incluye:

- Etapas 1 a 3 del marco para el producto completo: plan, requisitos con
  criterios de aceptación y diseño de las dos tareas. Dejá escritos en
  el repositorio los contratos que va a usar la tarea 2: datos y
  permisos de usuarios, roles, categorías, productos, precios y
  disponibilidad; cómo se obtiene el último pedido de un cliente para
  «Pedí lo de siempre»; y las variables de diseño y los componentes de
  interfaz compartidos.
- El recorrido principal, integrado de punta a punta y guardado en
  SQLite: el cliente entra con Google simulado en el kiosco, arma el
  pedido por categorías con el carrito, paga con el QR simulado, cocina
  recibe el pedido en tiempo real y lo marca listo, y el cliente ve el
  aviso en pantalla y termina.
- La entrada única del personal, con la cuenta de demo precargada y el
  acceso según el rol. En esta tarea el rol de cocina llega a su
  pantalla; el de administración llega a una pantalla mínima que avisa
  que la gestión se construye en la tarea 2.
- Permisos y validaciones en el servidor: cada pantalla y operación
  verifica la sesión y el rol; el importe se calcula en el servidor con
  los precios guardados; un cliente solo ve sus pedidos; solo cocina
  marca pedidos como listos; un pedido sin pagar no llega a cocina ni se
  puede marcar listo.
- La base del diseño que usan todas las pantallas: kiosco vertical al
  estilo de los kioscos de autopedido, verde de marca, mucho blanco e
  íconos propios para las bebidas de los datos mínimos.
- Datos mínimos de arranque, que se puedan cargar de nuevo sin duplicar:
  una cuenta de demo por rol (cliente, cocina y administración) y un
  catálogo corto con sus categorías y precios.
- Pruebas básicas de un solo comando. Cubren el recorrido principal en
  la lógica del servidor (crear el pedido, pagarlo, marcarlo listo y
  leer su estado) y lo que no debe poder hacerse: operar sin sesión, con
  otro rol o sobre pedidos ajenos, pedir productos inexistentes o no
  disponibles, usar cantidades inválidas y hacer cambios de estado
  inválidos. La actualización en tiempo real de las pantallas se
  comprueba usando la app con dos ventanas, sin pruebas automáticas.
- Documentación mínima para pasar el estado: README.md, CLAUDE.md y
  docs/TECNICO.md, con lo construido, los contratos y lo que queda para
  la tarea 2.
- Un commit al terminar. Si no hay repositorio Git, crealo al empezar.

No incluye (es de la tarea 2 y acá no se hace):

- Las pantallas de administración: usuarios y roles, categorías,
  productos, precios y disponibilidad.
- «Pedí lo de siempre».
- El catálogo completo, los demás usuarios de demo y los pedidos
  anteriores de ejemplo.
- La revisión final del diseño en todas las pantallas.
- Las pruebas ampliadas, docs/VALIDACION.md, la verificación desde un
  estado limpio y el informe de cierre.

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
