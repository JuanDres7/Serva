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
  char,
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
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

    /** Datos de ejemplo, eliminables en bloque (D-046). */
    isSample: text('is_sample'),

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

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TransactionRow = typeof transactions.$inferSelect
export type NewTransactionRow = typeof transactions.$inferInsert
export type UserSettingsRow = typeof userSettings.$inferSelect
