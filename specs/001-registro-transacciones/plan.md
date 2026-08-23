# Plan técnico — Feature 001

- **Spec:** [spec.md](./spec.md)
- **Estado:** aprobado
- **Creado:** 2026-08-22
- **Stack:** D-039 · **Despliegue:** D-040 · **Gratuidad:** D-042

---

## 1. Qué decide este plan

Es el plan más pesado del proyecto: aquí se fija cómo se representa el dinero, cómo
se calculan los períodos y cómo se garantiza el aislamiento entre usuarios. Todo lo
demás se construye encima. Un error aquí se paga en cada feature posterior.

## 2. Estructura del proyecto

```
finzen/
├── app/                     Rutas y páginas
│   ├── (auth)/              Acceso — feature 000
│   └── (app)/               Aplicación autenticada
│       ├── page.tsx         Inicio: totales, desglose, botón de Registro Fácil
│       ├── registro/        Registro Fácil
│       └── historial/       Historial-tabla
├── lib/
│   ├── domain/              Lógica pura, sin base de datos ni red
│   │   ├── money.ts         Representación y aritmética de montos
│   │   ├── cycle.ts         Cálculo de períodos
│   │   ├── balance.ts       Totales y agregados
│   │   └── categories.ts    Catálogo fijo
│   ├── db/
│   │   ├── schema.ts        Definición de tablas
│   │   └── queries/         Consultas, todas acotadas por usuario
│   └── actions/             Mutaciones desde la interfaz
├── components/              Componentes de interfaz
└── tests/
    ├── domain/              Pruebas de lógica pura
    ├── db/                  Pruebas de consultas y aislamiento
    └── e2e/                 Escenarios de la spec
```

**La regla que ordena todo esto:** `lib/domain/` no importa nada de `lib/db/`. La
lógica de dinero, períodos y totales se prueba sin levantar una base de datos, en
milisegundos. Es lo que hace viable el ciclo de trabajo (Art. IV.3).

## 3. Representación del dinero

Es la decisión más delicada del plan (Art. I).

```ts
// lib/domain/money.ts
export type Money = {
  readonly cents: number      // entero, unidad mínima de la moneda
  readonly currency: string   // ISO 4217
}
```

- **En la base de datos:** `bigint` para los centavos y `char(3)` para la moneda.
  Nunca `real`, `double precision` ni `float`.
- **En TypeScript:** un tipo propio, no un `number` suelto. Sumar un `Money` con un
  número corriente debe ser un error de compilación, no un fallo silencioso en
  producción.
- **Aritmética:** solo entre montos de la misma moneda. Mezclar monedas lanza error.
- **Formateo:** exclusivamente al mostrar, mediante `Intl.NumberFormat` con la
  moneda y la configuración regional del usuario.

**Límite conocido:** los enteros de JavaScript son exactos hasta unos 9 mil
billones. En centavos de peso colombiano eso son cifras muy por encima de cualquier
finanza personal, así que el rango sobra. Aun así, la conversión desde `bigint` se
valida al leer de la base de datos.

**Entrada del usuario:** el campo de monto se interpreta según la configuración
regional —en Colombia el punto separa miles y la coma decimales— y se convierte a
centavos con una función probada contra casos límite. Nunca con `parseFloat`.

## 4. Períodos y ciclos

```ts
// lib/domain/cycle.ts
export type CycleConfig =
  | { kind: 'calendar-month' }
  | { kind: 'monthly'; day: number }        // 1–31
  | { kind: 'semi-monthly'; days: [number, number] }
  | { kind: 'weekly'; weekday: number }
  | { kind: 'every-n-days'; n: number; anchor: CivilDate }

export function periodFor(config: CycleConfig, date: CivilDate): Period
export function previousPeriod(config: CycleConfig, period: Period): Period
export function nextPeriod(config: CycleConfig, period: Period): Period
```

Módulo puro. En esta feature solo se expone `calendar-month`, pero las demás formas
se implementan y prueban desde ya: son la parte cara de añadir después (D-025).

**Reglas implementadas:**
- Día inexistente en el mes → último día del mes.
- Sin desplazamiento por fines de semana ni festivos.
- Períodos contiguos, sin solapes ni huecos.

**Fechas civiles, no instantes.** La fecha de un movimiento es un día del
calendario, no un momento en el tiempo: si alguien registra un gasto el 31 de
agosto, es el 31 de agosto independientemente de dónde esté. Se almacena como
`date` en Postgres y se maneja como fecha civil en el dominio. Solo `createdAt` y
`updatedAt` son instantes reales, en `timestamptz`.

Esta distinción evita el error clásico de que un movimiento cambie de mes —y por
tanto de período y de todos los totales— según la zona horaria del navegador.

## 5. Modelo de datos

```
users                (feature 000)
  id, email, name, country, currency, cycle_config, created_at

categories           catálogo fijo, poblado por semilla
  id, key, name, kind (expense|income), color, sort_order

transactions
  id                 uuid
  user_id            → users.id, NOT NULL
  type               expense | income | saving
  amount_cents       bigint, NOT NULL, CHECK (amount_cents > 0)
  currency           char(3), NOT NULL
  category_id        → categories.id, NULL solo si type = 'saving'
  occurred_on        date, NOT NULL, CHECK (occurred_on <= current_date)
  description        text
  description_short  text
  status             active | voided
  voided_at          timestamptz
  saving_goal_id     uuid, NULL     — feature 006
  saving_direction   contribution | withdrawal, NULL   — feature 006
  created_at         timestamptz
  updated_at         timestamptz
```

