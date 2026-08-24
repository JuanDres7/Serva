# Spec 010 — Registrar y programar hablando

- **Estado:** lista para `plan.md` — sin aclaraciones pendientes
- **Creada:** 2026-08-23
- **Depende de:** 001 (registro), 002 (categorización), 003 (chat), 007 (recurrentes)
- **Decisiones aplicables:** D-002, D-011, D-019, D-025, D-064, D-066

---

## 1. Contexto y motivación

Serva AI hoy solo lee. Puede decirte en qué se te fue la plata, pero para meter un
gasto hay que ir a Registro Fácil, teclear el monto, describir, revisar la
categoría y confirmar. Eso es rápido —esa era la promesa de la spec 001— pero
sigue siendo un formulario.

El problema que resuelve esta feature es otro: **la gente no piensa en
formularios, piensa en frases**. «Salí de fiesta, me tomé tres cervezas de
dieciocho mil y el carro hasta la casa me costó cincuenta» es una sola cosa en la
cabeza de quien la dice, y son dos movimientos de dos categorías distintas en la
base de datos. Hoy esa traducción la hace la persona. Debería hacerla Serva.

Es el diferenciador real del producto. Registrar gastos rápido lo hace cualquiera;
entender una frase suelta y dejar la contabilidad hecha, no. Y encaja con lo que
la spec 003 ya declaró: la conversación reemplaza a la navegación. Faltaba que
además reemplazara al formulario.

**El cambio de fondo:** las seis herramientas del asistente son de solo lectura
*por construcción*, y la spec 003 lo declara como garantía (FR-010). Esta feature
la levanta de forma deliberada y acotada. Deja de ser cierto que Serva AI no puede
tocar nada; pasa a ser cierto que solo puede tocar lo que esta spec enumera, con
las salvaguardas que esta spec fija.

## 2. Alcance

### Dentro

- Extraer uno o varios movimientos de un mismo mensaje en lenguaje natural, con su
  monto, su descripción, su fecha y su categoría.
- Registrar esos movimientos, corregir movimientos existentes y anularlos.
- Programar cobros futuros: los que se repiten (recurrentes de la spec 007) y los
  que ocurren una sola vez en una fecha.
- Resolver fechas dichas en lenguaje corriente: «hoy», «ayer», «el martes»,
  «el 7 de septiembre».
- La activación consciente del registro automático y su revocación, ambas dentro
  del chat (Art. II.1).
- La tarjeta de confirmación en el chat, con lo que Serva entendió antes de
  escribirlo.
- Marcar en el modelo de datos qué escribió la IA y con qué confianza (Art. II.2).

### Fuera

- **Deudas y préstamos como entidad** con saldo, vencimiento y estado. Es la
  feature 011 y depende de esta.
- Crear o modificar metas de ahorro y presupuestos por lenguaje natural.
- Importar extractos bancarios o conectarse a un banco.
- Que Serva escriba algo sin que el usuario le haya hablado. Nada de registros
  proactivos ni de completar huecos por su cuenta.
- Borrar movimientos. Anular sí; borrar no existe en el sistema (Art. VII).
- Registrar en nombre de otra persona o sobre datos que no sean del usuario en
  sesión.

## 3. Escenarios

### E1 — Varios movimientos en una sola frase

**Dado** que le escribo a Serva AI «hoy salí de fiesta y me tomé tres cervezas que
me costaron 18 mil, y el carro hasta mi casa me cobró 50 mil»,
**cuando** Serva lo procesa,
**entonces** quedan dos movimientos —18.000 en Entretenimiento y 50.000 en
Transporte, ambos con fecha de hoy— y Serva me dice en una frase qué registró.

### E2 — Falta un dato para poder registrar

**Dado** que escribo «me tomé unas cervezas anoche»,
**cuando** Serva no encuentra el monto,
**entonces** me pregunta cuánto fue en lugar de inventarlo o de registrar cero, y
no escribe nada hasta tenerlo.

### E3 — Corrección hablando

**Dado** que Serva acaba de registrar 18.000 en Entretenimiento,
**cuando** le digo «no, fueron 20 mil»,
**entonces** corrige ese movimiento a 20.000 y me confirma el cambio, sin crear uno
nuevo.

