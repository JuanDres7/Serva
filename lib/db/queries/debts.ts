import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { debts, debtPayments, type DebtRow, type DebtPaymentRow } from '@/lib/db/schema'
import { createTransaction, voidTransaction } from '@/lib/db/queries/transactions'
import { puedeAbonar, saldoDe, type Deuda, type Abono } from '@/lib/domain/deudas'
import { toISO, type CivilDate } from '@/lib/domain/civil-date'
import { enMayuscula } from '@/lib/domain/keywords'

/**
 * Deudas y préstamos (spec 011).
 *
 * Como en el resto del proyecto, ninguna función existe sin recibir el usuario,
 * y todas lo aplican en el `WHERE`: una deuda ajena no se encuentra, así que no
 * se puede tocar (Art. VI.1).
 *
 * **El saldo no se guarda.** Se calcula sumando los abonos cada vez que hace
 * falta. Un contador que se actualiza a mano acaba desincronizado de los hechos
 * que lo alimentan (D-073).
 */

export const deudaSchema = z.object({
  direction: z.enum(['owed_by_me', 'owed_to_me']),
  // «primo», «mi hermana»: nadie escribe mayúsculas al hablar (D-076).
  counterparty: z.string().trim().min(1).max(80).transform(enMayuscula),
  originalCents: z.number().int().positive(),
  description: z.string().trim().max(200).nullable().optional(),
  /** Fecha civil en ISO, o nada si no se pactó (RN-004). */
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  createdBy: z.enum(['user', 'assistant']).optional().default('user'),
  assistantWriteId: z.string().uuid().nullable().optional(),
})

export type EntradaDeuda = z.input<typeof deudaSchema>

/** Una deuda con sus abonos, que es lo que hace falta para calcular nada. */
export type DeudaConAbonos = {
  readonly fila: DebtRow
  readonly abonos: readonly DebtPaymentRow[]
}

/** La forma que espera el dominio. */
export function comoDeuda(fila: DebtRow): Deuda {
  return {
    direccion: fila.direction,
    originalCents: fila.originalCents,
    currency: fila.currency,
    dueOn: fila.dueOn,
    settledAt: fila.settledAt,
  }
}

export function comoAbonos(filas: readonly DebtPaymentRow[]): Abono[] {
  return filas.map((f) => ({ amountCents: f.amountCents }))
}

export async function crearDeuda(
  userId: string,
  entrada: EntradaDeuda,
  currency: string,
): Promise<DebtRow> {
  const datos = deudaSchema.parse(entrada)

  const [fila] = await db
    .insert(debts)
    .values({
      userId,
      direction: datos.direction,
      counterparty: datos.counterparty,
      originalCents: datos.originalCents,
      currency,
      description: datos.description ?? null,
      dueOn: datos.dueOn ?? null,
      createdBy: datos.createdBy,
      assistantWriteId: datos.assistantWriteId ?? null,
    })
    .returning()

  return fila!
}

/** Todas las deudas de un usuario, con sus abonos. */
export async function listarDeudas(
  userId: string,
  opciones: { readonly incluirSaldadas?: boolean } = {},
): Promise<DeudaConAbonos[]> {
  const condiciones = [eq(debts.userId, userId)]
  if (!opciones.incluirSaldadas) condiciones.push(isNull(debts.settledAt))

  const filas = await db
    .select()
    .from(debts)
    .where(and(...condiciones))
    .orderBy(asc(debts.dueOn), desc(debts.createdAt))

  if (filas.length === 0) return []

  const abonos = await db
    .select()
    .from(debtPayments)
    .where(inArray(debtPayments.debtId, filas.map((f) => f.id)))
    .orderBy(asc(debtPayments.paidOn))

  return filas.map((fila) => ({
    fila,
    abonos: abonos.filter((a) => a.debtId === fila.id),
  }))
}

export async function leerDeuda(
  userId: string,
  id: string,
): Promise<DeudaConAbonos | null> {
  const [fila] = await db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, userId), eq(debts.id, id)))
    .limit(1)

  if (!fila) return null

  const abonos = await db
    .select()
    .from(debtPayments)
    .where(eq(debtPayments.debtId, fila.id))
    .orderBy(asc(debtPayments.paidOn))

  return { fila, abonos }
}

export type ResultadoAbonar =
  | { readonly ok: true; readonly saldada: boolean; readonly transactionId: string | null }
  | { readonly ok: false; readonly motivo: string }

/**
 * Registra un abono.
 *
 * Si la deuda es propia, el abono **sí** es un gasto: ese dinero se fue de
 * verdad, y entra en «Deudas y créditos» como cualquier otro (FR-006). Si es un
 * préstamo a favor —me devolvieron—, el dinero entra pero no es ingreso: se
 * registra como movimiento de deuda, que no toca los totales (FR-008).
 */