**Por qué las columnas de ahorro existen ya:** D-028 exige que el modelo contemple
los tres tipos desde el inicio. Añadir el tipo después obligaría a migrar la tabla y
a revisar cada consulta de totales ya escrita. Quedan nulas y sin interfaz hasta la
feature 006.

**Restricciones en la base de datos, no solo en el código.** El monto positivo y la
fecha no futura son `CHECK`. Si un error de programación intenta escribir un monto
negativo, la base lo rechaza. La validación en la aplicación es para dar buenos
mensajes; la de la base es para que sea imposible.

**Índices:**

| Índice | Para qué |
|---|---|
| `(user_id, occurred_on DESC)` | Historial y filtros por período |
| `(user_id, category_id, occurred_on)` | Desglose por categoría |
| `(user_id, status)` | Excluir anulados en todo agregado |

Se definen ahora, no cuando algo vaya lento (D-041.2).

**Anulación:** `status = 'voided'` más `voided_at`. Nunca `DELETE` (Art. VII).

## 6. Aislamiento entre usuarios

Es el requisito más serio del proyecto (Art. VI.1) y no se confía a la disciplina.

1. **Ninguna función de `lib/db/queries/` existe sin recibir `userId`.** No hay
   forma de invocarla sin él: es un parámetro obligatorio y tipado.
2. **El `userId` sale siempre de la sesión del servidor**, jamás de un parámetro
   enviado por el cliente. Un identificador que llega del navegador es una
   sugerencia, no una identidad.
3. **Prueba automática de aislamiento:** se crean dos usuarios con datos y se
   comprueba que ninguna consulta del módulo devuelve datos del otro. Esta prueba
   forma parte del oráculo y su fallo detiene todo.

## 7. Cálculo de totales

Los agregados se resuelven en SQL, no en el cliente ni en memoria (D-041.5):

```sql
SELECT type, category_id, SUM(amount_cents)::bigint
FROM transactions
WHERE user_id = $1
  AND status = 'active'
  AND occurred_on BETWEEN $2 AND $3
GROUP BY type, category_id;
```

El saldo se deriva de ahí según RN-002, con los movimientos de ahorro tratados
aparte. **No existe ninguna columna de saldo** (Art. VII.2, FR-025).

La conversión final a `Money` y la aplicación de la fórmula del saldo ocurren en
`lib/domain/balance.ts`, que se prueba con datos en memoria, sin base de datos.

## 8. Interfaz

- **Componentes de shadcn/ui** sobre Tailwind: accesibles y sin diseñar desde cero,
  que importa dado que no hay referencias visuales definidas.
- **Registro Fácil**: campo de monto con foco automático y formateo progresivo,
  selector de tipo con ambas opciones visibles, categoría, fecha con «Hoy» por
  defecto, y contador de sesión.
- **Historial-tabla**: edición en línea, carga incremental al desplazarse.
- **Confirmación con deshacer** tras cada registro (FR-012).
- **Diseño para escritorio, sin romperse en móvil** (D-047).

**Mutaciones mediante Server Actions**, no rutas de API: menos código, validación
con Zod en el servidor y el `userId` tomado de la sesión.

## 9. El oráculo de verificación

Un solo comando decide si el trabajo está bien (Art. IV.1):

```bash
npm run verify
```

Encadena, en este orden:

| Paso | Qué comprueba |
|---|---|
| `tsc --noEmit` | Tipos correctos en todo el proyecto |
| `eslint` | Reglas de estilo y errores comunes |
| `vitest run` | Lógica pura: dinero, ciclos, totales |
| `vitest run --dir tests/db` | Consultas y aislamiento entre usuarios |
| `playwright test` | Los nueve escenarios de la spec, de extremo a extremo |

**Pruebas que deben existir sí o sí**, porque protegen las decisiones caras de este
plan:

1. Ningún tipo de coma flotante aparece en el esquema de datos.
2. La aritmética de montos es exacta en casos con decimales y en sumas largas.
3. Los períodos son correctos en meses de 28, 29, 30 y 31 días.
4. Los períodos consecutivos no se solapan ni dejan huecos.
5. Los totales coinciden con la suma manual de los movimientos activos.
6. Los movimientos anulados no entran en ningún total.
7. Ninguna consulta devuelve datos de otro usuario.
8. Un movimiento creado desde Registro Fácil y otro desde la tabla son idénticos en
   el modelo de datos.

**Este comando se construye antes que la primera funcionalidad.** Sin él no hay
ciclo de trabajo, solo revisión manual disfrazada.

## 10. Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Agotar conexiones a la base de datos desde funciones sin estado | Usar el agrupador de conexiones desde el inicio (D-041.1) |
| Zona horaria desplazando movimientos de período | Fechas civiles en `date`, nunca instantes (sección 4) |
| Pérdida de precisión al leer `bigint` | Validación al convertir, con el rango comprobado |
| Suspensión de la base gratuita tras inactividad | Aceptado: primera consulta más lenta (D-042) |
| Escribir consultas sin filtro de usuario | Imposible por firma de función, verificado por prueba (sección 6) |

## 11. Orden de construcción

1. Proyecto, base de datos y **el comando de verificación funcionando en vacío**.
2. `lib/domain/money.ts` con sus pruebas.
3. `lib/domain/cycle.ts` con sus pruebas de casos borde.
4. Esquema de datos, migraciones y catálogo de categorías.
5. Consultas acotadas por usuario y prueba de aislamiento.
6. `lib/domain/balance.ts` y los totales.
7. Registro Fácil.
8. Historial-tabla.
9. Pantalla de inicio con totales y desglose.
10. Escenarios de extremo a extremo.

El detalle por tarea va en `tasks.md`.