### E3b — Lo hizo y no me gustó

**Dado** que con el automático puesto Serva registró un gasto en la categoría
equivocada,
**cuando** pulso «revertir» debajo de lo que hizo,
**entonces** el movimiento queda anulado en el acto, sin preguntarme otra vez, y
Serva me deja decirle cómo era en realidad.

### E4 — Anular hablando

**Dado** que tengo registrado un almuerzo de 24.000,
**cuando** le digo «quita el almuerzo de ayer, al final no lo pagué yo»,
**entonces** Serva me muestra cuál va a anular y **espera mi confirmación** antes de
tocarlo, tenga o no activado el registro automático.

### E5 — Programar un cobro futuro

**Dado** que le digo «tengo que pagar 200 mil el martes 7 de septiembre»,
**cuando** Serva lo procesa,
**entonces** queda programado un cobro único para esa fecha, que aparecerá para
confirmar cuando llegue el día, igual que cualquier recurrente (spec 007).

### E6 — La primera vez que va a escribir

**Dado** que nunca he activado el registro automático,
**cuando** Serva entiende un movimiento a partir de mi mensaje,
**entonces** me muestra lo que entendió y me ofrece dos salidas: registrarlo esta
vez, o registrarlo siempre sin volver a preguntar. Si elijo lo segundo, queda
activado de forma explícita y revocable.

### E7 — Revocar sin salir del chat

**Dado** que tengo el registro automático activado,
**cuando** le digo «deja de registrar solo» o «vuelve a preguntarme»,
**entonces** queda desactivado y Serva me lo confirma. No hay que ir a Ajustes.

### E8 — Lo que digo no es un movimiento

**Dado** que escribo «¿cuánto llevo gastado este mes?»,
**cuando** Serva lo procesa,
**entonces** responde la pregunta como siempre y no registra nada. Preguntar no
escribe.

### E9 — Fecha dicha en pasado

**Dado** que escribo «ayer pagué el arriendo» un día 3,
**cuando** Serva resuelve la fecha,
**entonces** usa el día 2 en mi zona horaria, y nunca una fecha futura: un
movimiento futuro no existe (FR-008 de la spec 001).

### E10 — Registrar y preguntar en la misma frase

**Dado** que escribo «me gasté 30 mil en el almuerzo, ¿cuánto llevo este mes?»,
**cuando** Serva lo procesa,
**entonces** registra el almuerzo y responde la pregunta en el mismo turno, y la
cifra que me da **ya incluye** esos 30 mil.

### E11 — Parte del mensaje está incompleta

**Dado** que escribo «gasté 20 mil en el almuerzo, 5 mil en el bus y unas cervezas»,
**cuando** Serva lo procesa,
**entonces** registra el almuerzo y el bus, me dice que esos dos quedaron, y me
pregunta cuánto fueron las cervezas. No pierdo los dos que sí estaban completos.

### E12 — Demasiado de golpe

**Dado** que pego un mensaje con nueve gastos,
**cuando** Serva lo procesa,
**entonces** se niega, me lo dice, y me pide que se los diga por partes. No
registra ninguno.

### E13 — El modelo no está disponible

**Dado** que no hay proveedor configurado o el modelo falla,
**cuando** intento registrar hablando,
**entonces** Serva me lo dice y me deja el camino manual, sin perder lo que
escribí. Registro Fácil sigue funcionando igual.

### E14 — Entendió mal y lo veo después

