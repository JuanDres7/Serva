import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { assistantWrites, transactions, userSettings } from '@/lib/db/schema'
import { createTransaction, voidTransaction, updateTransaction } from '@/lib/db/queries/transactions'
import { crearRecurrente } from '@/lib/db/queries/recurring'
import { fromISO, type CivilDate } from '@/lib/domain/civil-date'
import type { MovimientoListo } from '@/lib/ai/propuesta'
import type { TipoDeAccion } from '@/lib/domain/puerta'

/**
 * Lo que Serva escribe, y su rastro (spec 010, plan §3.2 y §5).
 *
 * **El modelo no llama a nada de aquí.** Propone; estas funciones ejecutan, y
 * solo después de que la puerta lo haya autorizado. Todas reciben `userId` y lo
 * aplican en el `where`: una propuesta ajena no se encuentra, así que no se
 * puede aplicar (Art. VI.1).
 */

/**
 * Cuánto vive una propuesta sin resolver.
 *
 * Confirmar mañana una frase de hoy escribiría con una fecha que ya no es
 * «hoy». Y la tarjeta vive dentro de una conversación que dura siete días, así
 * que sin caducidad seguiría invitando a pulsar una semana después.
 */
export const HORAS_DE_VIGENCIA = 24

export type PropuestaGuardada = {
  readonly id: string
  readonly kind: TipoDeAccion
  readonly status: string
  readonly proposal: unknown
  readonly createdAt: Date
}

export type ResultadoAplicacion =
  | { readonly ok: true; readonly transactionIds: readonly string[] }
  | { readonly ok: false; readonly motivo: MotivoFallo }

export type MotivoFallo = 'no-existe' | 'ya-resuelta' | 'caducada' | 'nada-que-hacer'

/** Guarda la propuesta antes de mostrarla, y devuelve su identificador. */
export async function guardarPropuesta(params: {
  readonly userId: string
  readonly kind: TipoDeAccion
  readonly inputText: string
  readonly proposal: unknown
  readonly confidence?: number | null
  readonly model?: string | null
  readonly latencyMs?: number | null
  readonly status?: 'propuesta' | 'rechazada'
}): Promise<string> {
  const [fila] = await db
    .insert(assistantWrites)
    .values({
      userId: params.userId,
      kind: params.kind,
      inputText: params.inputText,
      proposal: params.proposal as never,
      confidence: params.confidence ?? null,
      model: params.model ?? null,
      latencyMs: params.latencyMs ?? null,
      status: params.status ?? 'propuesta',
      resolvedAt: params.status === 'rechazada' ? new Date() : null,
    })
    .returning({ id: assistantWrites.id })

  return fila!.id
}

export async function leerPropuesta(
  userId: string,
  id: string,
): Promise<PropuestaGuardada | null> {
  const [fila] = await db
    .select({
      id: assistantWrites.id,
      kind: assistantWrites.kind,
      status: assistantWrites.status,
      proposal: assistantWrites.proposal,
      createdAt: assistantWrites.createdAt,
    })
    .from(assistantWrites)
    .where(and(eq(assistantWrites.userId, userId), eq(assistantWrites.id, id)))
    .limit(1)

  return fila ?? null
}

function haCaducado(creada: Date): boolean {
  return Date.now() - creada.getTime() > HORAS_DE_VIGENCIA * 60 * 60 * 1000
}

/**
 * Comprueba que una propuesta se puede aplicar, y por qué no si no se puede.
 *
 * Separado de aplicarla para que la comprobación sea la misma en todos los
 * caminos: la del botón, la del automático y la de una petición manipulada.
 */
async function reservar(
  userId: string,
  id: string,
): Promise<{ ok: true; propuesta: PropuestaGuardada } | { ok: false; motivo: MotivoFallo }> {
  const propuesta = await leerPropuesta(userId, id)
  if (!propuesta) return { ok: false, motivo: 'no-existe' }

  // FR-025: `aplicada`, `revertida`, `rechazada` y `caducada` son terminales.
  // La tarjeta sigue en pantalla días después dentro de la conversación
  // guardada, así que sin esto pulsar dos veces escribiría dos veces.
  if (propuesta.status !== 'propuesta') return { ok: false, motivo: 'ya-resuelta' }

  if (haCaducado(propuesta.createdAt)) {
    await db
      .update(assistantWrites)
      .set({ status: 'caducada', resolvedAt: new Date() })
      .where(and(eq(assistantWrites.userId, userId), eq(assistantWrites.id, id)))
    return { ok: false, motivo: 'caducada' }
  }

  return { ok: true, propuesta }
}

/**
 * Aplica una propuesta de creación: escribe los movimientos y los marca.
 *
 * Lo que cae en el futuro no entra como movimiento sino como cobro programado
 * (E5). No es un caso especial inventado aquí: un movimiento con fecha futura
 * no existe en este sistema (FR-008 de la spec 001), así que en lugar de
 * rechazarlo se encamina.
 */
