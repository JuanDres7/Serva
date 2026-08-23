# Registro de decisiones

Decisiones tomadas y por qué. Cuando algo se cuestione más adelante, la respuesta
está aquí. Formato: qué se decidió, cuándo, y la razón.

---

## D-001 · Usuario objetivo: persona natural (2026-08-22)

El MVP es para una persona que administra su propio dinero. El caso de negocio
queda declarado como evolución futura, no construido.

**Por qué:** persona y negocio son necesidades divergentes (presupuesto y ahorro
frente a flujo de caja, facturación e impuestos). Atender ambas desde el inicio
produce un producto que le sobra la mitad a una y le falta lo esencial a la otra.
Ver `docs/vision.md`.

## D-002 · La consulta conversacional es el diferenciador (2026-08-22)

El usuario pregunta en lenguaje natural en lugar de navegar reportes y filtros.

**Por qué:** el problema de las apps de finanzas no es almacenar datos, es que el
usuario no los alcanza sin saber qué pantalla abrir. La conversación elimina esa
barrera.

## D-003 · Registro Fácil es el flujo principal de captura (2026-08-22)

Pantalla dedicada a registrar movimientos con la mínima fricción posible, pensada
tanto para un registro suelto como para encadenar varios seguidos.

**Por qué:** si registrar cuesta, el historial queda incompleto y todo lo demás
—incluida la IA— pierde su valor. La velocidad de captura es condición de
supervivencia del producto.

## D-004 · La categoría la sugiere la IA, no la elige el usuario (2026-08-22)

El usuario escribe monto y una descripción corta ("almuerzo"). La IA preselecciona
la categoría. El desplegable permanece visible y editable, ya pre-llenado.

**Por qué:** dos razones. (1) Elegir en un desplegable es el paso más lento del
flujo y contradice el objetivo de registrar en segundos. (2) Si el usuario
categoriza a mano, la categorización automática se queda sin función y sin insumo
de entrenamiento. La descripción en texto libre es lo que alimenta al modelo.

**Consecuencia:** la descripción deja de ser un campo opcional y pasa a ser la
entrada principal junto al monto.

## D-005 · Tipo de movimiento: dos opciones visibles, no un botón que alterna (2026-08-22)

`[ Gasto ] [ Ingreso ]` con ambas siempre a la vista y *Gasto* preseleccionado.
Descartado el botón único que cambia de estado.

**Por qué:** un control que cambia de significado según su estado no deja claro si
muestra lo que es o lo que hará. En un registro financiero ese error invierte el
signo del monto y corrompe el saldo del período. El costo de interacción es el
mismo y la ambigüedad desaparece.

## D-006 · Fecha: hoy por defecto, con calendario opcional (2026-08-22)

El campo de fecha muestra "Hoy" ya seleccionado. Al tocarlo se abre un calendario
para elegir otro día. No se aceptan fechas futuras.

**Por qué:** la inmensa mayoría de los registros ocurren el mismo día del
movimiento, así que el caso frecuente no debe costar ni un toque. Pero la gente
también registra en bloque lo de días anteriores, y sin poder corregir la fecha
el historial quedaría desordenado y los totales por período serían falsos.

## D-007 · Escritorio primero, móvil como evolución (2026-08-22)

La primera versión se diseña para pantalla de computador. El móvil queda para una
versión posterior, pero la interfaz se construye adaptable desde el inicio.

**Por qué:** enfocar una sola pantalla acelera el aprendizaje y evita decidir dos
veces cada detalle. Se construye adaptable no por rendir el móvil hoy, sino porque
rehacer una interfaz pensada solo para escritorio cuesta mucho más que preverlo.

**Consecuencia:** la narrativa del producto cambia. El usuario ya no es "alguien
que registra con prisa desde el celular" sino alguien que se sienta a poner sus
movimientos al día. Refuerza el valor de encadenar registros (D-003) y baja la
urgencia del registro instantáneo en la calle.

## D-008 · Modelo de IA local en desarrollo, proveedor intercambiable (2026-08-22)

Durante el desarrollo se usa un modelo local gratuito. La aplicación no se acopla
a ningún proveedor: existe una única interfaz interna de IA con implementaciones
intercambiables (local o nube) mediante configuración, sin tocar el resto del código.

**Por qué:** permite desarrollar e iterar sin costo por llamada y mantiene los
datos financieros en la máquina, lo que refuerza el Artículo VI. Pero los modelos
locales pequeños son notablemente más débiles en salida estructurada y en uso de
herramientas, así que amarrarse a uno arriesga concluir que una funcionalidad "no
es viable" cuando el problema es el modelo, no el diseño.

**Consecuencia:** ninguna funcionalidad se recorta por limitaciones del modelo
local sin antes comprobarla contra un modelo de nube.

## D-009 · Chat como panel flotante, no como pantalla aparte (2026-08-22)

Botón de chat fijo abajo a la derecha que abre un panel conversacional sobre la
interfaz, sin sacar al usuario de lo que estaba viendo. Las respuestas pueden
incluir elementos visuales, no solo texto.

**Por qué:** si consultar obliga a cambiar de pantalla, la consulta compite con la
navegación en vez de reemplazarla, y se pierde el diferenciador del producto
(D-002). El panel mantiene el contexto visible mientras se pregunta.

## D-010 · Modo de trabajo: loop puro (2026-08-22)

El desarrollo corre en ciclos cerrados sin revisión intermedia. La verificación
automática decide si cada tarea quedó bien; el dueño del proyecto revisa al
cerrar cada feature, usándola.

**Por qué:** máxima velocidad de avance con 10 horas semanales disponibles.
Aprender React y TypeScript no es objetivo del proyecto.

**Consecuencia:** la revisión al cerrar cada feature es el único punto de control
humano. Si se omite, los errores de interpretación se acumulan sobre una base ya
construida y corregirlos cuesta mucho más.

## D-011 · Estrategia de modelos según hardware disponible (2026-08-22)

Máquina de desarrollo: Ryzen 7 5700G, gráficos integrados, 16 GB de RAM. Sin
tarjeta gráfica dedicada, la inferencia local corre en CPU.

Estrategia por funcionalidad:

- **Categorización:** primero coincidencia con el historial del propio usuario;
  solo lo desconocido llega al modelo. Modelo local pequeño (3–4 B, cuantizado).
- **Chat sobre datos:** se desarrolla contra modelo local, pero se evalúa contra
  modelo de nube antes de juzgar su viabilidad (D-008).

**Por qué:** con 16 GB compartidos entre sistema, base de datos, entorno de
desarrollo y modelo, lo viable en la práctica son modelos pequeños en CPU. Sirven
bien para clasificar texto corto, pero no para razonar sobre qué consulta hacer.
Resolver la categorización con el historial antes de invocar al modelo baja el
costo de cómputo casi a cero en el caso frecuente y mejora con el uso.

## D-012 · La descripción admite lenguaje natural, no solo etiquetas (2026-08-22)

El usuario puede escribir desde "almuerzo" hasta "fui a la tienda y me compré un
cartón de leche". La IA devuelve además una versión corta y legible que es la que
se muestra en el historial, conservando siempre el texto original.

**Por qué:** obligar a escribir etiquetas cortas traslada al usuario el trabajo de
normalizar, que es justo lo que la IA debe absorber. Pero un historial lleno de
frases largas se vuelve ilegible de un vistazo, así que la vista corta es
necesaria.

**Consecuencia:** invalida la coincidencia literal contra el historial como
mecanismo único (ver D-013), porque una frase natural nunca se repite igual.

## D-013 · Categorización en cascada de tres niveles (2026-08-22)

1. **Palabras clave.** Se extraen los términos con contenido de la descripción y
   se buscan entre los ya categorizados por el usuario.
2. **Similitud por significado.** Se compara la descripción contra las anteriores
   mediante representaciones vectoriales, para captar equivalencias sin palabras
   comunes.
