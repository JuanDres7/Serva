# Spec 012 — IA expandida: metas, presupuestos y recurrentes

- **Estado:** lista para `plan.md` — sin aclaraciones pendientes
- **Creada:** 2026-08-25
- **Depende de:** 005 (presupuestos), 006 (metas de ahorro), 007 (recurrentes), 010 (acciones conversacionales), 011 (deudas)
- **Decisiones aplicables:** D-024, D-025, D-026, D-031, D-066, D-073, D-075, D-076

---

## 1. Contexto y motivación

Serva AI hoy entiende movimientos y deudas. Puedes decirle «me gasté 30 mil en almuerzo» y lo registra, o «le debo 500 a mi hermana» y crea la deuda. Pero metas de ahorro, presupuestos y gastos recurrentes siguen siendo cosa del formulario: hay que ir a la pantalla correspondiente, abrir el formulario, teclear los datos.

El problema no es que el formulario sea difícil —los tres son sencillos— sino que **la conversación ya es el hábito**. Una vez que el usuario le habla a Serva para todo lo demás, tener que salir del chat para crear una meta o ponerle un tope a una categoría se siente como un retroceso. Y los cobros recurrentes pendientes, que aparecen como recordatorio en el hogar, deberían poder confirmarse desde el mismo chat donde el usuario ya está.

Esta feature cierra ese círculo: las tres entidades que hoy solo existen en su propia pantalla pasan a ser gestionables desde la conversación, con las mismas reglas que transacciones y deudas —la IA propone, el usuario confirma—.

**El cambio de fondo:** la spec 010 levantó la garantía de solo lectura del asistente para transacciones. La 011 la extendió a deudas. Esta feature la extiende a las tres entidades restantes que el usuario crea y mantiene. Al terminar, no hay ninguna pantalla de Serva que no se pueda alcanzar hablando.

## 2. Alcance

### Dentro

- Consultar metas de ahorro con su progreso desde el chat.
- Crear metas de ahorro desde el chat, con nombre, monto objetivo y fecha opcional.
- Aportar y retirar dinero de una meta desde el chat.
- Consultar presupuestos con su estado (holgado, cerca, excedido) desde el chat.
- Crear y eliminar presupuestos desde el chat.
- Consultar gastos recurrentes —pendientes y programados— desde el chat.
- Crear nuevos gastos recurrentes desde el chat.
- Confirmar cobros recurrentes pendientes desde el chat, con opción de ajustar monto.

### Fuera

- Configurar el ciclo de pago desde el chat. Eso requiere la pantalla de
  presupuestos, con su formulario especializado (spec 005, E1).
- Subir fotos a metas de ahorro desde el chat. La interfaz de archivos no existe
  en el chat (Art. VIII).
- Editar la periodicidad de un recurrente existente.
- Eliminar metas de ahorro desde el chat. Las metas se eliminan desde su
  tarjeta, donde se ve el progreso completo.
- Presupuestos por semana o día sin tener el ciclo configurado.
- Aconsejar sobre cuánto ahorrar, qué presupuesto reducir o si conviene pagar
  un recurrente (Art. II.4).

## 3. Escenarios

### E1 — Crear meta desde chat

**Dado** que le escribo a Serva AI «quiero ahorrar para un viaje a Japón, serían
2 millones»,
**cuando** lo procesa,
**entonces** propone crear una meta con nombre «Viaje a Japón» y objetivo de
$2.000.000, y me muestra una tarjeta para confirmar.

### E2 — Aportar a una meta

**Dado** que tengo una meta activa «Viaje a Japón»,
**cuando** le digo «ahorra 200 mil para el viaje»,
**entonces** propone un aporte de $200.000 a esa meta, y me pide confirmación.

### E3 — Retirar de una meta

**Dado** que tengo aportado dinero en «Viaje a Japón»,
**cuando** le digo «retira 50 mil del viaje»,
**entonces** propone un retiro de $50.000, me pide confirmación y me recuerda
que registre el gasto aparte.

### E4 — Consultar progreso de una meta

**Dado** que tengo una meta con aportes parciales,
**cuando** le pregunto «¿cómo voy con el viaje?»,
**entonces** me muestra una tabla con nombre, objetivo, aportado, porcentaje,
cuánto falta y fecha estimada si hay datos suficientes.

### E5 — Meta no encontrada

**Dado** que no tengo una meta llamada «Carro»,
**cuando** le digo «aporta 100 mil al carro»,
**entonces** me dice que no encontró esa meta y me lista las que tengo activas.

### E6 — Consultar presupuestos

**Dado** que tengo presupuestos definidos,
**cuando** le pregunto «¿cómo voy con los presupuestos?»,
**entonces** me muestra una tabla con categoría, tope, gastado, restante, días
restantes y nivel —holgado, cerca o excedido—.

### E7 — Crear presupuesto

