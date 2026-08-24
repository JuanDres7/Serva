/**
 * Consultas de movimientos.
 *
 * **Ninguna función de este módulo existe sin recibir `userId`.** No es una
 * convención: es la firma. No hay forma de invocar ninguna de estas funciones sin
 * decir de quién son los datos, y el identificador debe venir siempre de la sesión
 * del servidor —`lib/session.ts`—, nunca de un parámetro enviado por el navegador
 * (Art. VI.1, plan 001 §6).
 *
 * Un fallo de aislamiento en una aplicación de finanzas expone lo que alguien
 * gasta en salud, en deudas o en su vida privada. Es el único fallo de este
 * proyecto del que no se vuelve.
 */

import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { transactions, type TransactionRow } from '@/lib/db/schema'
import { type MovementKind, isValidFor } from '@/lib/domain/categories'
import type { Period } from '@/lib/domain/cycle'
import { toISO } from '@/lib/domain/civil-date'
import type { PeriodAggregates, CategoryAmount } from '@/lib/domain/balance'

export type MovementType = 'expense' | 'income' | 'saving'

export const transactionInputSchema = z
  .object({
    type: z.enum(['expense', 'income', 'saving']),
    amountCents: z.number().int().positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    category: z.string().nullable().optional(),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    description: z.string().trim().max(500).nullable().optional(),
    descriptionShort: z.string().trim().max(120).nullable().optional(),
    categorySource: z
      .enum(['user', 'keywords', 'similarity', 'model'])
      .optional()
      .default('user'),
    /**
     * Quién escribió el movimiento (spec 010, FR-011). Por defecto la persona:
     * todo lo que no venga marcado explícitamente como del asistente lo es.
     */
    createdBy: z.enum(['user', 'assistant']).optional().default('user'),
    /** La escritura del asistente de la que salió, para poder rastrearla. */
    assistantWriteId: z.string().uuid().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'saving') {
      if (value.category) {
        ctx.addIssue({
          code: 'custom',
          path: ['category'],
          message: 'Un ahorro va a una meta, no a una categoría',
        })
      }
      return
    }
    if (!value.category) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: 'Falta la categoría',
      })
      return
    }
    if (!isValidFor(value.category, value.type as MovementKind)) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: `La categoría "${value.category}" no corresponde a un movimiento de tipo ${value.type}`,
      })
    }
  })

/**
 * Lo que se le pasa a `createTransaction`, no lo que sale del esquema.
 *
 * `z.input` y no `z.infer`: los campos con valor por defecto —`categorySource`,
 * `createdBy`— son opcionales para quien llama y obligatorios ya dentro, que es
 * justo lo que hace un esquema con defectos.
 */
export type TransactionInput = z.input<typeof transactionInputSchema>

export type ListFilters = {
  readonly period?: Period
  readonly type?: MovementType
  readonly category?: string
  readonly includeVoided?: boolean
  readonly limit?: number
  readonly offset?: number
}

/** Condiciones comunes. El filtro por usuario nunca es opcional. */
function scope(userId: string, filters: ListFilters = {}): SQL {
  const conditions: SQL[] = [eq(transactions.userId, userId)]

  if (!filters.includeVoided) {
    conditions.push(eq(transactions.status, 'active'))
  }
  if (filters.period) {
    conditions.push(gte(transactions.occurredOn, toISO(filters.period.start)))
    conditions.push(lte(transactions.occurredOn, toISO(filters.period.end)))
  }
  if (filters.type) {
    conditions.push(eq(transactions.type, filters.type))
  }
  if (filters.category) {
    conditions.push(sql`${transactions.category}::text = ${filters.category}`)
  }

  return and(...conditions)!
}

export async function createTransaction(
  userId: string,
  input: TransactionInput,
): Promise<TransactionRow> {
  const values = transactionInputSchema.parse(input)

  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      type: values.type,
      amountCents: values.amountCents,
      currency: values.currency,
      category: (values.category ?? null) as TransactionRow['category'],
      categorySource: values.categorySource,
      occurredOn: values.occurredOn,
      description: values.description ?? null,
      descriptionShort: values.descriptionShort ?? null,
      createdBy: values.createdBy,
      assistantWriteId: values.assistantWriteId ?? null,
    })
    .returning()

  return row!
}

export async function getTransaction(
  userId: string,
  id: string,
): Promise<TransactionRow | null> {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .limit(1)

  return row ?? null
}