3. **Modelo de lenguaje.** Solo cuando los dos anteriores no dan una coincidencia
   con confianza suficiente.

**Por qué:** el caso frecuente se resuelve sin invocar al modelo, lo que en una
máquina sin GPU dedicada es la diferencia entre respuesta instantánea y una espera
de segundos. Además, cada nivel mejora solo con el uso del propio usuario.

## D-014 · La personalización es del sistema, no del modelo (2026-08-22)

Finzen se adapta al usuario mediante memoria de correcciones, ejemplos propios
incluidos en la consulta al modelo y similitud contra su historial. **No** se hace
ajuste fino de pesos del modelo.

**Por qué:** el ajuste fino exige tarjeta gráfica dedicada, miles de ejemplos que
todavía no existen y un ciclo de reentrenamiento; para clasificar gastos da peor
resultado que las tres técnicas anteriores combinadas. Estas producen
personalización perceptible desde la primera semana de uso.

**Abierto a futuro:** entrenar un clasificador estadístico ligero con las
transacciones del propio usuario, ejecutable en CPU. Requiere historial acumulado,
por lo que no entra al MVP.

## D-015 · Se registra el historial de aprendizaje desde el primer día (2026-08-22)

Cada categorización guarda: texto original del usuario, categoría propuesta por el
sistema, nivel de confianza, mecanismo que la produjo (palabras clave, similitud o
modelo), categoría final tras corrección del usuario y momento de cada paso.

**Por qué:** es el insumo de toda personalización futura y de cualquier medición de
qué tan bien acierta el sistema. Si no se captura desde el inicio, es información
irrecuperable: no existe forma de reconstruir hacia atrás qué habría propuesto la
IA ni qué corrigió el usuario.

## D-016 · Dos caminos de registro: rápido y detallado (2026-08-22)

**Registro Fácil** para capturar en segundos, y una **vista de tabla** para
registrar y editar con todos los campos a la vista.

**Por qué:** el registro veloz es el que sostiene el hábito, pero hay momentos
—corregir varios movimientos, poner al día una semana entera, ajustar detalles—
donde una tabla es más eficiente que un flujo paso a paso.

**Consecuencia:** las reglas de validación y la lógica de categorización deben
vivir en un solo lugar compartido por ambos caminos. Duplicarlas garantiza que se
desincronicen y que un movimiento válido por un camino sea inválido por el otro.

## D-017 · Descripción opcional, pero con exigencia alterna (2026-08-22)

La descripción no es obligatoria. Si el usuario la deja vacía, la elección manual
de categoría pasa a ser obligatoria. Nunca se exige llenar ambas.

**Por qué:** sin descripción la IA no tiene insumo para categorizar, y un
movimiento sin categoría rompe todos los agregados por categoría. La regla
garantiza que siempre exista al menos una vía de clasificación sin imponer trabajo
doble.

**Consecuencia de diseño:** la descripción no se presenta como campo opcional en
la interfaz. Es la entrada principal junto al monto; anunciarla como prescindible
haría que se omita de forma habitual y degradaría el aprendizaje del sistema.

## D-018 · ~~Categorías propias además de las predeterminadas~~ REVERTIDA (2026-08-22)

> Revertida el mismo día por **D-021**. Se conserva por trazabilidad: si el tema
> vuelve a abrirse, aquí está lo que ya se había analizado (pistas al crear la
> categoría, regla de prioridad ante ambigüedad).

El sistema trae categorías predeterminadas y el usuario puede crear las suyas. La
IA debe categorizar contra el conjunto vigente, incluidas las recién creadas.

Al crear una categoría, el usuario puede añadir palabras o ejemplos asociados
("moto, casco, gasolina, taller"). Es opcional pero determina si la categoría
acierta desde el primer registro o solo después de varias correcciones.

**Regla de prioridad:** ante ambigüedad entre una categoría creada por el usuario
y una predeterminada, gana la del usuario. Quien se toma el trabajo de crear una
categoría lo hace para ver ese gasto separado.

**Por qué:** las categorías fijas obligan a que la vida del usuario quepa en una
lista ajena. Pero permitir crearlas implica que el conjunto de destino es dinámico
y que la lista vigente debe viajar en cada consulta al modelo.

## D-019 · El chat vive solo dentro de Finzen (2026-08-22)

El asistente se usa desde el panel de la aplicación. No se expone acceso externo
a los datos por ahora.

**Por qué:** exponer los datos hacia afuera duplica la superficie de seguridad y
resuelve un problema que todavía no existe. La capa de consultas se diseña
igualmente aislada, de modo que abrirla más adelante sea envolver lo que ya está
hecho y no reescribirlo.

## D-020 · La tabla de registro es el propio historial, editable (2026-08-22)

No hay una pantalla de tabla separada del historial: es la misma vista, donde el
usuario consulta, corrige y agrega movimientos directamente sobre las filas.

**Por qué:** dos vistas con los mismos datos obligan al usuario a aprender dónde
está cada cosa y garantizan que se desincronicen. Una sola tabla que sirve para
ver y para editar es menos código y menos confusión.

## D-021 · Categorías fijas en el MVP (2026-08-22)

El usuario no crea categorías. Se trabaja sobre un conjunto predeterminado y
cerrado. **Revierte D-018.**

**Por qué:** con un conjunto fijo la IA categoriza contra un blanco estable, se
puede medir objetivamente qué tan bien acierta y las correcciones del usuario se
acumulan sobre categorías que no cambian. Con categorías creadas por el usuario
todo eso se vuelve móvil: la precisión no es comparable entre usuarios ni en el
tiempo, y categorías solapadas degradan el resultado sin que el usuario entienda
por qué.

**Consecuencia:** el conjunto predeterminado debe ser bueno, porque no hay válvula
de escape. Requiere revisar la lista propuesta en la spec 001 (RN-005). También
obliga a vigilar cuánto termina cayendo en "Otros": si es mucho, la lista está
incompleta y hay que ampliarla en el propio producto.

## D-022 · Moneda única configurable, sin conversión (2026-08-22)

El usuario elige su país al empezar; eso determina la moneda, el formato de miles
y decimales y el formato de fecha. Toda la aplicación opera en esa única moneda.
No hay movimientos en monedas distintas ni conversión entre ellas.

**Por qué:** cubre lo que el usuario necesita —ver su dinero en su moneda, bien
formateado— sin abrir la puerta a tasas de cambio, valoración histórica y
conversiones, que es donde aparecen los errores contables más difíciles de
rastrear.

**Regla:** la moneda puede cambiarse mientras no existan movimientos registrados.
Después no, porque los montos ya guardados no se reinterpretan solos y cambiarla
falsearía todo el historial.

## D-023 · Configuración inicial mínima: nombre y país (2026-08-22)

Al primer inicio se piden únicamente el nombre y el país de residencia. Nada más.

**Por qué:** cada campo adicional en la primera pantalla reduce cuánta gente llega
a usar la aplicación, y no debe pedirse ningún dato que no se use de inmediato.
Con esos dos campos se resuelven el saludo, la moneda, el formato numérico y el de
fecha.

**Precisión:** se pregunta país de residencia, no nacionalidad. Determinan cosas
distintas y la moneda depende de dónde vive el usuario, no de dónde nació.

## D-024 · Saludo personalizado por plantillas, no generado por IA (2026-08-22)

La aplicación recibe al usuario por su nombre, con un mensaje que varía según la
hora, si registró recientemente y su actividad del mes. Los mensajes son un
conjunto escrito de antemano, no generados por el modelo.

**Por qué:** aparece en cada apertura, así que debe ser instantáneo y sin costo.
Generarlo con el modelo añadiría espera y el riesgo de una salida inapropiada
justo en lo primero que ve el usuario, a cambio de una variedad que nadie pide.

**Tono:** cálido y neutro. Nunca reprochar ni juzgar el gasto. Un mensaje
culpabilizante en una app de finanzas personales logra que el usuario deje de
abrirla, que es exactamente el fracaso del producto.