export async function aplicarCreacion(params: {
  readonly userId: string
  readonly id: string
  readonly currency: string
  readonly hoy: CivilDate
}): Promise<ResultadoAplicacion> {
  const reserva = await reservar(params.userId, params.id)
  if (!reserva.ok) return { ok: false, motivo: reserva.motivo }

  const movimientos = (reserva.propuesta.proposal as { movimientos?: MovimientoListo[] })
    .movimientos
  if (!Array.isArray(movimientos) || movimientos.length === 0) {
    return { ok: false, motivo: 'nada-que-hacer' }
  }

  const ids: string[] = []

  for (const movimiento of movimientos) {
    if (movimiento.esFuturo) {
      const fecha = fromISO(movimiento.occurredOn)
      await crearRecurrente(
        params.userId,
        {
          type: movimiento.tipo as 'expense' | 'income',
          amountCents: movimiento.amountCents,
          category: movimiento.categoria,
          description: movimiento.descripcionCorta || movimiento.descripcion,
          schedule: {
            kind: 'once',
            on: { year: fecha.year, month: fecha.month, day: fecha.day },
          },
        },
        { currency: params.currency, hoy: params.hoy },
      )
      continue
    }

    const fila = await createTransaction(params.userId, {
      type: movimiento.tipo,
      amountCents: movimiento.amountCents,
      currency: params.currency,
      category: movimiento.categoria,
      occurredOn: movimiento.occurredOn,
      description: movimiento.descripcion,
      descriptionShort: movimiento.descripcionCorta,
      categorySource: movimiento.categoriaSegura ? 'model' : 'user',
      // Art. II.2: se marca el origen y se guarda el puente hasta la frase.
      createdBy: 'assistant',
      assistantWriteId: params.id,
    })
    ids.push(fila.id)
  }

  await marcarResuelta(params.userId, params.id, 'aplicada')
  return { ok: true, transactionIds: ids }
}

/** Aplica una corrección de monto sobre un movimiento existente. */
export async function aplicarCorreccion(params: {
  readonly userId: string
  readonly id: string
}): Promise<ResultadoAplicacion> {
  const reserva = await reservar(params.userId, params.id)
  if (!reserva.ok) return { ok: false, motivo: reserva.motivo }

  const propuesta = reserva.propuesta.proposal as {
    transactionId?: string
    amountCents?: number
    category?: string
  }
  if (!propuesta.transactionId) return { ok: false, motivo: 'nada-que-hacer' }

  await updateTransaction(params.userId, propuesta.transactionId, {
    ...(propuesta.amountCents ? { amountCents: propuesta.amountCents } : {}),
    ...(propuesta.category ? { category: propuesta.category } : {}),
  })

  await marcarResuelta(params.userId, params.id, 'aplicada')
  return { ok: true, transactionIds: [propuesta.transactionId] }
}

/** Aplica una anulación. Anular no borra: el movimiento sigue ahí (Art. VII). */
export async function aplicarAnulacion(params: {
  readonly userId: string
  readonly id: string
}): Promise<ResultadoAplicacion> {
  const reserva = await reservar(params.userId, params.id)
  if (!reserva.ok) return { ok: false, motivo: reserva.motivo }

  const propuesta = reserva.propuesta.proposal as { transactionId?: string }
  if (!propuesta.transactionId) return { ok: false, motivo: 'nada-que-hacer' }

  await voidTransaction(params.userId, propuesta.transactionId)
  await marcarResuelta(params.userId, params.id, 'aplicada')
  return { ok: true, transactionIds: [propuesta.transactionId] }
}

/**
 * Deshace lo que Serva acaba de escribir (FR-023).
 *
 * No pide confirmación adicional, y no es una excepción a la regla de lo
 * destructivo: deshacer devuelve al usuario a donde estaba. Lo que se anula
 * aquí lo escribió la IA hace un momento, no la persona hace semanas.
 */
export async function revertir(params: {
  readonly userId: string
  readonly id: string
}): Promise<ResultadoAplicacion> {
  const propuesta = await leerPropuesta(params.userId, params.id)
  if (!propuesta) return { ok: false, motivo: 'no-existe' }
  if (propuesta.status !== 'aplicada') return { ok: false, motivo: 'ya-resuelta' }

  const escritos = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, params.userId),
        eq(transactions.assistantWriteId, params.id),
        eq(transactions.status, 'active'),
      ),
    )

  for (const movimiento of escritos) {
    await voidTransaction(params.userId, movimiento.id)
  }

  await marcarResuelta(params.userId, params.id, 'revertida')
  return { ok: true, transactionIds: escritos.map((m) => m.id) }
}

async function marcarResuelta(
  userId: string,
  id: string,
  status: 'aplicada' | 'revertida' | 'rechazada',
): Promise<void> {
  await db
    .update(assistantWrites)
    .set({ status, resolvedAt: new Date() })
    .where(and(eq(assistantWrites.userId, userId), eq(assistantWrites.id, id)))
}

/** Descarta una propuesta que el usuario no quiso. */
export async function descartar(userId: string, id: string): Promise<void> {
  await db
    .update(assistantWrites)
    .set({ status: 'rechazada', resolvedAt: new Date() })
    .where(
      and(
        eq(assistantWrites.userId, userId),
        eq(assistantWrites.id, id),
        eq(assistantWrites.status, 'propuesta'),
      ),
    )
}

/* ── La activación del registro automático (Art. II.1) ────────────────────── */

export async function automaticoActivo(userId: string): Promise<boolean> {
  const [fila] = await db
    .select({ desde: userSettings.autoRegisterEnabledAt })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1)

  return Boolean(fila?.desde)
}

export async function activarAutomatico(userId: string): Promise<void> {
  await db
    .update(userSettings)
    .set({ autoRegisterEnabledAt: new Date(), updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
}

export async function revocarAutomatico(userId: string): Promise<void> {
  await db
    .update(userSettings)
    .set({ autoRegisterEnabledAt: null, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
}
