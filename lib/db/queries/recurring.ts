import { and, asc, eq, isNull, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { recurringMovements, transactions, type RecurringRow } from '@/lib/db/schema'
import { isValidFor, type MovementKind } from '@/lib/domain/categories'
import { toISO, type CivilDate } from '@/lib/domain/civil-date'
import {
  primeraFecha,
  proximaFecha,
  seRepite,
  validarPeriodicidad,
  type Periodicidad,
} from '@/lib/domain/recurrence'

/**
 * Movimientos recurrentes (spec 007).
 *
 * Como en el resto del proyecto, ninguna función existe sin recibir el usuario.
 */

export const periodicidadSchema = z.union([
  z.object({ kind: z.literal('monthly'), day: z.number().int().min(1).max(31) }),
  z.object({ kind: z.literal('every-n-days'), n: z.number().int().min(1).max(365) }),
  // Una sola vez, en una fecha (spec 010, E5). Se archiva al confirmarse.
  z.object({
    kind: z.literal('once'),
    on: z.object({
      year: z.number().int().min(1900).max(2200),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    }),
  }),
])

export const recurrenteSchema = z
  .object({
    type: z.enum(['expense', 'income']),
    amountCents: z.number().int().positive(),
    category: z.string(),
    description: z.string().trim().min(1).max(120),
    schedule: periodicidadSchema,
  })
  .superRefine((valor, ctx) => {
    if (!isValidFor(valor.category, valor.type as MovementKind)) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: `La categoría "${valor.category}" no corresponde a un ${valor.type}`,
      })
    }
  })

export type EntradaRecurrente = z.infer<typeof recurrenteSchema>

export function periodicidadDe(fila: RecurringRow): Periodicidad {
  return fila.schedule as Periodicidad
}

export async function crearRecurrente(
  userId: string,
  entrada: EntradaRecurrente,
  contexto: { currency: string; hoy: CivilDate },
): Promise<RecurringRow> {
  const datos = recurrenteSchema.parse(entrada)
  validarPeriodicidad(datos.schedule)

  const [fila] = await db
    .insert(recurringMovements)
    .values({
      userId,
      type: datos.type,
      amountCents: datos.amountCents,
      currency: contexto.currency,
      category: datos.category as RecurringRow['category'],
      description: datos.description,
      schedule: datos.schedule,
      nextDueOn: toISO(primeraFecha(datos.schedule, contexto.hoy)),
    })
    .returning()

  return fila!
}

export async function listarRecurrentes(userId: string): Promise<RecurringRow[]> {
  return db
    .select()
    .from(recurringMovements)
    // Los archivados no se muestran: ya cumplieron y no hay nada que confirmar
    // ni que editar en ellos. Siguen existiendo (Art. VII).
    .where(and(eq(recurringMovements.userId, userId), isNull(recurringMovements.archivedAt)))
    .orderBy(asc(recurringMovements.nextDueOn))
}

/** Cobros cuya fecha ya llegó o pasó. */
export async function pendientesDeConfirmar(
  userId: string,
  hoy: CivilDate,
): Promise<RecurringRow[]> {
  return db
    .select()
    .from(recurringMovements)
    .where(
      and(
        eq(recurringMovements.userId, userId),
        isNull(recurringMovements.archivedAt),
        lte(recurringMovements.nextDueOn, toISO(hoy)),
      ),
    )
    .orderBy(asc(recurringMovements.nextDueOn))
}

export async function contarPendientes(userId: string, hoy: CivilDate): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(recurringMovements)
    .where(
      and(
        eq(recurringMovements.userId, userId),
        isNull(recurringMovements.archivedAt),
        lte(recurringMovements.nextDueOn, toISO(hoy)),
      ),
    )

  return fila?.total ?? 0
}

export type ResultadoConfirmacion = {
  readonly transactionId: string
  /** `null` cuando el cobro era de una sola vez y quedó archivado. */
  readonly proximaFecha: string | null
}

/**
 * Confirma un cobro: registra el movimiento y adelanta la fecha.
 *
 * El movimiento resultante es indistinguible de uno creado a mano (FR-008): usa
 * la misma tabla, las mismas restricciones y los mismos totales.
 */