## D-025 · Los períodos se calculan por ciclo, desde la feature 001 (2026-08-22)

Todo cálculo de totales, filtros y comparaciones trabaja sobre un **ciclo
configurable**, no sobre el mes calendario. El mes calendario es simplemente el
ciclo por defecto.

Formas de ciclo admitidas:

| Tipo | Parámetros |
|---|---|
| Mes calendario | — (por defecto) |
| Mensual, día N | N = 1…31 |
| Dos veces al mes | días N y M |
| Semanal | día de la semana |
| Cada 14 días | fecha de referencia |

**Reglas de borde:**
- Si el día configurado no existe en el mes (30 en febrero), se usa el último día
  del mes.
- Los ciclos **no** se desplazan por fines de semana ni festivos. El período es
  una regla de calendario, no la fecha real en que entra el dinero. Desplazarlos
  produciría períodos solapados o con huecos.
- Cuando el ciclo no coincide con el mes, el período se identifica por su rango
  («15 ago – 14 sep»), no por el nombre de un mes.

**Por qué se decide ahora, aun cuando los presupuestos son posteriores:** la
feature 001 ya calcula totales por período. Construirla asumiendo mes calendario
obligaría después a rehacer todos los cálculos de totales, agregados y
comparaciones. Es de las pocas decisiones que cuesta mucho más añadir tarde.

**Por qué no interviene la IA:** el ciclo de pago es una configuración finita y
determinista, no una entrada ambigua. Un modelo aportaría incertidumbre justo en
la base de la que dependen todas las cifras que ve el usuario. Criterio general
del proyecto: **IA para lo ambiguo, código para lo determinista.**

**Detección asistida:** tras varios ingresos registrados, el sistema puede
proponer el ciclo detectado en las fechas («¿te pagan el 15 y el 30?»). Es
aritmética sobre fechas, no requiere modelo.

## D-026 · Presupuestos: feature posterior al MVP (2026-08-22)

Los presupuestos se construyen después del registro, la categorización y el chat
(feature 005).

**Por qué:** un presupuesto útil parte del historial real de gasto. Antes de tener
datos propios sería diseñar y probar a ciegas.

**Reglas de diseño:**

1. **Creación manual siempre disponible.** Quien ya sabe qué tope quiere, lo pone
   y listo. Las sugerencias no son un requisito para usar la funcionalidad.
2. **Sugerencia basada en el historial.** Cuando hay datos suficientes, Finzen
   propone un tope partiendo del promedio real del usuario («gastas $418.000 en
   Comidas fuera; ¿ponemos $350.000?»). Un presupuesto derivado del propio gasto
   es alcanzable; uno inventado se abandona en la segunda semana.
3. **Pocas categorías, y solo las influibles.** Se orienta a 3 o 4 categorías
   sobre las que el usuario puede actuar (Comidas fuera, Entretenimiento, Compras,
   Suscripciones). Presupuestar arriendo o servicios no cambia el comportamiento y
   convierte la función en trabajo administrativo.
4. **Avisar, nunca bloquear ni reprochar.** «Vas en $310.000 de $350.000, quedan 9
   días» en lugar de «excediste tu presupuesto». Coherente con D-024.

**Fuera de alcance:** método de sobres (asignar cada peso del ingreso), traspaso
de sobrante entre períodos y presupuestos semanales o diarios.

## D-027 · El ciclo de pago se pregunta al entrar a presupuestos (2026-08-22)

No se pregunta en la configuración inicial. Hasta que el usuario entre por primera
vez a presupuestos, la aplicación opera en mes calendario. En ese momento —y solo
entonces— se le ofrece configurar su ciclo real. La detección automática (D-025)
puede proponérselo antes, si sus ingresos registrados revelan un patrón.

**Por qué:** preguntar «¿cada cuánto te pagan?» en el primer arranque interpela a
alguien que todavía no sabe para qué sirve la respuesta; muchos elegirían
cualquier cosa por avanzar, y una configuración mal puesta desde el inicio es peor
que no tenerla. Al entrar a presupuestos la pregunta llega con contexto y el
usuario entiende qué está definiendo.

**Consecuencia:** el mes calendario debe funcionar correctamente como ciclo
completo por sí solo, no como un caso provisional a la espera de configuración.

## D-028 · Tercer tipo de movimiento: Ahorro (2026-08-22)

Un movimiento es **ingreso**, **gasto** o **ahorro**. El tipo ahorro descuenta del
dinero disponible igual que un gasto, pero queda excluido de todo análisis,
agregado y presupuesto de gasto. Se presenta siempre por separado.

**Por qué:** un aporte a una meta no es un gasto —el dinero no se consumió, cambió
de destino— pero tampoco es neutro, porque deja de estar disponible. Contarlo como
gasto inflaría los totales del período y llevaría a la IA a decir «gastaste mucho
este mes» justo cuando el usuario ahorró. Tratarlo como una categoría de gasto
marcada como excepción escondería esa excepción dentro del mecanismo general,
donde tarde o temprano alguien la pasa por alto y los números salen mal sin
explicación visible.

**Submovimientos:** un movimiento de ahorro es un **aporte** (sale del disponible,
entra a la meta) o un **retiro** (vuelve al disponible, sale de la meta).

**Regla contra la doble contabilidad:** cuando el usuario finalmente usa el dinero
ahorrado, la secuencia correcta es *retiro de la meta* y luego *gasto*. Registrar
directamente el gasto sin el retiro previo descontaría el mismo dinero dos veces:
una al aportarlo y otra al gastarlo.

**Alcance en la feature 001:** el modelo de datos y el cálculo de saldo contemplan
los tres tipos desde el inicio, pero la interfaz de registro solo ofrece ingreso y
gasto hasta que existan las metas (feature 006). Registrar un ahorro exige una
meta a la cual aportar, y esa no existe todavía.

## D-029 · Metas de ahorro (feature 006) (2026-08-22)

El usuario define aquello para lo que ahorra —una moto, un viaje— con un monto
objetivo, una imagen propia opcional y una fecha objetivo opcional. El progreso
avanza con aportes explícitos (D-028), nunca deduciéndolo del dinero sobrante del
período: el ahorro es una decisión, no un residuo.

**Reglas:**

1. **Imagen propia del usuario**, no un ícono genérico. Cuando alguien duda entre
   gastar y no gastar, ver la moto que quiere pesa más que ver una cifra. Es el
   mecanismo de la funcionalidad, no decoración.
2. **Fecha objetivo opcional.** Con fecha, el sistema calcula cuánto hay que
   aportar por período. Sin fecha, calcula cuándo se alcanzará al ritmo actual.
3. **Se puede retirar** dinero de una meta en cualquier momento, sin penalización
   ni fricción. La vida pasa y bloquearlo solo lograría que el usuario deje de
   registrar la verdad.
4. **Al alcanzarla:** mensaje de celebración y la meta pasa a *metas logradas*, no
   se elimina. El historial de lo conseguido es parte de la motivación.
5. **Sin límite de metas simultáneas.**
6. **Mensajes de ánimo basados en datos, no en frases.** «$1.200.000 de $6.000.000
   — al ritmo actual la tienes en marzo» motiva; «¡tú puedes!» se ignora a la
   tercera vez. Se calculan con aritmética sobre los aportes, sin intervención del
   modelo (D-025).
7. **Si va atrasado, se ofrece la palanca, no el reproche.** «Aportando $150.000
   más al período la alcanzas en diciembre», nunca «a este ritmo llegarías en
   2031» (D-024).

## D-030 · ~~Al marcar Ahorro, el destino es la meta~~ REVERTIDA (2026-08-22)

> Revertida el mismo día por **D-031**: el ahorro sale del selector de Registro
> Fácil y se captura desde la pantalla de metas. Se conserva porque sus reglas
> sobre metas activas, nota opcional y creación de la primera meta siguen siendo
> válidas en su nueva ubicación.

