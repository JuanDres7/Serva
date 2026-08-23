/**
 * Esquema de datos de Finzen.
 *
 * Reglas que rigen este esquema:
 * - Los montos son enteros de 64 bits en la unidad mínima de la moneda. Ningún
 *   tipo de coma flotante, en ninguna columna (Art. I).
 * - Nada se borra: la anulación es un estado (Art. VII).
 * - Toda tabla con datos de usuario lleva su propietario (Art. VI.1).
 * - Las restricciones viven también en la base, no solo en el código: la
 *   validación de la aplicación da buenos mensajes, la de la base hace imposible
 *   el dato inválido.
 */

import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  customType,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export * from './auth-schema'

/** Los tres tipos de movimiento (D-028). */
export const movementType = pgEnum('movement_type', ['expense', 'income', 'saving'])

/** Anulación como estado, nunca borrado (Art. VII). */
export const movementStatus = pgEnum('movement_status', ['active', 'voided'])

/** Un ahorro entra a una meta o sale de ella (D-028). */
export const savingDirection = pgEnum('saving_direction', ['contribution', 'withdrawal'])

/**
 * Categorías como enumerado y no como tabla.
 *
 * El catálogo es fijo y vive en `lib/domain/categories.ts` (D-021). Replicarlo en
 * una tabla crearía dos fuentes de verdad que se desincronizan; como enumerado, la
 * base rechaza cualquier valor ajeno al catálogo. Una prueba verifica que ambas
 * listas coinciden exactamente.
 */
export const categoryKey = pgEnum('category_key', [
  'groceries',
  'eating_out',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'subscriptions',
  'shopping',
  'pets',
  'debt',
  'other_expense',
  'salary',
  'business',
  'gifts',
  'refunds',
  'other_income',
])

/** Cómo se categorizó un movimiento (spec 002, FR-006). */
export const categorySource = pgEnum('category_source', [
  'user',
  'keywords',
  'similarity',
  'model',
])

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    type: movementType('type').notNull(),

    /** Entero en la unidad mínima de la moneda. Nunca coma flotante (Art. I). */
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    /** Nula solo cuando el movimiento es de tipo ahorro: su destino es la meta. */
    category: categoryKey('category'),
    categorySource: categorySource('category_source').notNull().default('user'),

    /** Fecha civil: un día del calendario, no un instante (plan 001, §4). */
    occurredOn: date('occurred_on').notNull(),

    /** Lo que escribió el usuario, tal cual. */
    description: text('description'),
    /** Versión corta y legible para el historial (D-012). */
    descriptionShort: text('description_short'),

    status: movementStatus('status').notNull().default('active'),
    voidedAt: timestamp('voided_at', { withTimezone: true }),

    /**
     * Datos de ejemplo, eliminables en bloque (D-046).
     *
     * Quien pruebe la aplicación y decida usarla en serio debe poder partir de
     * cero: movimientos inventados mezclados con los suyos falsearían todos sus
     * totales y contaminarían lo que la IA aprendió.
     */
    isSample: boolean('is_sample').notNull().default(false),

    // Previsto desde ahora para no migrar después (D-028). Sin interfaz hasta la
    // feature 006.
    savingGoalId: uuid('saving_goal_id'),
    savingDirection: savingDirection('saving_direction'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Historial y filtros por período.
    index('transactions_user_date_idx').on(table.userId, table.occurredOn.desc()),
    // Desglose por categoría.
    index('transactions_user_category_idx').on(
      table.userId,
      table.category,
      table.occurredOn,
    ),
    // Excluir anulados en todo agregado.
    index('transactions_user_status_idx').on(table.userId, table.status),

    check('amount_positive', sql`${table.amountCents} > 0`),
    check('date_not_future', sql`${table.occurredOn} <= CURRENT_DATE`),
    // Un ahorro va a una meta; un gasto o ingreso, a una categoría.
    check(
      'category_matches_type',
      sql`(${table.type} = 'saving' AND ${table.category} IS NULL)
          OR (${table.type} <> 'saving' AND ${table.category} IS NOT NULL)`,
    ),
  ],
)

/**
 * Configuración de cada usuario.
 *
 * En tabla aparte y no como columnas del usuario porque el esquema de
 * autenticación lo genera Better Auth y se regenera: lo añadido a mano allí se
 * perdería.
 */
