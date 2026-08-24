# Spec 006 — Metas de ahorro

- **Estado:** aprobada
- **Creada:** 2026-08-23
- **Depende de:** 001 (movimientos y tipo ahorro)
- **Decisiones aplicables:** D-028, D-029, D-030, D-031, D-024

---

## 1. Contexto y motivación

Ahorrar sin un destino concreto es difícil de sostener. Con uno —una moto, un
viaje— cada aporte significa algo, y cuando dudas si gastarte algo esta noche,
ver la foto de lo que quieres pesa más que ver un número.

**Serva no sabe cuánto tienes ahorrado**: registra ingresos y gastos, no saldos
de cuentas. El progreso avanza con aportes que el usuario registra, porque el
ahorro es una decisión, no un residuo del mes.

## 2. Alcance

### Dentro
- Crear metas con nombre, monto objetivo, imagen propia y fecha objetivo opcional.
- Aportar y retirar dinero de una meta.
- Progreso con proyección: cuándo se alcanza al ritmo actual, o cuánto aportar
  por período si hay fecha.
- Celebración y archivado al alcanzarla.
- Metas simultáneas sin límite.

### Fuera
- Cuentas de ahorro reales o conexión bancaria.
- Aportes automáticos.
- Intereses o rendimientos.
- Recomendar dónde poner el dinero (Art. II.4).

## 3. Escenarios

### E1 — Crear una meta
**Dado** que quiero comprarme una moto,
**cuando** creo la meta con su monto y su foto,
**entonces** aparece con su progreso en cero y lo que falta.

### E2 — Aportar
**Dado** que tengo una meta,
**cuando** registro un aporte,
**entonces** el progreso avanza, el dinero deja de estar disponible en mi saldo y
el movimiento no cuenta como gasto.

### E3 — Ver cuánto falta
**Dado** que llevo varios aportes,
**cuando** miro la meta,
**entonces** veo cuánto llevo, qué porcentaje es y cuándo la alcanzaría al ritmo
actual.

### E4 — Con fecha objetivo
**Dado** que quiero la moto para diciembre,
**cuando** pongo esa fecha,
**entonces** se me dice cuánto tendría que aportar por período para llegar.

### E5 — Retirar
**Dado** que necesito el dinero,
**cuando** retiro de la meta,
**entonces** vuelve a mi disponible y el progreso baja, sin penalización ni
fricción.

### E6 — Alcanzarla
**Dado** que completo el monto objetivo,
**cuando** se registra el último aporte,
**entonces** veo una celebración y la meta pasa a las logradas, sin borrarse.

### E7 — Usar el dinero ahorrado
**Dado** que ya reuní lo de la moto,
**cuando** voy a comprarla,
**entonces** la aplicación me guía a retirar primero y registrar el gasto
después, para no descontar el mismo dinero dos veces.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | Crear metas con nombre, monto objetivo, imagen opcional y fecha objetivo opcional. |
| FR-002 | La imagen la sube el usuario. No se ofrecen iconos genéricos: ver lo que uno quiere es el mecanismo, no la decoración. |
| FR-003 | El tamaño de la imagen está limitado y se rechaza con un mensaje claro si se excede. |
| FR-004 | Se puede aportar a una meta indicando el monto. |
| FR-005 | Un aporte se registra como movimiento de tipo ahorro, descuenta del disponible y no cuenta como gasto. |
| FR-006 | Se puede retirar de una meta en cualquier momento, sin penalización. |
| FR-007 | Un retiro devuelve el dinero al disponible y reduce el progreso. |
| FR-008 | No se puede retirar más de lo aportado a esa meta. |
| FR-009 | Sin fecha objetivo, el sistema estima cuándo se alcanzará al ritmo actual. |
| FR-010 | Con fecha objetivo, el sistema calcula cuánto aportar por período. |
| FR-011 | Al alcanzar el objetivo se muestra una celebración y la meta pasa a logradas. |
| FR-012 | Las metas logradas se conservan y se pueden consultar. |
| FR-013 | Los mensajes de progreso salen de los datos, no de frases genéricas, y nunca reprochan. |
| FR-014 | Si se va con retraso, se ofrece cuánto habría que aportar, no un reproche. |
| FR-015 | Toda meta pertenece a un usuario y ninguna consulta puede devolver las de otro. |
| FR-016 | Al aportar, solo se listan metas activas. |
| FR-017 | Si no hay ninguna meta, se puede crear la primera sin salir del flujo. |

## 5. Reglas de negocio

- **RN-001** — El progreso es la suma de aportes menos retiros de esa meta.
- **RN-002** — Un aporte descuenta del disponible pero **no es un gasto**: queda
  fuera de todo total y desglose de gasto (D-028).
- **RN-003** — Para usar el dinero: primero retiro, después gasto. Registrar el
  gasto sin retirar descontaría el mismo dinero dos veces.
- **RN-004** — Una meta alcanzada se archiva, no se borra.
- **RN-005** — Los aportes se registran desde la meta, no desde Registro Fácil
  (D-031).

## 6. Criterios de aceptación

1. Los siete escenarios E1–E7 se ejecutan correctamente.
2. Un aporte descuenta del saldo sin aparecer en ningún total de gasto.
3. El progreso coincide con la suma de aportes menos retiros.
4. No se puede retirar más de lo que hay en la meta.
5. La proyección al ritmo actual es coherente con los aportes registrados.
6. Ninguna consulta de metas devuelve las de otro usuario.
7. Ningún mensaje reprocha ni juzga.
