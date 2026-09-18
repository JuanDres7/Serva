# Spec 011 — Deudas y préstamos

- **Estado:** lista para `plan.md` — sin aclaraciones pendientes
- **Creada:** 2026-08-24
- **Depende de:** 001 (movimientos), 007 (recurrentes), 010 (escritura hablando)
- **Decisiones aplicables:** D-024, D-025, D-031, D-066, D-073

---

## 1. Contexto y motivación

Hoy una deuda en Serva es una categoría de gasto llamada «Deudas y créditos».
Eso registra que pagaste, pero no sabe **cuánto te falta**, ni **a quién**, ni
**cuándo vence**. La pregunta que la gente se hace de verdad —«¿cuánto debo?»— no
tiene respuesta.

Y hay un agujero peor, del lado contrario. Cuando prestas dinero no hay nada que
registrar: no es un gasto, porque vuelve. Así que no se anota, y prestar y
olvidarse es de las formas más comunes de perder plata sin enterarse.

**Una deuda no es un movimiento, es un estado que dura.** Un movimiento ocurre un
día y se acabó; una deuda existe durante meses, cambia de saldo y termina. Por
eso necesita ser una entidad propia y no una etiqueta sobre un gasto.

Esta feature cierra además el segundo ejemplo con el que se pidió la 010: *«me
prestaron 200 mil para pagar esta deuda, pero tengo que devolverlos el martes 7
de septiembre»*. Con las deudas como entidad, eso es saldar una y abrir otra —y
Serva AI ya sabe escribir.

## 2. Alcance

### Dentro

- Deudas en las dos direcciones: lo que debo y lo que me deben.
- Saldo que baja con cada abono, hasta saldarse.
- Fecha de vencimiento opcional, y aviso cuando se acerca o se pasa.
- La contraparte: a quién le debo, quién me debe. Un nombre libre.
- Registrar, abonar y saldar hablando, con Serva AI (spec 010).
- El dinero prestado **no cuenta como ingreso**, y el abono a una deuda propia no
  cuenta dos veces.

### Fuera

- **Intereses, cuotas y amortización.** Serva no es una calculadora financiera, y
  modelar un crédito con interés compuesto es otra aplicación (Art. VIII).
- Recordatorios por correo o notificación. El aviso vive dentro de la
  aplicación, como el resto (spec 007).
- Compartir una deuda con la otra persona, ni conciliar con ella.
- Convertir divisas. La deuda va en la moneda del usuario, como todo.
- Asesorar sobre si conviene endeudarse (Art. II.4).

## 3. Escenarios

### E1 — Anoto lo que debo

**Dado** que le debo 500.000 a mi hermana,
**cuando** creo la deuda con su nombre y el monto,
**entonces** aparece en mi lista de deudas con saldo pendiente de 500.000.

### E2 — Abono una parte

**Dado** que debo 500.000,
**cuando** registro un abono de 200.000,
**entonces** el saldo pasa a 300.000, queda constancia del abono, y el pago
aparece en mi historial como un gasto de «Deudas y créditos».

### E3 — La salda entera

**Dado** que me quedan 300.000 por pagar,
**cuando** abono esos 300.000,
**entonces** la deuda pasa a saldada, deja la lista activa y me lo celebra
brevemente, igual que una meta cumplida (D-031).

### E4 — Anoto lo que me deben

**Dado** que le presté 80.000 a un amigo,
**cuando** lo registro como préstamo a favor,
**entonces** aparece en «me deben», y **no** se resta de mi gasto del mes: el
dinero salió, pero vuelve.

### E5 — Me devuelven

**Dado** que me deben 80.000,
**cuando** registro que me devolvieron,
**entonces** la deuda se salda y el dinero recibido **no** cuenta como ingreso.

### E6 — Me prestan dinero

**Dado** que me prestan 200.000,
**cuando** lo registro,
**entonces** queda una deuda de 200.000 a mi cargo, y esos 200.000 **no** aparecen
como ingreso del mes: entraron, pero no son míos.

### E7 — El vencimiento se acerca

**Dado** que tengo una deuda que vence en tres días,
**cuando** entro a Serva,
**entonces** me avisa, sin regañarme y sin alarma.

### E8 — Se me pasó la fecha

**Dado** que una deuda venció hace una semana y sigue pendiente,
**cuando** miro mis deudas,
**entonces** se distingue de las demás, y el aviso dice cuántos días lleva
vencida, no cuánto he fallado (D-024).

### E9 — Lo hago hablando

**Dado** que le escribo a Serva AI «me prestaron 200 mil, tengo que devolverlos
el 7 de septiembre»,
**cuando** lo procesa,
**entonces** propone crear esa deuda con su fecha, y la crea según las reglas de
la spec 010: confirmando o registrando solo, según lo que yo haya activado.

### E10 — Saldar hablando

**Dado** que tengo una deuda con mi hermana,
**cuando** le digo «ya le pagué a mi hermana lo que le debía»,
**entonces** Serva me muestra cuál va a saldar y **espera mi confirmación**, como
toda acción sobre algo que ya existe (FR-010 de la spec 010).

### E11 — Sin deudas