export async function abonar(
  userId: string,
  id: string,
  params: {
    readonly amountCents: number
    readonly paidOn: string
    readonly currency: string
  },
): Promise<ResultadoAbonar> {
  const deuda = await leerDeuda(userId, id)
  if (!deuda) return { ok: false, motivo: 'no-existe' }

  const permiso = puedeAbonar(
    comoDeuda(deuda.fila),
    comoAbonos(deuda.abonos),
    params.amountCents,
  )
  if (!permiso.ok) return { ok: false, motivo: permiso.motivo }

  const esMia = deuda.fila.direction === 'owed_by_me'

  const movimiento = esMia
    ? await createTransaction(userId, {
        type: 'expense',
        amountCents: params.amountCents,
        currency: params.currency,
        category: 'debt',
        occurredOn: params.paidOn,
        description: `Abono a ${deuda.fila.counterparty}`,
        descriptionShort: `Abono a ${deuda.fila.counterparty}`,
        debtId: id,
      })
    : await createTransaction(userId, {
        type: 'debt',
        amountCents: params.amountCents,
        currency: params.currency,
        category: null,
        occurredOn: params.paidOn,
        description: `${deuda.fila.counterparty} me devolvió`,
        debtFlow: 'collected',
        debtId: id,
      })

  await db.insert(debtPayments).values({
    debtId: id,
    transactionId: movimiento.id,
    amountCents: params.amountCents,
    paidOn: params.paidOn,
  })

  // FR-005: el último abono la salda sin que nadie tenga que pedirlo.
  if (permiso.salda) {
    await db
      .update(debts)
      .set({ settledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(debts.userId, userId), eq(debts.id, id)))
  }

  return { ok: true, saldada: permiso.salda, transactionId: movimiento.id }
}

/** Da una deuda por saldada sin abonar el resto: se la perdonaron, o se acordó. */
export async function saldar(userId: string, id: string): Promise<boolean> {
  const [fila] = await db
    .update(debts)
    .set({ settledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(debts.userId, userId), eq(debts.id, id), isNull(debts.settledAt)))
    .returning({ id: debts.id })

  return Boolean(fila)
}

/**
 * Reabre una deuda saldada por error (FR-014).
 *
 * Los abonos no se tocan: siguen ahí y el saldo vuelve a salir de ellos. Nada
 * se borró nunca (Art. VII).
 */
export async function reabrir(userId: string, id: string): Promise<boolean> {
  const [fila] = await db
    .update(debts)
    .set({ settledAt: null, updatedAt: new Date() })
    .where(and(eq(debts.userId, userId), eq(debts.id, id)))
    .returning({ id: debts.id })

  return Boolean(fila)
}

/**
 * Registra el dinero que entró o salió al pactar la deuda.
 *
 * Es lo que hace que el préstamo aparezca en el historial sin contaminar los
 * totales (RN-002). Se llama al crear la deuda, cuando el dinero efectivamente
 * cambió de manos.
 */
export async function registrarMovimientoDeDeuda(
  userId: string,
  deuda: DebtRow,
  hoy: CivilDate,
): Promise<string> {
  const fila = await createTransaction(userId, {
    type: 'debt',
    amountCents: deuda.originalCents,
    currency: deuda.currency,
    category: null,
    occurredOn: toISO(hoy),
    description:
      deuda.direction === 'owed_by_me'
        ? `${deuda.counterparty} me prestó`
        : `Le presté a ${deuda.counterparty}`,
    debtFlow: deuda.direction === 'owed_by_me' ? 'received' : 'lent',
    debtId: deuda.id,
    createdBy: deuda.createdBy,
    assistantWriteId: deuda.assistantWriteId,
  })

  return fila.id
}

/** Elimina una deuda creada por error, con sus abonos y sus movimientos. */
export async function descartarDeuda(userId: string, id: string): Promise<boolean> {
  const deuda = await leerDeuda(userId, id)
  if (!deuda) return false

  // Los movimientos no se borran: se anulan, que es como se deshace cualquier
  // cosa en este sistema (Art. VII).
  for (const abono of deuda.abonos) {
    if (abono.transactionId) await voidTransaction(userId, abono.transactionId)
  }

  await db.delete(debts).where(and(eq(debts.userId, userId), eq(debts.id, id)))
  return true
}

/** Cuánto se debe y cuánto le deben a uno, ya calculado (FR-009). */
export async function totalesDeDeuda(
  userId: string,
): Promise<{ debo: number; meDeben: number }> {
  const vivas = await listarDeudas(userId)

  let debo = 0
  let meDeben = 0

  for (const { fila, abonos } of vivas) {
    const saldo = saldoDe(comoDeuda(fila), comoAbonos(abonos)).cents
    if (fila.direction === 'owed_by_me') debo += saldo
    else meDeben += saldo
  }

  return { debo, meDeben }
}