**Dado** que ya configuré mi ciclo de pago,
**cuando** le digo «ponele tope de 300 mil a comida»,
**entonces** propone crear un presupuesto de $300.000 en la categoría
«Alimentación» y me pide confirmación.

### E8 — Eliminar presupuesto

**Dado** que tengo un presupuesto de Transporte,
**cuando** le digo «quita el presupuesto de transporte»,
**entonces** propone eliminarlo y me pide confirmación explícita, porque es
una acción destructiva.

### E9 — Ciclo no configurado

**Dado** que no tengo mi ciclo de pago configurado,
**cuando** le pregunto por presupuestos,
**entonces** me responde: «Configura tu ciclo de pago en la sección de
Presupuestos. Después puedo ayudarte con topes y seguimiento.»

### E10 — Consultar recurrentes

**Dado** que tengo cobros recurrentes, algunos pendientes y otros programados,
**cuando** le pregunto «¿qué cobros tengo pendientes?»,
**entonces** me muestra una tabla separando pendientes —vencidos y de hoy— de
programados —futuros—, con descripción, monto, periodicidad y próxima fecha.

### E11 — Crear recurrente

**Dado** que le digo «register el arriendo de 800 mil cada mes el 1»,
**cuando** lo procesa,
**entonces** propone un gasto recurrente de $800.000 mensual el día 1 en la
categoría «Arriendo», y me pide confirmación.

### E12 — Confirmar cobro pendiente

**Dado** que tengo un cobro de internet pendiente,
**cuando** le digo «confirma el internet»,
**entonces** busca entre los pendientes, me muestra cuál va a confirmar con su
monto, y me deja ajustar el monto y elegir «solo esta vez» o «de ahora en
adelante» antes de confirmar.

### E13 — Pendiente no encontrado

**Dado** que no hay ningún cobro pendiente de «la luz»,
**cuando** le digo «confirma la luz»,
**entonces** me dice que no encontró ese cobro entre los pendientes y me
lista los que sí están pendientes.

### E14 — Crear recurrente sin categoría

**Dado** que le digo «register la suscripción de 40 mil cada mes»,
**cuando** Serva no puede determinar la categoría,
**entonces** me pregunta en qué categoría va, sin crear nada hasta tenerlo.

### E15 — Aportar a meta sin monto

**Dado** que le digo «ahorra para el viaje»,
**cuando** no menciona cuánto,
**entonces** me pregunta cuánto quiere aportar, sin inventar un monto.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El chat debe poder listar todas las metas activas con su progreso derivado: nombre, objetivo, aportado, porcentaje, falta y fecha estimada. |
| FR-002 | El chat debe poder crear una meta con nombre (1-60 caracteres), monto objetivo (entero positivo) y, opcionalmente, una fecha objetivo. |
| FR-003 | El chat debe poder aportar dinero a una meta existente, buscándola por nombre. |
| FR-004 | El chat debe poder retirar dinero de una meta existente, buscándola por nombre. |
| FR-005 | Si el usuario menciona un monto sin moneda, se usa la moneda configurada. |
| FR-006 | Si el usuario no menciona el monto, el sistema debe preguntarlo. Nunca puede inventarlo. |
| FR-007 | Si no se encuentra la meta por nombre, se lista las metas disponibles y se pide que el usuario especifique. |
| FR-008 | El chat debe poder listar todos los presupuestos con su gasto real del período actual. |
| FR-009 | El chat debe poder crear un presupuesto para una categoría de gasto con un tope. |
| FR-010 | El chat debe poder eliminar un presupuesto existente, siempre con confirmación explícita. |
| FR-011 | Si el usuario pide un presupuesto y no tiene ciclo configurado, el chat informa que debe ir a la UI de presupuestos. |
| FR-012 | El chat debe poder sugerir topes basados en el gasto promedio del historial, usando las herramientas de lectura existentes. |
| FR-013 | El chat debe poder listar todos los movimientos recurrentes: pendientes y programados. |
| FR-014 | El chat debe poder crear un nuevo recurrente con descripción, monto, tipo (gasto/ingreso), categoría y periodicidad. |
| FR-015 | El chat debe poder confirmar un cobro recurrente pendiente, creando la transacción correspondiente. |
| FR-016 | Al confirmar un recurrente, el usuario debe poder ajustar el monto y elegir «solo esta vez» o «de ahora en adelante». |
| FR-017 | Si el usuario menciona una periodicidad ambigua —«cada mes», «quincenal», «semanal»—, el sistema la resuelve a la periodicidad soportada más cercana. |
| FR-018 | Si el usuario no menciona la periodicidad al crear un recurrente, el sistema debe preguntarla. |
| FR-019 | Toda propuesta de esta feature debe pasar por la puerta de decisión igual que las transacciones: crear puede automatizarse, destruir siempre confirma (spec 010, FR-009). |
| FR-020 | Toda propuesta escrita por la IA debe quedar marcada con su origen y ser rastreable hasta el mensaje del que salió (Art. II.2). |
| FR-021 | Las metas, presupuestos y recurrentes de un usuario no deben ser alcanzables por ninguna consulta de otro (Art. VI.1). |

