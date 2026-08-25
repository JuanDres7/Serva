'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { todayIn, toISO } from '@/lib/domain/civil-date'
import {
  crearDeuda,
  abonar,
  saldar,
  reabrir,
  descartarDeuda,
  registrarMovimientoDeDeuda,
  type EntradaDeuda,
} from '@/lib/db/queries/debts'

/**
 * Mutaciones de deudas (spec 011).
 *
 * El usuario sale siempre de la sesión del servidor, nunca de un parámetro:
 * un identificador enviado por el navegador es una sugerencia, no un hecho.
 */

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

const MOTIVOS: Record<string, string> = {
  'no-existe': 'Esa deuda ya no está.',
  'excede-el-saldo': 'El abono es mayor que lo que queda por pagar.',
  'ya-saldada': 'Esta deuda ya está saldada.',
  'monto-invalido': 'El abono tiene que ser mayor que cero.',
}

function refrescar() {
  revalidatePath('/deudas')
  revalidatePath('/historial')
  revalidatePath('/')
}

export async function registrarDeuda(
  entrada: Omit<EntradaDeuda, 'createdBy' | 'assistantWriteId'>,
): Promise<Resultado> {
  const userId = await requireUserId()
  const settings = await ensureUserSettings(userId)

  try {
    const deuda = await crearDeuda(userId, entrada, settings.currency)

    // El dinero cambió de manos al pactarla, así que queda en el historial.
    // No toca los totales: es un traslado, no un ingreso ni un gasto (RN-002).
    await registrarMovimientoDeDeuda(userId, deuda, todayIn(settings.timeZone))

    refrescar()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo registrar la deuda',
    }
  }
}

export async function abonarADeuda(
  id: string,
  amountCents: number,
  paidOn?: string,
): Promise<Resultado> {
  const userId = await requireUserId()
  const settings = await ensureUserSettings(userId)

  const resultado = await abonar(userId, id, {
    amountCents,
    paidOn: paidOn ?? toISO(todayIn(settings.timeZone)),
    currency: settings.currency,
  })

  if (!resultado.ok) {
    return { ok: false, error: MOTIVOS[resultado.motivo] ?? 'No se pudo abonar' }
  }

  refrescar()
  return { ok: true }
}

/** Dar por saldada sin abonar el resto: se la perdonaron, o se acordó así. */
export async function darPorSaldada(id: string): Promise<Resultado> {
  const userId = await requireUserId()
  const hecho = await saldar(userId, id)

  if (!hecho) return { ok: false, error: 'Esa deuda ya no está pendiente.' }

  refrescar()
  return { ok: true }
}

/** Deshacer una saldada por error. Los abonos siguen ahí (FR-014). */
export async function reabrirDeuda(id: string): Promise<Resultado> {
  const userId = await requireUserId()
  const hecho = await reabrir(userId, id)

  if (!hecho) return { ok: false, error: 'Esa deuda ya no está.' }

  refrescar()
  return { ok: true }
}

export async function eliminarDeuda(id: string): Promise<Resultado> {
  const userId = await requireUserId()
  const hecho = await descartarDeuda(userId, id)

  if (!hecho) return { ok: false, error: 'Esa deuda ya no está.' }

  refrescar()
  return { ok: true }
}