Cuando el tipo seleccionado es *ahorro*, el campo de descripción libre y la
categorización automática desaparecen del flujo. En su lugar aparece la lista de
**metas activas** y el usuario elige a cuál va el aporte.

**Por qué:** el destino de un ahorro es una meta concreta de un conjunto pequeño,
conocido y cerrado. No hay ambigüedad que interpretar, así que no hay nada que
adivinar (D-025: IA para lo ambiguo, código para lo determinista). Además, la
categoría no aplica: en un ahorro, la meta *es* la clasificación.

**Reglas:**

1. Solo se listan las **metas activas**; las ya logradas y archivadas no aparecen.
2. Si el usuario no tiene ninguna meta, puede crear la primera sin salir del flujo.
   Marcar Ahorro no debe llevar a un callejón sin salida.
3. La descripción sigue disponible como **nota opcional** («aporte extra de la
   prima»). Ya no alimenta a la IA ni se categoriza.
4. **Los retiros no se hacen desde Registro Fácil**, sino desde la pantalla de la
   meta. Retirar es infrecuente y requiere contexto —cuánto hay acumulado, cuánto
   falta—; meterlo en el flujo rápido lo cargaría por un caso que ocurre un par de
   veces al año.

**Consecuencia sobre D-005:** el selector de tipo pasa de dos opciones a tres
—`[ Gasto ] [ Ingreso ] [ Ahorro ]`— con *Gasto* preseleccionado. Se mantiene el
principio: las tres visibles al tiempo, ninguna oculta tras un botón que alterna.

## D-031 · El ahorro se registra desde la pantalla de metas (2026-08-22)

El selector de Registro Fácil vuelve a tener dos opciones: `[ Gasto ] [ Ingreso ]`.
Los aportes a metas se registran con un botón en la propia meta, junto al retiro.
**Revierte D-030 y restituye D-005.**

**Por qué:**

1. **Coherencia.** El retiro ya vivía en la pantalla de la meta (D-030, regla 4).
   Separar el aporte del retiro, siendo la misma operación en dos direcciones, no
   tiene justificación.
2. **El formulario deja de mutar.** Con el ahorro dentro del selector, Registro
   Fácil tenía que reconfigurarse al vuelo —ocultar la descripción, apagar la
   categorización, mostrar otro desplegable—. Dos formularios simples y estables
   son más robustos que uno que cambia de forma según el tipo.
3. **Mejor momento.** Aportar viendo subir la barra de progreso de la meta motiva
   más que hacerlo en un formulario genérico.

**Coste asumido:** quien registre varios movimientos de una sentada debe cambiar
de pantalla para aportar. Es aceptable porque aportar no es una acción diaria.

**Lo que NO cambia:** el tipo *ahorro* sigue existiendo en el modelo de datos, sigue
descontando del disponible, sigue excluido de los análisis de gasto y sigue
apareciendo en el historial (D-028). Solo cambia dónde se captura.

**Reglas heredadas de D-030 que siguen vigentes:** solo se listan metas activas;
la nota es opcional y no se categoriza; si no hay ninguna meta, se puede crear la
primera sin salir del flujo.

**Pendiente menor para la feature 001:** definir si la tabla-historial permite
crear movimientos de tipo ahorro directamente, o solo editar los ya existentes.
La coherencia sugiere lo segundo.

## D-032 · Movimientos recurrentes (feature 007) (2026-08-22)

Sección donde el usuario define movimientos que se repiten —suscripciones,
arriendo, servicios, salario— con su periodicidad. Incluye **gastos e ingresos**.

### Periodicidad

Dos formas, y la elección entre ellas importa:

| Forma | Uso | Regla |
|---|---|---|
| **Mensual, día N** | Lo habitual: suscripciones, arriendo, salario | Si el día no existe en el mes, se usa el último día (misma regla que D-025) |
| **Cada N días** | Lo que realmente ocurre cada N días: semanal, cada 14 días | Se cuenta desde la última ocurrencia confirmada |

**Por qué no se usa «cada 30 días» para lo mensual:** un cobro mensual no ocurre
cada 30 días. Un cargo del día 5 avanzaría a 4 feb, 6 mar, 5 abr… desfasándose
casi una semana en un año. La app terminaría preguntando por el cobro el día
equivocado, que es la forma más rápida de perder la confianza del usuario.

### Confirmación

Finzen no está conectada a ningún banco: no puede saber si el cobro ocurrió. Por
eso **pregunta en lugar de asumir**. Al llegar la fecha, el movimiento queda
pendiente de confirmación con tres salidas: **sí** (se registra), **no** (se
reprograma eligiendo la nueva fecha en el calendario) y **eliminar** (el recurrente
desaparece; sirve para suscripciones canceladas).

**Reglas:**

1. **Lista, no interrogatorio.** Los pendientes se muestran juntos, resolubles en
   cualquier orden. Encadenar diálogos uno tras otro convierte cuatro días de
   ausencia en un muro de preguntas antes de poder usar la aplicación.
2. **Nunca bloquea.** El usuario puede ignorar los pendientes y seguir usando la
   app; siguen esperando.
3. **Eliminar va bajo un menú secundario**, no como tercer botón al mismo nivel.
   Es destructivo y no debe tocarse por accidente.
4. **El monto es ajustable al confirmar.** Las suscripciones suben de precio y los
   servicios públicos nunca cuestan lo mismo dos meses seguidos. Sin esto, el
   usuario confirma y luego tiene que ir a corregir el movimiento; con esto, los
   servicios variables entran como recurrentes.
5. **Categoría fija**, definida al crear el recurrente. No interviene la IA: el
   destino ya es conocido.

**Efecto colateral valioso:** con el salario como ingreso recurrente, el historial
se llena casi solo y el sistema puede detectar el ciclo de pago del usuario sin
preguntárselo (D-025).

**Fuera del MVP.** Depende de que el registro y el historial ya existan.

## D-033 · Confirmación del monto en recurrentes (2026-08-22)

El monto se muestra en la propia fila del pendiente y es editable ahí mismo.
Confirmar con `Sí` da por bueno el monto visible. **No se antepone un diálogo
preguntando si el monto fue el de siempre.**

**Por qué:** una pregunta que se repite idéntica cada mes deja de leerse. A la
cuarta confirmación de Spotify el usuario responde que sí por reflejo —incluido el
mes en que subió el precio—, así que el diálogo no evita el error que pretende
evitar y sí añade un paso al caso frecuente. Mostrar el monto y permitir tocarlo
mantiene la cifra a la vista y reserva el trabajo para cuando algo cambió de
verdad.

### Un solo mecanismo para todos los recurrentes

No se distingue entre recurrentes de monto fijo y de monto variable. El monto que
muestra la fila es siempre **el del último cobro confirmado**, y siempre es
editable.

Con eso ambos casos se resuelven igual: una suscripción que sube de precio se
corrige una vez y queda corregida para las siguientes; un servicio público muestra
lo del período anterior como referencia y el usuario lo ajusta. Sin marcar nada al
crear el recurrente y sin pasos extra en el caso normal.

**Por qué:** dos mecanismos paralelos para lo mismo obligan al usuario a
clasificar cada recurrente al crearlo —una decisión que no le interesa— y duplican
la lógica de confirmación. El último monto confirmado es una referencia
suficientemente buena en ambos escenarios (Art. VIII).

### Cambio de monto: puntual o permanente

Cuando se edita el monto, se pregunta si el cambio vale solo para esta vez o de
ahí en adelante, con **«de ahora en adelante» preseleccionado**: un precio que
cambia normalmente se queda cambiado.

**Por qué:** es lo único que el sistema no puede inferir. Una suscripción que sube
de precio no vuelve a bajar, pero un descuento puntual sí: sin esta pregunta, un
arriendo de $1.200.000 pagado una vez con descuento arrancaría el período
siguiente mostrando el monto equivocado. Y a diferencia de «¿te cobraron lo de
siempre?», es una pregunta que solo aparece cuando algo cambió y que el usuario
sabe responder.