**Dado** que no tengo ninguna registrada,
**cuando** entro a la pantalla,
**entonces** entiendo para qué sirve y cómo empezar, en lugar de ver una lista
vacía.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El usuario debe poder registrar una deuda con su monto, su dirección —la debo o me la deben—, la contraparte y, opcionalmente, una fecha de vencimiento. |
| FR-002 | Cada deuda debe llevar un saldo pendiente que disminuye con cada abono. |
| FR-003 | El sistema debe registrar cada abono por separado, con su monto y su fecha, de modo que se pueda ver cómo se pagó. |
| FR-004 | Un abono nunca puede dejar el saldo por debajo de cero. El sistema debe rechazarlo diciendo cuánto queda realmente. |
| FR-005 | Al llegar el saldo a cero, la deuda debe pasar a saldada y salir de la lista activa sin desaparecer. |
| FR-006 | Abonar a una deuda propia debe registrar un gasto en «Deudas y créditos»: el dinero salió de verdad. |
| FR-007 | Recibir un préstamo **no** debe contar como ingreso, y prestar dinero **no** debe contar como gasto. Ninguno de los dos altera los totales del período. |
| FR-008 | El cobro de un préstamo a favor —que me devuelvan— tampoco debe contar como ingreso. |
| FR-009 | El sistema debe mostrar, de un vistazo, cuánto se debe en total y cuánto le deben a uno. |
| FR-010 | Una deuda con vencimiento próximo debe avisarse dentro de la aplicación, sin regañar (D-024). |
| FR-011 | Una deuda vencida debe distinguirse de las demás, diciendo cuántos días lleva vencida. |
| FR-012 | Serva AI debe poder crear deudas, abonar y saldarlas, siguiendo las mismas reglas de confirmación de la spec 010: crear puede automatizarse, modificar y saldar confirman siempre. |
| FR-013 | Toda deuda escrita por la IA debe quedar marcada con su origen, como cualquier otra escritura (Art. II.2). |
| FR-014 | Una deuda saldada debe poder reabrirse si se saldó por error. Nada se borra (Art. VII). |
| FR-015 | Las deudas de un usuario no deben ser alcanzables por ninguna consulta de otro (Art. VI.1). |
| FR-016 | Serva AI debe poder responder «¿cuánto debo?» y «¿quién me debe?» con cifras reales. |

## 5. Reglas de negocio

- **RN-001** — Una deuda no es un movimiento. Vive en su propia tabla, con su
  propio ciclo de vida: pendiente, saldada, reabierta.
- **RN-002** — **El dinero prestado no es ingreso ni gasto.** Es un traslado
  entre tu bolsillo y una obligación. Contarlo en los totales haría que un mes en
  que pediste prestado se viera como un mes bueno, que es lo contrario de la
  verdad. Lo que sí cuenta es el **abono**: cuando pagas, ese dinero se fue.
- **RN-003** — Los montos son enteros en la unidad menor, como todo lo demás
  (Art. I). El saldo se deriva del monto original menos los abonos; no hay un
  campo de saldo que se actualice a mano.
- **RN-004** — El vencimiento es una fecha civil, no un instante. Vence el día,
  no la hora.
- **RN-005** — La contraparte es texto libre y solo del usuario. No hay agenda,
  ni contactos, ni relación con otras cuentas de Serva.
- **RN-006** — Serva describe deudas; no aconseja sobre endeudarse, refinanciar
  ni priorizar pagos (Art. II.4).

## 6. Criterios de aceptación

1. Los once escenarios E1–E11 se ejecutan correctamente.
2. El saldo de una deuda siempre es igual al monto original menos la suma de sus
   abonos, comprobado sobre datos reales.
3. Ningún préstamo recibido ni concedido altera los totales del período, y hay
   una prueba que lo demuestra comparando antes y después.
4. Un abono que excede el saldo se rechaza y no deja rastro.
5. Saldar por voz pide confirmación siempre, con automático o sin él.
6. Las deudas de una cuenta no son alcanzables desde otra.
7. Ninguna prueba de la suite requiere un modelo instalado (Art. IV).

## 7. Métricas de éxito

- El usuario puede responder «¿cuánto debo?» en menos de cinco segundos, sin
  hacer cuentas.
- Ninguna deuda saldada aparece como pendiente, ni al revés.
- El usuario registra un préstamo que hizo y lo recupera meses después, que es
  justo el caso que hoy se pierde.
- Los totales del mes siguen significando lo mismo antes y después de introducir
  deudas. Si un usuario nota que su saldo «mejoró» al pedir prestado, el diseño
  falló.

## 8. Riesgo conocido

**El riesgo es que las deudas contaminen los totales.** Serva lleva once
features construidas sobre una idea simple —ingresos menos gastos— y las deudas
son la primera cosa que mueve dinero sin ser ninguna de las dos. Si esa
separación se hace mal, no se rompe la pantalla de deudas: se rompen el resumen,
los presupuestos y los gráficos, que llevan meses siendo correctos.

Por eso el criterio 3 no es una comprobación más: es la que decide si esta
feature se puede entregar.

El segundo riesgo es de alcance. Una deuda pide intereses, y los intereses piden
amortización, y eso pide un simulador. La línea está en el §2: **Serva registra
deudas, no las calcula.** Si alguien necesita saber cuánto pagará de intereses,
necesita otra herramienta.
