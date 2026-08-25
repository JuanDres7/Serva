# Plan técnico — Feature 011

- **Spec:** [spec.md](./spec.md)
- **Creado:** 2026-08-24
- **Valida contra:** constitución v2.0.0, artículos I, II, III, IV, VI y VII

---

## 1. La decisión que gobierna todo el diseño

**Una deuda no es un movimiento, y el dinero que la mueve no siempre lo es
tampoco.**

Ahí está toda la dificultad. Serva lleva once features construidas sobre una idea
de dos términos —ingresos menos gastos— y las deudas son la primera cosa que hace
que entre o salga dinero **sin ser ninguno de los dos**. Si te prestan 200.000, el
dinero está en tu bolsillo y no es tuyo.

La tentación es resolverlo con una bandera: un campo `esPrestamo` en
`transactions` que los cálculos ignoren. Se descarta porque esa bandera habría que
recordarla en `computeTotals`, en los presupuestos, en los gráficos, en la
exportación y en las seis herramientas del asistente. Olvidarla en uno solo
produce una cifra equivocada sin error visible.

**La solución ya existe en el proyecto.** El ahorro tiene exactamente el mismo
problema: aportar a una meta mueve dinero real sin ser un gasto. Se resolvió con
un tercer tipo de movimiento, `saving`, y `computeTotals` lo trata en su propio
término:

```ts
const savedNet = subtract(contributions, withdrawals)
const balance  = subtract(subtract(income, expense), savedNet)
```

Las deudas siguen ese camino: **un cuarto tipo, `debt`**, con dirección propia.
No es una bandera que haya que recordar; es un valor del enum que TypeScript
obliga a contemplar en cada `switch` que ya existe.

### La tabla de qué cuenta y qué no

| Lo que pasa | Movimiento | ¿Altera ingresos o gastos? |
|---|---|---|
| Me prestan 200.000 | `debt` / `recibido` | **No** |
| Abono 50.000 de lo que debo | `expense` en «Deudas y créditos» | **Sí, es gasto** |
| Presto 80.000 | `debt` / `concedido` | **No** |
| Me devuelven 80.000 | `debt` / `cobrado` | **No** |

Es la asimetría que pidió la spec, y tiene sentido: el préstamo es un traslado, el
abono es dinero que se fue de verdad.

## 2. Modelo de datos

### 2.1 `debts` — la entidad

```
id            uuid PK
userId        text NOT NULL → user.id ON DELETE CASCADE
direction     debt_direction NOT NULL     -- 'owed_by_me' | 'owed_to_me'
counterparty  text NOT NULL               -- «mi hermana». Texto libre (RN-005)
originalCents bigint NOT NULL             -- entero, unidad menor (Art. I)
currency      char(3) NOT NULL
description   text
dueOn         date                        -- fecha civil, opcional (RN-004)
settledAt     timestamptz                 -- NULL mientras siga pendiente
isSample      boolean NOT NULL DEFAULT false
createdBy     movement_origin NOT NULL DEFAULT 'user'
assistantWriteId uuid → assistant_writes(id) ON DELETE SET NULL
createdAt, updatedAt
```

**No hay columna de saldo.** El saldo se deriva: monto original menos la suma de
sus abonos. Es la misma regla que ya gobierna los balances del usuario —«los
saldos se derivan del historial»— y evita el fallo clásico de un contador que se
desincroniza de los hechos que lo alimentan.

`settledAt` es marca de tiempo y no booleano, por el mismo motivo que
`autoRegisterEnabledAt` en la feature 010: registra **cuándo**, y reabrir es
ponerlo a `NULL` (FR-014).

### 2.2 `debt_payments` — los abonos

```
id            uuid PK
debtId        uuid NOT NULL → debts(id) ON DELETE CASCADE
transactionId uuid → transactions(id) ON DELETE SET NULL
amountCents   bigint NOT NULL
paidOn        date NOT NULL
createdAt
```

`transactionId` es el puente hacia el movimiento que generó el abono, cuando lo
hay. Con `SET NULL` para que anular el movimiento no borre el registro del abono:
son dos hechos distintos y el historial no se reescribe (Art. VII).

### 2.3 `transactions` — el cuarto tipo

```
movement_type:      'expense' | 'income' | 'saving' | 'debt'      ← nuevo valor
debt_flow (nuevo):  'received' | 'lent' | 'collected'
debtFlow            debt_flow NULL      -- solo en los de tipo 'debt'
debtId              uuid NULL → debts(id) ON DELETE SET NULL
```

**Añadir un valor al enum es lo que hace segura la feature.** TypeScript señalará
cada `switch` sobre `movementType` que no lo contemple, y son varios: totales,
gráficos, exportación, historial, herramientas del asistente. Esa lista de errores
de compilación **es la lista de sitios que había que revisar**, y es justo lo que
una bandera no habría dado.

Nota: el `CHECK` existente que prohíbe categoría en los movimientos de ahorro debe
extenderse a los de deuda. Un préstamo recibido no tiene categoría de gasto.

### 2.4 Migración

Un valor nuevo en un enum de PostgreSQL se añade con `ALTER TYPE ... ADD VALUE`,
que **no puede correr dentro de una transacción** en versiones anteriores a la 12.
Drizzle genera el borrador; hay que leerlo antes de aplicarlo, como siempre y como
ya hizo falta en la `0003`.

Todas las columnas nuevas son anulables. Ninguna reescribe filas existentes.

## 3. El dominio

### `lib/domain/deudas.ts`