**Dado** que Serva registró algo con el automático activado,
**cuando** reviso el historial,
**entonces** ese movimiento está marcado como escrito por la IA, puedo ver de qué
frase salió, y puedo corregirlo o anularlo como cualquier otro.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe extraer de un mismo mensaje cero, uno o varios movimientos, cada uno con monto, descripción, fecha y categoría. |
| FR-002 | Cada movimiento extraído debe validarse contra un esquema antes de tocar la base de datos, con las mismas reglas que Registro Fácil: monto entero positivo, fecha no futura, categoría del conjunto cerrado y del tipo correcto (Art. III.1). |
| FR-003 | Si falta el monto, el sistema debe preguntarlo. Nunca puede inventarlo, estimarlo ni registrar cero. |
| FR-004 | Si falta la fecha, se asume hoy en la zona horaria del usuario. |
| FR-005 | Si no se puede determinar la categoría con confianza suficiente, el movimiento se registra en «Otros» y queda marcado como tal, igual que hace la cascada de la spec 002. |
| FR-006 | El sistema debe resolver expresiones de fecha corrientes —«hoy», «ayer», «anteayer», «el lunes», «el 7 de septiembre»— contra la fecha civil del usuario, no contra UTC. |
| FR-007 | Antes de escribir por primera vez, el sistema debe pedir una activación explícita, dentro del chat, que el usuario pueda conceder solo para esa vez o de forma permanente (Art. II.1). |
| FR-008 | El usuario debe poder revocar el registro automático desde el chat, en lenguaje natural, y recibir confirmación de que quedó revocado. |
| FR-009 | Con el registro automático desactivado, ninguna escritura ocurre sin que el usuario acepte la tarjeta de confirmación. |
| FR-010 | Modificar o anular un movimiento existente debe pedir confirmación **siempre**, esté o no activado el registro automático (D-066). |
| FR-011 | Todo movimiento escrito por la IA debe quedar marcado en el modelo de datos con su origen y su confianza, y debe poder rastrearse hasta el mensaje del que salió (Art. II.2). |
| FR-012 | Toda acción de Serva debe aparecer en el chat contada en una frase y acompañada de dos botones. Antes de escribir: confirmar o cancelar. Después de escribir con el automático puesto: dejarlo así o revertirlo. |
| FR-013 | El historial debe distinguir visualmente lo que escribió la IA de lo que registró el usuario. |
| FR-014 | El sistema debe poder programar un cobro futuro, único o repetido, a partir de una frase, y ese cobro sigue las reglas de confirmación de la spec 007. |
| FR-015 | Un mensaje que solo pregunta no debe escribir nada. La lectura y la escritura son intenciones distintas y el sistema debe distinguirlas. |
| FR-016 | Cada escritura debe registrarse con la frase de origen, el resultado y la confianza, para poder medir cuánto acierta (Art. III.4). |
| FR-017 | Si el modelo no está disponible o su salida no valida, el sistema debe decirlo y dejar intacto el camino manual, sin escribir nada a medias (Art. III.2). |
| FR-018 | Cada movimiento se evalúa por separado: los que están completos y validan se registran, y por los que falten datos se pregunta. Serva debe decir exactamente cuáles quedaron registrados y cuáles no. |
| FR-019 | El sistema no debe escribir nunca sin un mensaje del usuario que lo motive. No hay registros proactivos. |
| FR-020 | Un mensaje que registra y pregunta a la vez debe hacer ambas cosas en el mismo turno, y la respuesta debe reflejar el estado **después** de registrar. |
| FR-021 | El sistema debe extraer como máximo cinco movimientos de un mismo mensaje. Por encima de eso debe negarse y pedir que se los digan por partes. |
| FR-022 | Cuando un mensaje produzca más de tres movimientos, la tarjeta de confirmación debe mostrarse siempre, aunque el registro automático esté activado. |
| FR-023 | Revertir lo que Serva acaba de escribir debe ocurrir de inmediato, sin pedir una confirmación adicional. Deshacer devuelve al usuario a donde estaba; no destruye nada suyo. |
| FR-024 | El usuario debe poder corregir hablando en lugar de rehacerlo a mano: decirle a Serva qué entendió mal y que lo intente otra vez sobre la misma acción. |
| FR-025 | Una acción ya revertida o ya confirmada no debe poder volver a aplicarse desde la misma tarjeta. |

## 5. Reglas de negocio

- **RN-001** — El modelo propone qué escribir; el sistema decide si es válido y lo
  escribe. El modelo nunca redacta la fila que entra a la base de datos.
- **RN-002** — Los montos que el modelo devuelve se interpretan como enteros en la
  unidad menor de la moneda del usuario, y esa conversión la hace el sistema, no
  el modelo (Art. I).
- **RN-003** — La moneda es la del usuario. El sistema no convierte divisas ni
  acepta montos en otra moneda.
- **RN-004** — Una corrección del usuario sobre algo que escribió la IA es
  soberana y no se vuelve a pisar (Art. II.3).
- **RN-005** — Anular no borra. Un movimiento anulado por Serva sigue existiendo y
  puede restaurarse (Art. VII).