export async function confirmarCobro(
  userId: string,
  id: string,
  opciones: {
    amountCents?: number
    /** Si el monto nuevo vale también para los próximos cobros (FR-010). */
    montoPermanente?: boolean
  } = {},
): Promise<ResultadoConfirmacion | null> {
  const [recurrente] = await db
    .select()
    .from(recurringMovements)
    .where(and(eq(recurringMovements.userId, userId), eq(recurringMovements.id, id)))
    .limit(1)

  if (!recurrente) return null

  const monto = opciones.amountCents ?? recurrente.amountCents
  if (!Number.isInteger(monto) || monto <= 0) {
    throw new Error('El monto debe ser mayor que cero')
  }

  const [movimiento] = await db
    .insert(transactions)
    .values({
      userId,
      type: recurrente.type,
      amountCents: monto,
      currency: recurrente.currency,
      category: recurrente.category,
      categorySource: 'user',
      occurredOn: recurrente.nextDueOn,
      description: recurrente.description,
      descriptionShort: recurrente.description,
      isSample: recurrente.isSample,
    })
    .returning({ id: transactions.id })

  const periodicidad = periodicidadDe(recurrente)

  // Un cobro de una sola vez no tiene siguiente: se archiva. Borrarlo
  // eliminaría el rastro de un cobro que sí ocurrió (Art. VII), y dejarlo
  // vigente lo devolvería a los pendientes al día siguiente (spec 010, T-410).
  if (!seRepite(periodicidad)) {
    await db
      .update(recurringMovements)
      .set({
        archivedAt: new Date(),
        lastConfirmedOn: recurrente.nextDueOn,
        amountCents: monto,
        updatedAt: new Date(),
      })
      .where(and(eq(recurringMovements.userId, userId), eq(recurringMovements.id, id)))

    return { transactionId: movimiento!.id, proximaFecha: null }
  }

  const siguiente = proximaFecha(
    periodicidad,
    // La fecha se calcula desde el cobro que se acaba de confirmar, no desde
    // hoy: así un usuario que entra tarde no desplaza toda la serie (RN-002).
    { ...fechaDesdeISO(recurrente.nextDueOn) },
  )

  await db
    .update(recurringMovements)
    .set({
      // El monto propuesto la próxima vez es el del último cobro confirmado,
      // salvo que el cambio fuera solo por esta vez (D-033).
      amountCents: opciones.montoPermanente === false ? recurrente.amountCents : monto,
      nextDueOn: toISO(siguiente),
      lastConfirmedOn: recurrente.nextDueOn,
      updatedAt: new Date(),
    })
    .where(and(eq(recurringMovements.userId, userId), eq(recurringMovements.id, id)))

  return { transactionId: movimiento!.id, proximaFecha: toISO(siguiente) }
}

/** Reprograma un cobro que no ocurrió (FR-011). */
export async function reprogramar(
  userId: string,
  id: string,
  nuevaFecha: string,
): Promise<boolean> {
  const [fila] = await db
    .update(recurringMovements)
    .set({ nextDueOn: nuevaFecha, updatedAt: new Date() })
    .where(and(eq(recurringMovements.userId, userId), eq(recurringMovements.id, id)))
    .returning({ id: recurringMovements.id })

  return Boolean(fila)
}

/**
 * Elimina un recurrente.
 *
 * Los movimientos que ya generó permanecen: son gastos que de verdad ocurrieron
 * y borrarlos falsearía el historial (RN-004).
 */
export async function eliminarRecurrente(userId: string, id: string): Promise<boolean> {
  const [fila] = await db
    .delete(recurringMovements)
    .where(and(eq(recurringMovements.userId, userId), eq(recurringMovements.id, id)))
    .returning({ id: recurringMovements.id })

  return Boolean(fila)
}

function fechaDesdeISO(valor: string): CivilDate {
  const [year, month, day] = valor.split('-').map(Number)
  return { year: year!, month: month!, day: day! }
}