## D-034 · Gráficos: tres fijos, el resto por el chat (2026-08-22)

**Criterio rector:** cada gráfico responde una pregunta que el usuario se hace de
verdad. Si no se puede nombrar la pregunta, el gráfico no se construye.

Los tres fijos:

| Gráfico | Pregunta que responde |
|---|---|
| Distribución por categoría, en barras horizontales ordenadas | ¿En qué se me fue la plata? |
| Ingresos contra gastos, últimos seis períodos | ¿Voy mejor o peor que antes? |
| Gasto acumulado del período actual contra el anterior, día a día | ¿Voy más rápido de lo normal? |

**Barras, no torta.** Con trece categorías un gráfico circular es ilegible, y
comparar ángulos es peor que comparar longitudes. Las barras ordenadas de mayor a
menor contestan la pregunta de un vistazo.

**El tercero es el más valioso y el más raro:** avisa el día 12 que se va más
rápido de lo habitual, cuando todavía se puede reaccionar. Un total al cierre del
período solo sirve para lamentarse.

**El resto de visualizaciones salen del chat**, como respuesta a una pregunta
concreta, en lugar de acumularse en un panel. Coherente con D-002: se pregunta, no
se navega.

**Reglas:** ningún número se muestra sin comparación («$890.000» no informa;
«$890.000, 12% más que el período anterior» sí). Cada categoría conserva el mismo
color en toda la aplicación, para poder leer sin consultar la leyenda.

**Fuera:** gráficos circulares con muchas categorías, paneles con ocho
visualizaciones y reportes en PDF.

**Entra al MVP:** son la cara visible de haber registrado datos.

## D-035 · Alertas: dentro de la aplicación y accionables (2026-08-22)

No hay notificaciones fuera de la aplicación en el MVP. El canal es el saludo de
bienvenida (D-024), que ya existe y que el usuario ve siempre.

**Filtro único:** una alerta sobre la que el usuario no puede actuar no es una
alerta, es un reproche. Solo se avisa lo accionable.

| Alerta | Momento | Feature |
|---|---|---|
| Cobros recurrentes por confirmar | Al vencer | 007 |
| Presupuesto acercándose al tope | Al 80%, no al 100% | 005 |
| Meta alcanzada | Al completarse | 006 |
| Gasto inusual para su categoría | Al registrarse | posterior |

**Por qué al 80% y no al superarlo:** al 100% ya no queda nada por hacer salvo
sentirse mal. Al 80% todavía hay margen de reaccionar, que es el único motivo por
el que vale la pena interrumpir a alguien.

**Descartado — recordatorios de registro:** «llevas 3 días sin registrar» es de las
razones más frecuentes por las que se abandona una aplicación; a nadie le gusta
que le recuerden que está fallando. En su lugar, la invitación neutra del saludo:
«¿qué gastos tuviste el fin de semana?».

**Descartado por ahora — observaciones automáticas generadas por IA:** con pocas
semanas de historial, cualquier patrón detectado es ruido estadístico, y una
observación equivocada sobre el dinero de alguien destruye la confianza rápido.
Requiere meses de datos acumulados.

## D-036 · Exportación de datos (feature 009) (2026-08-22)

El usuario puede exportar la totalidad de sus movimientos a un archivo de hoja de
cálculo, abrible en Excel, con sus columnas separadas y sus montos como números,
no como texto.

**Por qué:** el Artículo VI obliga a que el usuario pueda llevarse sus datos. Un
formato de hoja de cálculo es el que realmente usa la gente para revisar, filtrar
y hacer sus propias cuentas, a diferencia de un volcado técnico que solo sirve
para restaurar.

**Reglas:**

1. La exportación incluye todos los campos: fecha, tipo, categoría, monto,
   descripción original, si fue categorizado por el sistema o corregido por el
   usuario, y el estado de anulación.
2. Los montos se exportan como valores numéricos con su moneda indicada, en
   formato que la hoja de cálculo reconozca para poder sumarlos.
3. Se puede exportar todo el historial o solo un rango de fechas.

## D-037 · Alcance del MVP: seis features, con el chat dentro (2026-08-22)

El MVP lo componen las features 001, 002, 003, 004, 008 y 009. Presupuestos (005),
metas de ahorro (006) y movimientos recurrentes (007) quedan para después.

**Qué significa MVP aquí:** no es una versión de lanzamiento público, sino la
primera que el propio autor pueda usar a diario. Hasta que eso ocurra, todas las
decisiones tomadas —incluidas las de este documento— son suposiciones sin
contrastar.

**Criterio aplicado:**

1. **Dependencia de datos.** Presupuestos y metas necesitan historial real para
   funcionar y para poder evaluarse. Construirlos antes permite verificar que no
   fallan, pero no si sirven.
2. **Tiempo hasta tener algo usable.** Cada semana sin usar el producto es una
   semana decidiendo a ciegas.
3. **Riesgo de construir lo equivocado.** Un mes de uso real revelará cosas que hoy
   no se ven; conviene que ese descubrimiento llegue antes de haber construido más.

**Alternativas consideradas y descartadas:**

- *Subir los movimientos recurrentes al MVP.* Tiene un argumento sólido: son los
  movimientos que el usuario sabe que ocurrirán, registrarlos a mano cada período
  es fricción evitable, y llenan el historial casi solos, dándole antes materia
  prima a la IA. Se descarta por tiempo, no por falta de valor. **Es la primera
  candidata a entrar si el MVP se amplía.**
- *Sacar el chat del MVP.* Reduciría bastante el tiempo hasta tener algo usable y
  el riesgo técnico (es lo más exigente para un modelo local). Se descarta porque
  el chat es el diferenciador del producto (D-002): sin él, Finzen es un
  registrador de gastos más.

**Estimación de referencia:** del orden de 10 a 12 semanas a 10 horas semanales.
Es un orden de magnitud, no un compromiso.

## D-038 · Finzen es una aplicación web multiusuario desplegada (2026-08-22)

Cambio de premisa respecto al planteamiento inicial. Finzen deja de ser una
aplicación personal que corre en el equipo del autor y pasa a ser una aplicación
web real, usable por varias personas simultáneamente, con un servidor que debe
sostener esa concurrencia.

**Precisión sobre el alcance:** el objetivo es rendimiento y robustez con varios
usuarios a la vez, **no** un sistema elaborado de cuentas. Cada usuario ve
únicamente sus propias finanzas; no hay espacios compartidos, permisos, roles ni
organizaciones. El inicio de sesión es correo y contraseña, y existe porque es el
mecanismo mínimo que permite al servidor saber de quién son los datos que
devuelve, no como funcionalidad en sí misma.

## D-039 · Stack técnico (2026-08-22)

| Capa | Elección |
|---|---|
| Framework | Next.js (App Router) + TypeScript estricto |
| Base de datos | PostgreSQL + pgvector |
| Acceso a datos | Drizzle ORM |
| Autenticación | Better Auth, con correo y contraseña |
| Validación | Zod |
| Interfaz | Tailwind CSS + shadcn/ui |
| Gráficos | Recharts |
| Capa de IA | Vercel AI SDK |
| Modelo en desarrollo | Ollama local |
| Modelo en producción | Proveedor de nube, intercambiable por configuración |
| Fechas | date-fns con soporte de zonas horarias |
| Archivos | Almacenamiento compatible con S3 |
| Hojas de cálculo | ExcelJS |
| Verificación | Vitest, Playwright, comprobación de tipos y lint |

**Justificación de las elecciones no evidentes:**

- **Drizzle en lugar de Prisma.** El corazón de esta aplicación son consultas
  analíticas: gasto agrupado por categoría, comparación entre períodos y acumulado
  día a día contra el período anterior —esto último, una función de ventana—.
  Prisma no las expresa bien y obligaría a escribir SQL crudo dentro de él. Además,
  el autor domina bases de datos y no TypeScript: Drizzle apoya esa fortaleza en
  lugar de ocultarla tras una abstracción adicional que aprender.
