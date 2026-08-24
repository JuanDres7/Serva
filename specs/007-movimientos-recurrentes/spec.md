# Spec 007 — Movimientos recurrentes

- **Estado:** aprobada
- **Creada:** 2026-08-23
- **Depende de:** 001 (movimientos), 004 (zona horaria del usuario)
- **Decisiones aplicables:** D-025, D-032, D-033, D-035

---

## 1. Contexto y motivación

El arriendo, las suscripciones y el salario se repiten cada mes. Registrarlos a
mano una y otra vez es trabajo que la aplicación puede evitar, y es justo el tipo
de fricción que hace que alguien deje de registrar.

Hay un segundo efecto, menos obvio y más valioso: con los recurrentes definidos,
el historial se llena casi solo. Eso da antes materia prima a la categorización y
hace que los totales signifiquen algo desde el primer período.

**Serva no está conectada a ningún banco**, así que no puede saber si un cobro
ocurrió. Por eso pregunta en lugar de asumir.

## 2. Alcance

### Dentro
- Definir movimientos que se repiten, de gasto o de ingreso.
- Dos formas de periodicidad: mensual por día, y cada N días.
- Confirmación de cada cobro cuando llega su fecha.
- Ajuste del monto al confirmar, con opción de que el cambio sea permanente.
- Reprogramar un cobro que no ocurrió.
- Eliminar un recurrente.

### Fuera
- Conexión bancaria o detección automática de cobros.
- Registro automático sin confirmación del usuario.
- Recurrentes de tipo ahorro: eso son aportes a metas (feature 006).
- Recordatorios fuera de la aplicación (D-035).

## 3. Escenarios

### E1 — Definir un recurrente
**Dado** que pago arriendo todos los meses,
**cuando** lo defino con su monto, categoría y día,
**entonces** queda guardado y sé cuándo será el próximo cobro.

### E2 — Confirmar un cobro
**Dado** que llegó la fecha de un cobro,
**cuando** entro a la aplicación,
**entonces** lo veo entre los pendientes y puedo confirmarlo de un toque, con lo
que se registra como movimiento normal.

### E3 — El monto cambió
**Dado** que la suscripción subió de precio,
**cuando** confirmo el cobro con un monto distinto,
**entonces** se me pregunta si el cambio vale solo para esta vez o de ahí en
adelante.

### E4 — El cobro no ocurrió
**Dado** que el cobro no se hizo efectivo,
**cuando** indico que no,
**entonces** puedo elegir la nueva fecha y el recurrente queda reprogramado.

### E5 — Cancelé el servicio
**Dado** que di de baja la suscripción,
**cuando** elimino el recurrente,
**entonces** deja de aparecer, sin que se borren los movimientos que ya generó.

### E6 — Varios pendientes a la vez
**Dado** que llevo días sin entrar y hay cuatro cobros vencidos,
**cuando** abro la aplicación,
**entonces** los veo juntos en una lista y los resuelvo en el orden que quiera,
pudiendo ignorarlos y seguir usando la aplicación.

### E7 — Un ingreso recurrente
**Dado** que me pagan el mismo día cada mes,
**cuando** defino mi salario como recurrente,
**entonces** al confirmarlo se registra como ingreso.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir definir un movimiento recurrente con monto, tipo, categoría, descripción y periodicidad. |
| FR-002 | La periodicidad admite dos formas: mensual en un día concreto, y cada N días. |
| FR-003 | Si el día configurado no existe en el mes, se usa el último día del mes. |
| FR-004 | Los recurrentes no se desplazan por fines de semana ni festivos. |
| FR-005 | Al llegar su fecha, el recurrente aparece como pendiente de confirmación. |
| FR-006 | Los pendientes se muestran como una lista resoluble en cualquier orden, nunca como diálogos encadenados. |
| FR-007 | Los pendientes nunca bloquean el uso de la aplicación. |
| FR-008 | Confirmar un pendiente registra un movimiento normal, idéntico a uno creado a mano. |
| FR-009 | El monto mostrado en un pendiente es el del último cobro confirmado, y es editable. |
| FR-010 | Al editar el monto se pregunta si el cambio vale solo para esa vez o de ahí en adelante, con «de ahora en adelante» preseleccionado. |
| FR-011 | El sistema debe permitir indicar que un cobro no ocurrió y reprogramarlo a otra fecha. |
| FR-012 | El sistema debe permitir eliminar un recurrente sin borrar los movimientos que ya generó. |
| FR-013 | La opción de eliminar no debe estar al mismo nivel que confirmar: es destructiva y no debe tocarse por accidente. |
| FR-014 | El saludo de la pantalla de inicio debe indicar cuántos cobros hay por confirmar. |
| FR-015 | Todo recurrente pertenece a un usuario y ninguna consulta puede devolver los de otro. |

## 5. Reglas de negocio

- **RN-001** — Un recurrente es de gasto o de ingreso. El ahorro se aporta a metas.
- **RN-002** — La próxima fecha se calcula desde la última confirmación, no desde
  la definición: así una reprogramación desplaza también las siguientes.
- **RN-003** — Un cobro mensual **no** es cada 30 días. Contar días desfasaría la
  fecha casi una semana al cabo de un año (D-032).
- **RN-004** — Un recurrente eliminado desaparece de la lista, pero los
  movimientos que generó permanecen: son gastos que de verdad ocurrieron.
- **RN-005** — Confirmar es siempre una acción del usuario. Serva no registra
  movimientos por su cuenta.

## 6. Criterios de aceptación

1. Los siete escenarios E1–E7 se ejecutan correctamente.
2. El cálculo de la próxima fecha es correcto en meses de 28, 29, 30 y 31 días.
3. Un cobro mensual del día 5 cae siempre en día 5, sin desfase, a lo largo de un
   año completo.
4. Un movimiento generado por confirmación es indistinguible de uno creado a mano.
5. Eliminar un recurrente no altera ningún total histórico.
6. Ninguna consulta de recurrentes devuelve los de otro usuario.
7. Con pendientes sin resolver, el resto de la aplicación sigue siendo usable.