Puro, sin base de datos, como el resto de `lib/domain/`:

```ts
saldoDe(deuda, abonos): Money          // original − suma de abonos
estaSaldada(deuda, abonos): boolean
puedeAbonar(deuda, abonos, monto): Resultado   // FR-004
diasParaVencer(deuda, hoy): number | null
estadoDeVencimiento(deuda, abonos, hoy): 'al-dia' | 'cerca' | 'vencida' | 'saldada'
resumenDeDeudas(deudas, abonos): { debo, meDeben }   // FR-009
```

`puedeAbonar` devuelve un resultado y no lanza: un abono que excede el saldo es un
caso esperado, no una excepción, y el usuario tiene que poder leer cuánto queda
realmente.

### El cambio en `balance.ts`

`PeriodAggregates` gana los términos de deuda, y `computeTotals` los deja
**fuera** de `balance`. Ese es el punto entero de la feature, y es una línea:

```ts
// Los préstamos no entran en el balance: entró o salió dinero, pero no es
// ingreso ni gasto (RN-002). Se exponen aparte para poder mostrarlos.
const balance = subtract(subtract(income, expense), savedNet)
```

## 4. Las escrituras del asistente

Se añaden tres herramientas a las nueve que ya existen, con el mismo patrón
`proponer*` y pasando por la misma puerta (`lib/domain/puerta.ts`):

| Herramienta | Tipo para la puerta | ¿Puede ejecutarse sola? |
|---|---|---|
| `proponerDeuda` | `crear` | Sí, con el automático activo |
| `proponerAbono` | `crear` | Sí |
| `proponerSaldarDeuda` | `corregir` | **Nunca.** Confirma siempre |

Saldar entra como `corregir` y no como `crear` a propósito: modifica algo que ya
existe, y esa es exactamente la clase de acción que la puerta obliga a confirmar
(FR-010 de la spec 010). No hace falta añadir ninguna regla nueva a la puerta —la
que ya tiene lo cubre—, y esa es la señal de que la abstracción estaba bien
puesta.

`proponerSaldarDeuda` no recibe un identificador del modelo: recibe el nombre de
la contraparte y el sistema busca. Igual que `proponerAnulacion`.

La lista de herramientas permitidas de `tests/db/tools.test.ts` pasa de nueve a
doce, lo que obliga a que alguien lea la lista y decida.

## 5. La interfaz

Una pantalla nueva, `/deudas`, y una entrada en la navegación entre Metas y
Recurrentes: son vecinas conceptuales —cosas que duran y tienen saldo—.

Reutiliza lo que ya existe en lugar de inventar: la tarjeta con barra de progreso
de las metas, el estado vacío de `components/vacio.tsx`, los tokens de D-062 y el
lenguaje de movimiento de D-065. Dos listas, «Debo» y «Me deben», cada una con su
total arriba.

El aviso de vencimiento sigue la regla de D-024: **informa, no regaña**. «Vence en
3 días», «lleva 7 días vencida». Nunca «te retrasaste».

## 6. Degradación

Sin proveedor de IA, las deudas funcionan enteras a mano. Es la misma regla de
siempre: `lib/ai/` es opcional y borrarlo no rompe nada más.

## 7. Verificación sin modelo

| Capa | Qué se prueba | ¿Necesita modelo? |
|---|---|---|
| `deudas.ts` | Saldo, vencimiento, abono que excede | No — funciones puras |
| Consultas | Que el saldo derivado coincida con los abonos reales | No |
| **Totales** | **Que ningún préstamo altere ingresos, gastos ni balance** | No |
| Aislamiento | Que las deudas de una cuenta no se alcancen desde otra | No |
| Extracción | Que de «me prestaron 200 mil» salga la deuda correcta | Sí |

La tercera fila es la que decide si la feature se puede entregar. Su prueba tiene
una forma concreta: **medir los totales, registrar un préstamo, volver a medirlos
y exigir que sean idénticos.** No comprueba que la pantalla de deudas funcione;
comprueba que las once features anteriores siguen diciendo la verdad.

Lo que necesita modelo se añade al banco de frases de `npm run evaluar`, fuera de
`verify`.

## 8. Lo que este plan valida contra la constitución

| Artículo | Cómo se cumple |
|---|---|
| I — Dinero entero | `originalCents` y `amountCents` son `bigint`. El saldo se deriva restando enteros |
| II.1 — La IA sugiere | Las tres herramientas nuevas pasan por la misma puerta; saldar confirma siempre |
| II.2 — Origen y confianza | `createdBy` y `assistantWriteId` en `debts`, como en `transactions` |
| III.1 — Validación por esquema | Zod antes de escribir, con la dirección y el tipo como enumerados cerrados |
| III.3 — Conjunto cerrado | Doce herramientas enumeradas, ninguna con SQL |
| IV — Verificabilidad | Todo salvo la extracción corre sin modelo |
| VI.1 — Aislamiento | `userId` en la firma de cada consulta, aplicado en el `WHERE` |
| VII — Historial inmutable | Saldar es una marca de tiempo, no un borrado. Reabrir la quita |

## 9. Lo que este plan deja abierto para `tasks.md`

- El orden de construcción y el criterio de verificación de cada paso.
- Si el resumen muestra las deudas, y con qué peso. Añadir un cuarto número a la
  franja de tres podría restarle claridad a lo que ya funciona.
- Cómo se ve una deuda saldada al volver a la pantalla: presente pero apagada, o
  recogida bajo un desplegable.
- Si la exportación a Excel lleva una hoja de deudas (spec 009).