- **pgvector en la misma base de datos.** La categorización por similitud (D-013)
  necesita comparar vectores. Una base vectorial aparte serían dos sistemas que
  mantener y sincronizar para un volumen mínimo. Como columna, el vector vive junto
  al movimiento, en la misma consulta y la misma transacción.
- **Vercel AI SDK.** Es exactamente la abstracción que exige D-008: una sola
  implementación y cambio de proveedor por configuración. Sus definiciones de
  herramientas usan Zod, con lo que el Artículo III se cumple por construcción.

**Descartado deliberadamente:** microservicios, colas de mensajes, Redis, GraphQL y
monorepo. Son infraestructura para problemas que este proyecto no tiene, y cada
pieza consume tiempo del único desarrollador. Escalar bien no es empezar complejo,
sino empezar simple y sin decisiones que encierren.

**Representación del dinero:** enteros de 64 bits en centavos en la base de datos y
un tipo propio en TypeScript que impida operar un monto con un número suelto. Sin
tipos decimales de coma flotante en ninguna capa. El formateo ocurre solo al
mostrar (Art. I).

## D-040 · Despliegue gestionado: Vercel y Neon (2026-08-22)

La aplicación se despliega en Vercel y la base de datos es Postgres gestionado en
Neon, con pgvector.

**Por qué gestionado y no un servidor propio:** un servidor administrado a medias
es menos robusto y menos profesional que uno gestionado. Un VPS traslada al único
desarrollador la responsabilidad de certificados, copias de seguridad,
actualizaciones de seguridad, monitoreo y recuperación ante caídas —un trabajo
aparte, con 10 horas semanales disponibles que deben ir al producto—.

**Limitación asumida:** las funciones tienen tiempo máximo de ejecución, relevante
para respuestas largas del chat. Se resuelve con respuestas en streaming, que el
AI SDK soporta de forma nativa y que además mejora la experiencia. No es un
remiendo: es como conviene hacerlo igualmente.

## D-041 · Requisitos de concurrencia y rendimiento (2026-08-22)

**El cuello de botella no es la base de datos, es la IA.** Postgres con índices
correctos sostiene miles de movimientos por usuario sin dificultad; cada llamada al
modelo cuesta segundos y dinero.

La cascada de tres niveles (D-013), concebida para una CPU sin tarjeta gráfica,
resulta ser también el mecanismo que permite sostener concurrencia: la mayoría de
las categorizaciones se resuelven sin consultar al modelo.

**Obligaciones del plan técnico:**

1. **Agrupación de conexiones a la base de datos.** Es el fallo clásico de combinar
   funciones serverless con Postgres: cada invocación abre una conexión y la base
   se satura. Se usa el agrupador desde el inicio, no cuando falle.
2. **Índices definidos en el diseño**, no añadidos después. Las consultas son
   predecibles: por usuario, por rango de fechas y por categoría.
3. **Límite de peticiones por usuario** hacia el modelo, para que una sola persona
   no agote el presupuesto compartido.
4. **Tiempo máximo de espera y degradación** en toda llamada al modelo, ya exigido
   por las specs 002 y 003.
5. **Ningún cálculo agregado en el cliente.** Los agregados se resuelven en SQL.
6. **Aislamiento por usuario verificado automáticamente:** debe existir una prueba
   que falle si una consulta puede devolver datos de otro usuario.

## D-042 · Todo el stack debe ser gratuito por ahora (2026-08-22)

**Sin costo permanente (software libre):** Next.js, TypeScript, Drizzle, Zod,
Tailwind, shadcn/ui, Recharts, date-fns, ExcelJS, Vitest, Playwright, Vercel AI
SDK, Better Auth, Ollama, PostgreSQL y pgvector.

**Capas gratuitas con condiciones:**

| Servicio | Condición asumida |
|---|---|
| Vercel Hobby | Prohíbe el uso comercial. Válido mientras el proyecto sea personal o de portafolio |
| Neon | La base se suspende tras inactividad; la primera consulta posterior es más lenta |
| Ollama | Solo en la máquina de desarrollo; no sirve para la aplicación desplegada |

**Aplazado por no necesitarse aún:** almacenamiento de archivos (las imágenes
pertenecen a las metas, feature 006, fuera del MVP) y servicio de correo
transaccional, necesario cuando exista verificación de cuenta y restablecimiento
de contraseña.

## D-043 · Frontera de privacidad del nivel gratuito de IA (2026-08-22)

Los niveles gratuitos de las API de modelos con capacidad suficiente —el de Google
es el más generoso: del orden de 15 peticiones por minuto y un millón de tokens
diarios, sin tarjeta— **permiten usar lo enviado para entrenar sus modelos**. Los
niveles de pago no.

**Regla adoptada:**

- Mientras Finzen la use solo su autor o conocidos probando, se usa el nivel
  gratuito.
- **Antes de abrirla a usuarios reales**, o se pasa a un nivel de pago, o se declara
  explícitamente a los usuarios qué ocurre con sus datos. No hay tercera opción
  compatible con el artículo de privacidad.

**Por qué:** una descripción de gasto puede contener información sensible —«consulta
del psiquiatra», «cuota del préstamo»—. Con datos propios es una decisión personal;
con datos financieros de terceros, enviarlos a un servicio que puede entrenar con
ellos no es aceptable.

**Atenuantes ya presentes en el diseño:** al modelo solo se le envía la descripción
y la lista de categorías, nunca identificadores ni historial completo (Art. VI.2 y
RN-005 de la spec 002). Y la cascada (D-013) evita la mayoría de las llamadas.

**Costo real de pasar a nivel de pago:** una categorización son unos cientos de
tokens con un modelo pequeño; fracciones de centavo por movimiento. No es una
decisión económica, sino de cuándo se toma.

## D-044 · La cascada arranca sin el nivel de embeddings (2026-08-22)

La categorización se construye inicialmente con el nivel 1 (palabras clave) y el
nivel 3 (modelo de lenguaje). El nivel 2 (similitud por significado) se incorpora
después. **Modifica D-013 en su calendario, no en su diseño.**

**Por qué:** el nivel 2 exige decidir ya un proveedor de embeddings —con el mismo
problema de privacidad de D-043— o ejecutar un modelo en el servidor, algo delicado
en despliegue gratuito. Los otros dos niveles entregan la funcionalidad completa
desde el primer día y el nivel 2 se añade sin rehacer nada.

## D-045 · Finzen es un proyecto de portafolio (2026-08-22)

Precisa D-038. La aplicación se despliega y admite varias personas usándola a la
vez, pero su finalidad es demostrar el trabajo de su autor, no captar usuarios que
lleven allí sus finanzas reales.

**Consecuencias:**

1. La restricción de uso no comercial del alojamiento gratuito no aplica (D-042).
2. La frontera de privacidad de D-043 **queda vigente pero en suspenso**: con datos
   del propio autor y de quien entra a probar, el nivel gratuito de IA es
   razonable. Se reactiva el día que alguien use Finzen para llevar sus finanzas de
   verdad.
3. El multiusuario mantiene su sentido: quien visite el proyecto crea su cuenta,
   prueba y no ve datos ajenos.
4. La escala objetivo son decenas de usuarios simultáneos, no miles. Los requisitos
   de D-041 siguen valiendo, pero dejan de ser críticos.
5. **La primera impresión pasa a ser un requisito de producto** (D-046).

## D-046 · La aplicación no puede recibir al visitante vacía (2026-08-22)

Al crear una cuenta, el usuario puede poblarla con datos de ejemplo: dos o tres
períodos de movimientos verosímiles, ya categorizados.