export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),

  displayName: text('display_name').notNull(),
  country: char('country', { length: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  locale: text('locale').notNull(),
  timeZone: text('time_zone').notNull(),

  /** Ciclo de períodos. Mes calendario por defecto (D-025, D-027). */
  cycleConfig: jsonb('cycle_config').notNull().default({ kind: 'calendar-month' }),

  /**
   * Cuándo terminó la configuración inicial.
   *
   * Mientras sea nulo, la persona no ha elegido nombre ni país y opera con
   * valores provisionales: la aplicación la lleva a la bienvenida.
   */
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TransactionRow = typeof transactions.$inferSelect
export type NewTransactionRow = typeof transactions.$inferInsert
export type UserSettingsRow = typeof userSettings.$inferSelect

/** Nivel de la cascada que produjo la sugerencia (D-013). */
export const categorizationMechanism = pgEnum('categorization_mechanism', [
  'keywords',
  'similarity',
  'model',
  'none',
])

/**
 * Historial de aprendizaje (D-015).
 *
 * Se captura desde el primer día aunque todavía no se explote del todo: es el
 * insumo de toda personalización futura y de cualquier medición de acierto, y no
 * hay forma de reconstruirlo hacia atrás. Qué habría propuesto la IA y qué
 * corrigió el usuario es información que, si no se guarda en el momento, se
 * pierde para siempre.
 */
export const categorizationLog = pgTable(
  'categorization_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /** Nulo mientras el usuario no haya confirmado el movimiento. */
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'cascade',
    }),

    /** Lo que escribió la persona, tal cual. */
    inputText: text('input_text').notNull(),
    /** Forma canónica, para poder comparar entre sí descripciones distintas. */
    normalizedText: text('normalized_text').notNull(),
    keywords: text('keywords').array().notNull().default([]),

    suggestedCategory: categoryKey('suggested_category'),

    /**
     * Único campo de coma flotante del sistema, y es correcto que lo sea. El
     * Artículo I prohíbe la coma flotante **para montos**, donde un céntimo
     * perdido corrompe el historial. Una confianza es aproximada por naturaleza:
     * 0,7341 y 0,7342 significan lo mismo.
     */
    confidence: real('confidence'),

    mechanism: categorizationMechanism('mechanism').notNull(),

    /** Categoría con la que quedó el movimiento tras la decisión del usuario. */
    finalCategory: categoryKey('final_category'),
    wasCorrected: boolean('was_corrected').notNull().default(false),

    latencyMs: integer('latency_ms'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Búsqueda del nivel 1: solapamiento de términos dentro de un usuario.
    index('categorization_user_keywords_idx').using('gin', table.keywords),
    index('categorization_user_idx').on(table.userId, table.finalCategory),
    // Para medir el acierto a lo largo del tiempo.
    index('categorization_user_date_idx').on(table.userId, table.createdAt),
  ],
)

export type CategorizationLogRow = typeof categorizationLog.$inferSelect

/**
 * Movimientos recurrentes (spec 007).
 *
 * Finzen no está conectada a ningún banco, así que no puede saber si un cobro
 * ocurrió: guarda cuándo toca el próximo y pregunta al usuario cuando llega.
 */
export const recurringMovements = pgTable(
  'recurring_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /** Gasto o ingreso. El ahorro se aporta a metas, no se programa. */
    type: movementType('type').notNull(),

    /** Monto del último cobro confirmado: es lo que se propone la próxima vez. */
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    category: categoryKey('category').notNull(),
    description: text('description').notNull(),

    /** Periodicidad: mensual en un día, o cada N días (D-032). */
    schedule: jsonb('schedule').notNull(),

    /** Fecha del próximo cobro pendiente de confirmar. */
    nextDueOn: date('next_due_on').notNull(),
    /** Última vez que se confirmó un cobro de este recurrente. */
    lastConfirmedOn: date('last_confirmed_on'),

    isSample: boolean('is_sample').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Los pendientes se consultan en cada visita a la aplicación.
    index('recurring_user_due_idx').on(table.userId, table.nextDueOn),

    check('recurring_amount_positive', sql`${table.amountCents} > 0`),
    // El ahorro va a metas: programarlo aquí no tendría destino.
    check('recurring_not_saving', sql`${table.type} <> 'saving'`),
  ],
)

export type RecurringRow = typeof recurringMovements.$inferSelect

/**
 * Imagen guardada en la propia base.
 *
 * Para un prototipo evita depender de un servicio de almacenamiento externo:
 * quien clone el repositorio no necesita configurar nada, y no hay claves ni
 * cuentas de terceros. Con el límite de tamaño de la aplicación, el coste es
 * despreciable. Si algún día crece, se mueve a almacenamiento de objetos sin
 * tocar el resto del modelo.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
})

/**
 * Metas de ahorro (spec 006).
 *
 * El progreso no se guarda: se deriva de los movimientos de tipo ahorro
 * asociados, igual que los saldos se derivan del historial (Art. VII.2).
 */
export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    targetCents: bigint('target_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    /** Imagen propia del usuario. Es el mecanismo, no la decoración (D-029). */
    image: bytea('image'),
    imageType: text('image_type'),

    /** Opcional: con ella se calcula cuánto aportar por período (FR-010). */
    targetDate: date('target_date'),

    /** Cuándo se alcanzó. Las metas logradas se archivan, no se borran. */
    achievedAt: timestamp('achieved_at', { withTimezone: true }),

    isSample: boolean('is_sample').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('goals_user_idx').on(table.userId, table.achievedAt),
    check('goal_target_positive', sql`${table.targetCents} > 0`),
  ],
)

export type SavingsGoalRow = typeof savingsGoals.$inferSelect