export async function listTransactions(
  userId: string,
  filters: ListFilters = {},
): Promise<TransactionRow[]> {
  return db
    .select()
    .from(transactions)
    .where(scope(userId, filters))
    // Fecha descendente (FR-016). El desempate por fecha de creación mantiene un
    // orden estable, necesario para que la carga incremental no repita ni salte
    // filas entre páginas.
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0)
}

export type TransactionPatch = Partial<
  Pick<
    TransactionInput,
    'amountCents' | 'category' | 'occurredOn' | 'description' | 'descriptionShort'
  >
>

export async function updateTransaction(
  userId: string,
  id: string,
  patch: TransactionPatch,
): Promise<TransactionRow | null> {
  const current = await getTransaction(userId, id)
  if (!current) return null

  // Se valida el resultado completo, no solo el parche: cambiar la categoría
  // debe seguir siendo coherente con el tipo del movimiento.
  const merged = transactionInputSchema.parse({
    type: current.type,
    amountCents: patch.amountCents ?? current.amountCents,
    currency: current.currency,
    category: patch.category !== undefined ? patch.category : current.category,
    occurredOn: patch.occurredOn ?? current.occurredOn,
    description: patch.description !== undefined ? patch.description : current.description,
    descriptionShort:
      patch.descriptionShort !== undefined
        ? patch.descriptionShort
        : current.descriptionShort,
    // Un cambio manual convierte la categoría en decisión del usuario, y esa
    // decisión es soberana: ninguna sugerencia posterior la sobrescribe (Art. II).
    categorySource: patch.category !== undefined ? 'user' : current.categorySource,
  })

  const [row] = await db
    .update(transactions)
    .set({
      amountCents: merged.amountCents,
      category: (merged.category ?? null) as TransactionRow['category'],
      categorySource: merged.categorySource,
      occurredOn: merged.occurredOn,
      description: merged.description ?? null,
      descriptionShort: merged.descriptionShort ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning()

  return row ?? null
}

/** Anula un movimiento. No lo borra: la anulación es un estado (Art. VII). */
export async function voidTransaction(
  userId: string,
  id: string,
): Promise<TransactionRow | null> {
  const [row] = await db
    .update(transactions)
    .set({ status: 'voided', voidedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning()

  return row ?? null
}

export async function restoreTransaction(
  userId: string,
  id: string,
): Promise<TransactionRow | null> {
  const [row] = await db
    .update(transactions)
    .set({ status: 'active', voidedAt: null, updatedAt: new Date() })
    .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
    .returning()

  return row ?? null
}

export async function countTransactions(
  userId: string,
  filters: ListFilters = {},
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transactions)
    .where(scope(userId, filters))

  return row?.total ?? 0
}

/**
 * Cifras agregadas del período, resueltas en una sola consulta.
 *
 * El agregado se hace en SQL y no trayendo los movimientos al servidor (D-041.5):
 * es para lo que sirve la base de datos, y evita cargar en memoria un historial
 * que puede ser largo.
 */
export async function periodAggregates(
  userId: string,
  period: Period,
  currency: string,
): Promise<PeriodAggregates> {
  const rows = await db
    .select({
      type: transactions.type,
      direction: transactions.savingDirection,
      total: sql<string>`sum(${transactions.amountCents})`,
    })
    .from(transactions)
    .where(scope(userId, { period }))
    .groupBy(transactions.type, transactions.savingDirection)

  const result = {
    currency,
    incomeCents: 0,
    expenseCents: 0,
    savingContributionCents: 0,
    savingWithdrawalCents: 0,
  }

  for (const row of rows) {
    const total = Number(row.total ?? 0)
    if (row.type === 'income') result.incomeCents += total
    else if (row.type === 'expense') result.expenseCents += total
    else if (row.direction === 'withdrawal') result.savingWithdrawalCents += total
    else result.savingContributionCents += total
  }

  return result
}

/**
 * Gasto agregado por categoría en el período.
 *
 * Solo gasto: los movimientos de ahorro quedan fuera de todo desglose de gasto
 * (RN-003 de la spec 001).
 */
export async function categoryBreakdown(
  userId: string,
  period: Period,
): Promise<CategoryAmount[]> {
  const rows = await db
    .select({
      category: sql<string>`${transactions.category}::text`,
      total: sql<string>`sum(${transactions.amountCents})`,
    })
    .from(transactions)
    .where(scope(userId, { period, type: 'expense' }))
    .groupBy(transactions.category)
    .orderBy(asc(transactions.category))

  return rows
    .filter((row) => row.category !== null)
    .map((row) => ({ categoryKey: row.category, amountCents: Number(row.total ?? 0) }))
}