## 5. Reglas de negocio

- **RN-001** — Las contribuciones a metas no son gastos. No afectan los totales
  de gasto, los presupuestos ni las categorías (spec 006, RN-002).
- **RN-002** — Un retiro de meta no registra gasto. El usuario debe registrar el
  gasto aparte (spec 006, RN-003).
- **RN-003** — Los presupuestos solo aplican a categorías de gasto, nunca a
  ingresos (spec 005, RN-001).
- **RN-004** — Los montos son enteros en la unidad menor de la moneda, como todo
  (Art. I). Nunca se resuelven a coma flotante.
- **RN-005** — La puerta de decisión aplica igual: crear hasta tres items se
  ejecuta, más de tres pide confirmación, destruir siempre confirma (spec 010,
  RN-008).
- **RN-006** — Los mensajes del chat sobre metas, presupuestos y recurrentes
  nunca juzgan, regañan ni reprochan (D-024).
- **RN-007** — La IA describe el estado de las entidades; no aconseja cuánto
  ahorrar, qué presupuesto reducir ni si conviene pagar un recurrente (Art. II.4).
- **RN-008** — Las fechas se resuelven en la zona horaria del usuario, no en UTC
  (D-075).
- **RN-009** — Un recurrente confirmado es indistinguible de uno registrado a
  mano: entra en la misma tabla de transacciones con las mismas columnas.

## 6. Criterios de aceptación

1. Los quince escenarios E1–E15 se ejecutan correctamente.
2. Crear una meta desde el chat produce una fila en la tabla `savings_goals` con
   los datos correctos y con `created_by = 'ai'`.
3. Aportar y retirar desde el chat crean transacciones de tipo `saving` con la
   dirección correcta, y el progreso de la meta se actualiza derivadamente.
4. La lista de metas desde el chat muestra el mismo progreso que la pantalla de
   metas para los mismos datos.
5. Crear un presupuesto desde el chat produce una fila en `budgets` con el tope
   correcto, y el presupuesto aparece en la pantalla de presupuestos.
6. Eliminar un presupuesto desde el chat lo borra de la tabla y de la pantalla.
7. Confirmar un recurrente pendiente desde el chat crea la transacción
   correspondiente en `transactions` y actualiza `nextDueOn` del recurrente.
8. Con ciclo no configurado, ninguna operación de presupuesto se ejecuta desde el
   chat.
9. Ninguna herramienta nueva expone datos de otro usuario (Art. VI.1).
10. Todo monto transportado por las nuevas herramientas es un entero en centavos,
    nunca un float (Art. I).
11. Ninguna prueba de la suite requiere un modelo instalado (Art. IV).

## 7. Métricas de éxito

- El usuario puede crear una meta de ahorro desde el chat en menos de dos
  intercambios de mensajes.
- El usuario puede consultar el progreso de sus metas y ver una tabla clara
  sin ir a la pantalla de metas.
- El usuario puede confirmar un cobro recurrente pendiente desde el chat,
  sin navegar a la sección de recurrentes.
- El usuario puede crear un presupuesto desde el chat sin ir a la UI, siempre
  que ya tenga el ciclo configurado.
- La proporción de propuestas de esta feature que el usuario rechaza se
  mantiene por debajo del 15%. Por encima de eso, el modelo no está
  entendiendo bien las intenciones.

## 8. Riesgo conocido

**El riesgo principal es la ambigüedad en la búsqueda por nombre.** Las tres
entidades nuevas se buscan por nombre —no por ID— porque el usuario no piensa
en identificadores. «El viaje», «el viaje a Japón», «mi viaje» podrían ser la
misma meta o tres distintas. Si la búsqueda es demasiado flexible, el sistema
confunde; si es demasiado estricta, no encuentra nada y frustra.

La mitigación es exactamente la misma que usan las deudas con la contraparte:
buscar, mostrar lo que se encontró, y dejar que el usuario confirme. Si hay
varias opciones posibles, se listan todas. Si no hay ninguna, se dice y se
lista lo que existe. Nunca se asume cuál es.

El segundo riesgo es de alcance. Esta feature añade seis herramientas de
escritura a un chat que ya tiene seis (tres de transacciones, tres de deudas).
Son doce en total. La spec 010 definió un límite de cinco movimientos por
mensaje (FR-021) para evitar que el usuario se pierda. Con más entidades en
juego, ese límite sigue siendo válido: cada herramienta es independiente y se
evalúa por separado, pero el usuario no debería tener que manejar metas,
presupuestos y recurrentes en un solo mensaje.