**Por qué:** quien entra a una cuenta recién creada encuentra formularios en blanco
y gráficos sin datos. No ve la categorización automática, ni el chat respondiendo
con cifras reales, ni un solo gráfico poblado —es decir, no ve nada de lo que
distingue a Finzen— y se marcha con la impresión de un formulario de registro. Todo
el proyecto se juega en esos primeros dos minutos.

**Descartada** una cuenta de demostración compartida de solo lectura: es más simple,
pero impide probar el registro y la categorización, que son justamente lo mejor que
hay que mostrar.

**No es exclusivo del portafolio:** el problema de la pantalla vacía en el primer
uso ya estaba planteado en el escenario E9 de la spec 001. Los datos de ejemplo lo
resuelven para cualquier usuario.

**Requisito:** los datos de ejemplo deben ser distinguibles de los reales y
eliminables de una vez, para que quien decida usar la aplicación en serio pueda
partir de cero.

## D-047 · Diseño para escritorio, funcional en móvil (2026-08-22)

Precisa D-007. El diseño se piensa para pantalla de computador, pero la aplicación
debe verse y funcionar correctamente en móvil desde el principio. No se construyen
flujos específicos para móvil ni se optimiza para el uso en la calle.

**Por qué:** siendo un proyecto de portafolio (D-045), quien lo visite puede abrirlo
desde el teléfono, y una aplicación que se rompe en móvil transmite exactamente lo
contrario de lo que el proyecto pretende demostrar. Al mismo tiempo, diseñar dos
experiencias completas multiplicaría el trabajo sin aportar al objetivo.

## D-048 · Autenticación como feature 000, previa a todo (2026-08-22)

Las cuentas y el aislamiento por usuario se construyen antes que cualquier otra
feature. Sustituye la exclusión de autenticación que figuraba en la spec 001 y en
D-023.

**Por qué:** cada movimiento, cada categorización aprendida y cada preferencia
pertenecen a alguien. Añadir el propietario después obligaría a migrar todo lo
construido y a revisar cada consulta ya escrita.

**Alcance deliberadamente mínimo:** correo y contraseña, sin roles, permisos,
equipos ni proveedores externos. No es una funcionalidad de producto —nadie usa
Finzen para tener una cuenta— sino el mecanismo que hace posible el aislamiento.

## D-049 · Arquitectura final de la IA (2026-08-22)

| | Desarrollo | Producción |
|---|---|---|
| Modelo | Ollama en la máquina del autor | API de nube con capa gratuita |
| Costo | Cero | Cero dentro de los límites (D-042) |
| Datos | No salen del equipo | Salen al proveedor (D-043) |
| Conmutación | Variable de entorno, sin tocar código |

El proveedor concreto de producción se decide en el plan de la feature 002, cuando
esté definido con precisión qué se le pide al modelo. Candidato principal: Gemini
Flash, por ser la capa gratuita más holgada; alternativa: Groq.

**Lo que hace viable operar en capa gratuita** es la cascada de D-013: la mayoría de
las categorizaciones se resuelven sin consultar al modelo.

**Beneficio adicional del modelo local en desarrollo:** durante toda la construcción
y las pruebas, ningún dato sale del equipo del autor.

## D-050 · Marco de protección de datos (2026-08-22)

_Redactado sin asesoría jurídica profesional. Recoge criterios razonables, no un
dictamen legal._

**Sin problema:** construir la aplicación, usar las API de IA conforme a sus
términos, desplegarla y exhibirla como portafolio. Que el nivel gratuito de un
proveedor pueda usar los prompts para entrenar es una condición declarada del
servicio, no una infracción.

**Donde sí hay obligaciones:** desde el momento en que terceros introducen datos
personales, aplica la Ley 1581 de 2012 de protección de datos personales.

Dos matices a favor:

- La ley excluye las bases de datos de ámbito exclusivamente personal o doméstico.
  Mientras la aplicación la use solo su autor, queda fuera de su alcance.
- No aplica el régimen especial de información crediticia (Ley 1266 de 2008):
  Finzen no reporta a centrales de riesgo ni maneja historial crediticio.

Un matiz en contra, y es el relevante:

- **Una descripción de gasto puede contener datos sensibles sin que nadie lo
  planee** —«consulta con el psiquiatra», «medicamentos», «terapia»—, que son
  información de salud con protección reforzada. Y ese texto es precisamente lo que
  se envía al proveedor de IA. Es el mismo riesgo ya identificado en D-043, ahora
  también por el lado legal.

**Medidas adoptadas, proporcionadas a un proyecto de portafolio (D-045):**

1. **Aviso explícito en el registro de que es una aplicación de demostración y de
   que no deben introducirse datos financieros reales.** Es la medida más eficaz y
   la de menor fricción: junto con los datos de ejemplo (D-046), lleva a que la
   mayoría pruebe con información inventada.
2. **Aviso de privacidad accesible:** qué se guarda, con qué finalidad, que se envía
   a un proveedor de IA para categorizar y cómo eliminarlo todo.
3. **Autorización explícita al registrarse**, nunca una casilla premarcada.
4. **Eliminación de cuenta y datos**, ya exigida por la spec 000 (FR-013).
5. **Declaración de transferencia internacional:** los servidores están fuera de
   Colombia y así debe indicarse.

**Si algún día Finzen deja de ser una demostración**, este marco es insuficiente y
debe revisarse con asesoría profesional, junto con la reactivación de D-043.

## D-051 · El repositorio debe poder levantarse en minutos (2026-08-22)

Quien visite el proyecto va a intentar ejecutarlo. Si no arranca pronto, la
conclusión no será que falta documentación, sino que el proyecto no funciona.

**Requisitos de instalación:**

1. **README con los pasos exactos**, sin conocimiento implícito ni pasos omitidos
   por obvios.
2. **`.env.example`** con todas las variables y el significado de cada una.
3. **Postgres con pgvector en contenedor** para desarrollo local, de modo que nadie
   tenga que instalar la base ni compilar la extensión a mano.
4. **Migraciones y semilla en un solo comando**, con el catálogo de categorías ya
   cargado.
5. **La aplicación debe arrancar sin IA disponible.** Si quien clona no tiene el
   modelo local instalado, el registro debe funcionar sin categorización
   automática. Ya exigido por FR-011 de la spec 002; aquí pasa a ser también
   requisito de instalación.
6. **Nota en el README** advirtiendo que es un proyecto de demostración y que quien
   lo despliegue con usuarios reales asume las obligaciones de protección de datos
   correspondientes (D-050).

**Precisión sobre D-039:** el rechazo a Docker en aquella decisión se refería a
orquestar varios servicios en producción. Un contenedor de Postgres para desarrollo
local no es esa complejidad: es lo que elimina el paso de instalación más
propenso a fallar.

## D-052 · IA local para quien clone el repositorio (2026-08-22)

Quien descargue el proyecto puede usar la categorización y el chat ejecutando el
modelo en su propia máquina con Ollama. **El modelo no viaja en el repositorio**:
cada quien lo descarga con un comando, lo que deja al autor fuera de las
obligaciones de redistribución.

**Elección de modelo — la licencia es criterio:** se opta por un modelo pequeño con
licencia Apache 2.0 o MIT —la familia Qwen en sus versiones pequeñas, o Phi—, no por
los de licencia propia como Llama o Gemma, que arrastran condiciones de atribución y
políticas de uso que habría que documentar y trasladar a terceros. La versión exacta
se fija en el plan de la feature 002, verificando lo disponible en ese momento.

**Configuración por una sola variable:**

```
AI_PROVIDER=ollama    modelo local, gratuito, sin enviar datos fuera
AI_PROVIDER=gemini    API de nube, requiere clave propia
AI_PROVIDER=none      sin IA: registro manual, el resto funciona igual
```

Los tres caminos deben funcionar. El tercero es el que permite ver el proyecto en
marcha sin descargar nada, y ya lo exige FR-011 de la spec 002.

