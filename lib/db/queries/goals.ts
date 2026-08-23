import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { savingsGoals, transactions, type SavingsGoalRow } from '@/lib/db/schema'
import { toISO, type CivilDate } from '@/lib/domain/civil-date'
import { calcularEstado, ritmoDiario, type Aporte } from '@/lib/domain/goals'

/**
 * Metas de ahorro (spec 006).
 *
 * El progreso **no se guarda**: se deriva de los movimientos de tipo ahorro
 * asociados a la meta, igual que los saldos se derivan del historial
 * (Art. VII.2). Un contador almacenado se desincroniza en cuanto alguien
 * corrige o anula un aporte.
 */

/** Tamaño máximo de la imagen. Suficiente para una foto y sin castigar la base. */
export const MAXIMO_IMAGEN_BYTES = 600 * 1024

export const metaSchema = z.object({
  name: z.string().trim().min(1).max(60),
  targetCents: z.number().int().positive(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
})

export type EntradaMeta = z.infer<typeof metaSchema>

export type MetaConProgreso = {
  readonly id: string
  readonly name: string
  readonly targetCents: number
  readonly aportadoCents: number
  readonly currency: string
  readonly targetDate: string | null
  readonly achievedAt: Date | null
  readonly tieneImagen: boolean
  readonly aportes: readonly Aporte[]
}

export async function crearMeta(
  userId: string,
  entrada: EntradaMeta,
  contexto: { currency: string },
): Promise<SavingsGoalRow> {
  const datos = metaSchema.parse(entrada)

  const [fila] = await db
    .insert(savingsGoals)
    .values({
      userId,
      name: datos.name,
      targetCents: datos.targetCents,
      currency: contexto.currency,
      targetDate: datos.targetDate ?? null,
    })
    .returning()

  return fila!
}

export async function guardarImagen(
  userId: string,
  id: string,
  imagen: { datos: Buffer; tipo: string },
): Promise<boolean> {
  if (imagen.datos.byteLength > MAXIMO_IMAGEN_BYTES) {
    throw new Error('La imagen es demasiado grande')
  }

  const [fila] = await db
    .update(savingsGoals)
    .set({ image: imagen.datos, imageType: imagen.tipo, updatedAt: new Date() })
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
    .returning({ id: savingsGoals.id })

  return Boolean(fila)
}

export async function leerImagen(
  userId: string,
  id: string,
): Promise<{ datos: Buffer; tipo: string } | null> {
  const [fila] = await db
    .select({ image: savingsGoals.image, imageType: savingsGoals.imageType })
    .from(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
    .limit(1)

  if (!fila?.image) return null
  return { datos: fila.image, tipo: fila.imageType ?? 'image/jpeg' }
}

/** Metas con su progreso derivado de los movimientos de ahorro. */
export async function listarMetas(
  userId: string,
  opciones: { incluirLogradas?: boolean } = {},
): Promise<MetaConProgreso[]> {
  const metas = await db
    .select()
    .from(savingsGoals)
    .where(
      opciones.incluirLogradas
        ? eq(savingsGoals.userId, userId)
        : and(eq(savingsGoals.userId, userId), isNull(savingsGoals.achievedAt)),
    )
    .orderBy(desc(savingsGoals.createdAt))

  if (metas.length === 0) return []

  const movimientos = await db
    .select({
      goalId: transactions.savingGoalId,
      direction: transactions.savingDirection,
      amountCents: transactions.amountCents,
      occurredOn: transactions.occurredOn,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'saving'),
        eq(transactions.status, 'active'),
      ),
    )

  return metas.map((meta) => {
    const suyos = movimientos.filter((m) => m.goalId === meta.id)
    const aportes: Aporte[] = suyos.map((m) => ({
      fecha: fechaDesdeISO(m.occurredOn),
      // Un retiro resta: el progreso es aportes menos retiros (RN-001).
      cents: m.direction === 'withdrawal' ? -m.amountCents : m.amountCents,
    }))

    return {
      id: meta.id,
      name: meta.name,
      targetCents: meta.targetCents,
      aportadoCents: aportes.reduce((suma, a) => suma + a.cents, 0),
      currency: meta.currency,
      targetDate: meta.targetDate,
      achievedAt: meta.achievedAt,
      tieneImagen: meta.image !== null,
      aportes,
    }
  })
}

export async function obtenerMeta(
  userId: string,
  id: string,
): Promise<MetaConProgreso | null> {
  const metas = await listarMetas(userId, { incluirLogradas: true })
  return metas.find((m) => m.id === id) ?? null
}

export type ResultadoAporte = {
  readonly transactionId: string
  readonly aportadoCents: number
  readonly reciénAlcanzada: boolean
}

/**
 * Registra un aporte o un retiro.
 *
 * El movimiento es de tipo ahorro: descuenta del disponible pero no cuenta como
 * gasto (D-028). Un retiro devuelve el dinero al disponible.
 */
export async function moverEnMeta(
  userId: string,
  id: string,
  params: {
    amountCents: number
    direccion: 'contribution' | 'withdrawal'
    fecha: CivilDate
  },
): Promise<ResultadoAporte | null> {
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
    throw new Error('El monto debe ser mayor que cero')
  }

  const meta = await obtenerMeta(userId, id)
  if (!meta) return null

  // FR-008: no se puede sacar más de lo que hay en la meta.
  if (params.direccion === 'withdrawal' && params.amountCents > meta.aportadoCents) {
    throw new Error('No puedes retirar más de lo que has aportado a esta meta')
  }

  const [movimiento] = await db
    .insert(transactions)
    .values({
      userId,
      type: 'saving',
      amountCents: params.amountCents,
      currency: meta.currency,
      category: null,
      occurredOn: toISO(params.fecha),
      description: `${params.direccion === 'withdrawal' ? 'Retiro de' : 'Aporte a'} ${meta.name}`,
      descriptionShort: meta.name,
      savingGoalId: id,
      savingDirection: params.direccion,
    })
    .returning({ id: transactions.id })

  const aportado =
    meta.aportadoCents +
    (params.direccion === 'withdrawal' ? -params.amountCents : params.amountCents)

  const estado = calcularEstado(aportado, meta.targetCents)
  const reciénAlcanzada = estado.alcanzada && meta.achievedAt === null

  if (reciénAlcanzada) {
    await db
      .update(savingsGoals)
      .set({ achievedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
  } else if (!estado.alcanzada && meta.achievedAt !== null) {
    // Un retiro puede sacarla del estado de alcanzada: vuelve a estar activa.
    await db
      .update(savingsGoals)
      .set({ achievedAt: null, updatedAt: new Date() })
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
  }

  return { transactionId: movimiento!.id, aportadoCents: aportado, reciénAlcanzada }
}

export async function eliminarMeta(userId: string, id: string): Promise<boolean> {
  const [fila] = await db
    .delete(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, id)))
    .returning({ id: savingsGoals.id })

  return Boolean(fila)
}

export async function contarMetasActivas(userId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(savingsGoals)
    .where(and(eq(savingsGoals.userId, userId), isNull(savingsGoals.achievedAt)))

  return fila?.total ?? 0
}

/** Ritmo de ahorro de una meta, para proyectar cuándo se alcanzará. */
export function ritmoDeMeta(meta: MetaConProgreso, hoy: CivilDate): number | null {
  return ritmoDiario(meta.aportes, hoy)
}

function fechaDesdeISO(valor: string): CivilDate {
  const [year, month, day] = valor.split('-').map(Number)
  return { year: year!, month: month!, day: day! }
}