- **RN-006** — La activación del registro automático es del usuario, no del
  dispositivo ni de la conversación: vale para su cuenta y sobrevive a cerrar
  sesión, hasta que la revoque.
- **RN-007** — Serva registra y programa; no aconseja qué hacer con el dinero
  (Art. II.4).
- **RN-008** — Cuanto más va a escribir de una vez, más pregunta. Una tarjeta de
  tres filas se revisa de un vistazo; una de ocho no la lee nadie, y con el
  automático puesto entrarían las ocho sin que nadie las mirara.
- **RN-009** — En un mensaje que registra y pregunta, primero se escribe y después
  se consulta. Responder con cifras anteriores a lo que se acaba de registrar
  daría un número que el usuario ve como equivocado en el momento.

## 6. Criterios de aceptación

1. Los quince escenarios E1–E14 y E3b se ejecutan correctamente.
2. Existe un conjunto de frases de prueba con el resultado esperado, verificable
   automáticamente, que falla si de una frase sale un movimiento distinto del
   esperado en monto, fecha, tipo o categoría.
3. Ninguna escritura ocurre sin activación previa o confirmación explícita, y hay
   una prueba que lo demuestra intentándolo sin activar.
4. Modificar y anular piden confirmación en todos los casos, con automático o sin
   él, y hay una prueba por cada uno.
5. Todo lo escrito por la IA queda marcado y es rastreable hasta su frase de
   origen.
6. Una salida del modelo mal formada no escribe nada ni rompe el chat.
7. Con el modelo apagado, el resto de la aplicación funciona sin degradación y
   Registro Fácil sigue intacto.
8. Ninguna prueba de la suite requiere un modelo instalado (Art. IV).

## 7. Métricas de éxito

- De diez frases corrientes de gasto, al menos nueve producen exactamente los
  movimientos que la persona esperaba, sin corrección posterior.
- Cero montos inventados: ninguna escritura ocurre con un monto que no estuviera
  en la frase.
- El usuario registra un día entero de gastos sin abrir Registro Fácil.
- La proporción de movimientos escritos por la IA que el usuario corrige o anula
  después se mantiene por debajo del 10%. Por encima de eso, la extracción no es
  de fiar y hay que volver a la confirmación siempre.

## 8. Riesgo conocido

**El riesgo de esta feature no es que falle, es que acierte casi siempre.** Un
sistema que se equivoca una vez de cada veinte, escribiendo solo, produce una
contabilidad con errores que nadie revisa, porque la confianza ya se ganó. Es peor
que uno que falla a menudo y obliga a mirar.

De ahí tres decisiones que no son negociables sin volver a esta spec: la
activación explícita, la confirmación siempre para lo destructivo, y la marca de
origen en cada fila. La marca es la que permite, el día que la extracción resulte
peor de lo esperado, encontrar y revisar exactamente lo que escribió la IA.

El segundo riesgo es de expectativa. Una vez que la aplicación entiende «me tomé
unas cervezas», el usuario asume que entiende todo, y probará con frases mucho más
enredadas. Preguntar en lugar de adivinar (FR-003) es lo que evita que esa prueba
termine en datos falsos.

## 9. Aclaraciones resueltas

- **Límite por mensaje → cinco, y más de tres siempre confirma** (FR-021, FR-022).
  Cinco cubre el caso real —una salida, o el resumen de un día— y por encima casi
  siempre es alguien pegando un extracto bancario, que está fuera del alcance. El
  segundo número es el que de verdad protege: el riesgo no es extraer mucho, es
  escribir mucho sin que nadie lo mire.

- **Mensaje mixto → hace las dos cosas** (FR-020). Y la respuesta refleja el
  estado posterior a la escritura (RN-009).

  Resolver esto obligó a corregir el FR-018, que decía que las escrituras eran
  atómicas por mensaje: o todas o ninguna. Era prudencia mal aplicada. Los
  movimientos de un mensaje son independientes entre sí —no son una transferencia
  donde escribir la mitad rompe la contabilidad—, así que la atomicidad solo
  conseguía que una frase incompleta tirara a la basura los movimientos que sí
  estaban completos. Ahora cada uno se evalúa por su cuenta.