**Requisito de hardware, documentado explícitamente en el README:** un modelo
pequeño necesita del orden de 4 a 5 GB de memoria libre y, sin tarjeta gráfica
dedicada, se ejecuta en el procesador —funciona, pero cada respuesta tarda
segundos—. Quien lo pruebe debe saberlo de antemano y no descubrirlo creyendo que la
aplicación es lenta. La máquina de desarrollo del autor está en ese caso, de modo
que la experiencia documentada será la real.

## D-053 · Los decimales de cada moneda salen de ISO 4217, no de `Intl` (2026-08-22)

Descubierto al implementar `money.ts` (T-010).

`Intl` responde que el peso colombiano tiene **cero decimales**, porque sus datos
reflejan la convención de presentación de cada país —en Colombia los centavos no
circulan— y no el exponente oficial de la moneda. El COP tiene exponente 2 según
ISO 4217.

Si se hubiera confiado en `Intl`, la unidad mínima del COP habría sido el peso, y
un usuario que escribiera «15.000,50» habría recibido un error de monto inválido.

**Decisión:** una tabla explícita con las monedas cuyo exponente no es 2 —las de
cero decimales como el yen o el peso chileno, y las de tres como el dinar
kuwaití—, con 2 por defecto. `Intl` se sigue usando para **presentar**, donde su
convención local sí es la correcta: 15.000 pesos se muestran sin decimales, salvo
que el monto tenga fracción distinta de cero, en cuyo caso se fuerzan para no
mostrar una cifra falsa.

**Lección aplicable al resto del proyecto:** presentación y semántica no son la
misma fuente de verdad. La regla vale también para fechas y períodos.

## D-054 · La confianza es el único campo de coma flotante, y es correcto (2026-08-23)

`categorization_log.confidence` se almacena como `real`. Es la única columna de
coma flotante del sistema.

**Por qué no viola el Artículo I:** el artículo prohíbe la coma flotante **para
montos**, porque un céntimo perdido corrompe el historial y el error se propaga
en silencio. Una confianza es una estimación aproximada por naturaleza: 0,7341 y
0,7342 significan exactamente lo mismo. Aplicarle la regla del dinero sería
obedecer la letra ignorando la razón.

**Cómo se protege igualmente la regla real:** la prueba que vigilaba los tipos de
coma flotante se dividió en dos. Una excluye esta columna **por nombre** —no por
categoría—, de modo que cualquier otra que aparezca hace fallar la verificación.
La otra comprueba directamente lo que importa: toda columna que guarde dinero es
entera.

## D-055 · Un enlace con aspecto de botón sigue siendo un enlace (2026-08-23)

Los enlaces que se ven como botones usan las clases del botón sobre un enlace
normal, no el componente `Button` envolviéndolo.

**Por qué:** envolver un enlace en el componente de botón le quita el rol de
enlace ante los lectores de pantalla y ante cualquier herramienta que navegue por
roles. Se descubrió porque las pruebas dejaron de encontrar el elemento al
buscarlo como enlace: la comprobación de accesibilidad hizo de aviso temprano.

## D-056 · El chat no es viable con un modelo local en esta máquina (2026-08-23)

Medido, no supuesto. Con `qwen3:4b` en un Ryzen 7 5700G sin tarjeta gráfica
dedicada:

| Medición | Resultado |
|---|---|
| Velocidad de generación | **7,8 tokens por segundo** |
| Responder «di hola en una palabra» | **33 segundos** |
| Una pregunta del chat con herramientas | **más de 3 minutos, sin llegar a consultar** |

**Dos causas se suman:**

1. **La velocidad del hardware.** A 7,8 tokens por segundo, cualquier respuesta
   de un par de frases cuesta medio minuto.
2. **El modo de razonamiento de Qwen3.** El modelo «piensa» en voz alta antes de
   responder, y en su caso el razonamiento aparece pegado al contenido: ni el
   parámetro `think: false` de Ollama ni la directiva `/no_think` lo eliminan del
   todo. Gasta cientos de tokens antes de decidir qué consultar.

**Consecuencia para la categorización:** con el tiempo máximo de espera de 4
segundos (plan 002, §6), el nivel 3 de la cascada expira siempre con este modelo.
La categorización sigue funcionando por el nivel 1 —palabras clave sobre el
historial—, que es instantáneo y no usa modelo.

**Decisión:** el chat se sirve desde la nube. La capa de proveedor intercambiable
(D-008) existía precisamente para esto, y el cambio es una variable de entorno.
Para IA local queda pendiente probar un modelo sin razonamiento y más pequeño
—de la familia Llama 3.2 o Granite—, que podría bastar para categorizar aunque no
para conversar.

**Lo que esto confirma:** el riesgo escrito en la spec 003, §8, se materializó tal
como estaba previsto. Haberlo anticipado evitó concluir que el chat «no funciona»
cuando lo que no da la talla es el modelo.

## D-057 · El chat funciona con Gemini: verificado en ejecución (2026-08-23)

Primera prueba del asistente contra un modelo real, con datos de ejemplo. Lo que
hasta ahora estaba construido y probado sin modelo, ejecutado de verdad:

| Pregunta | Herramienta elegida | Resultado |
|---|---|---|
| «¿En qué se me fue la plata este mes?» | `gastoPorCategoria` | Correcto, cifras idénticas a la pantalla |
| «¿Gasté más que el mes pasado?» | `compararConPeriodoAnterior` | Correcto, 1,1% de aumento |
| «¿Cuánto he gastado en domicilios?» | `buscarMovimientos` | Correcto tras corregir la búsqueda |
| «¿Cómo puedo ahorrar más?» | `gastoPorCategoria` | Responde con sus propias categorías, sin consejos genéricos |
| «¿En qué acciones debería invertir?» | ninguna | Se niega, como exige el Artículo II.4 |

**Tiempo de respuesta: entre 2 y 3 segundos.** Frente a más de tres minutos sin
llegar a consultar con el modelo local (D-056).

**Dos fallos encontrados al ejecutarlo, ninguno detectable sin modelo:**

1. El modelo por defecto que se había fijado ya no se ofrece a cuentas nuevas.
   Ahora la versión se puede fijar por configuración, porque los proveedores
   retiran modelos y cualquier valor por defecto envejece.
2. **La búsqueda comparaba texto literal:** preguntar por «domicilios» no
   encontraba «domicilio de comida». Ahora usa las mismas raíces que la
   categorización, de modo que ambas coinciden en qué consideran la misma cosa.
   El fallo solo aparece cuando alguien pregunta con sus propias palabras.

**Lección:** las pruebas sin modelo cubrieron que las cifras fueran correctas y
que nadie alcanzara datos ajenos —lo que decide si el asistente es fiable—, pero
no podían detectar que la búsqueda no entendiera un plural. Eso solo lo encuentra
alguien preguntando de verdad.

## D-058 · Licencia MIT (2026-08-23)

El repositorio se publica bajo licencia MIT. Cualquiera puede usar, modificar y
distribuir el código, incluso con fines comerciales, conservando el aviso de
copyright.

**Por qué:** un repositorio público sin licencia no autoriza a nadie a usarlo —por
defecto son todos los derechos reservados—, así que sin ella el proyecto se puede
leer pero no reutilizar. Siendo un proyecto de portafolio (D-045), el objetivo es
que se vea, se pruebe y se valore, no controlar su explotación comercial. MIT es
la licencia más reconocible y la que menos fricción genera.

**Descartada AGPL**, que habría obligado a publicar el código a quien desplegara
Finzen como servicio. Protege más, pero hace que menos gente lo toque, y aquí
importa más lo segundo.

---

# Decisiones pendientes

> El cambio de premisa a aplicación web multiusuario (D-038) ya se propagó a la
> constitución (Artículo VI, v2.0.0), a la spec 000 y a las specs 001 y 004.

| # | Pregunta | Afecta |
|---|---|---|
| P-019 | ¿Los datos de cada usuario se cifran en reposo más allá de lo que ofrece el proveedor? | constitución |

<!--
| # | Pregunta | Bloquea |
|---|---|---|
-->
