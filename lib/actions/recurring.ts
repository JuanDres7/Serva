'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  crearRecurrente,
  confirmarCobro,
  reprogramar,
  eliminarRecurrente,
  type EntradaRecurrente,
} from '@/lib/db/queries/recurring'
import { todayIn } from '@/lib/domain/civil-date'

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

function refrescar() {
  revalidatePath('/')
  revalidatePath('/recurrentes')
  revalidatePath('/historial')
}

export async function nuevoRecurrente(entrada: EntradaRecurrente): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const settings = await ensureUserSettings(userId)

    await crearRecurrente(userId, entrada, {
      currency: settings.currency,
      hoy: todayIn(settings.timeZone),
    })

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

export async function confirmarPendiente(
  id: string,
  opciones: { amountCents?: number; montoPermanente?: boolean } = {},
): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const resultado = await confirmarCobro(userId, id, opciones)
    if (!resultado) return { ok: false, error: 'No se encontró el cobro' }

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

export async function reprogramarPendiente(
  id: string,
  nuevaFecha: string,
): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) {
      return { ok: false, error: 'Elige una fecha válida' }
    }

    const movido = await reprogramar(userId, id, nuevaFecha)
    if (!movido) return { ok: false, error: 'No se encontró el cobro' }

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

export async function borrarRecurrente(id: string): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const borrado = await eliminarRecurrente(userId, id)
    if (!borrado) return { ok: false, error: 'No se encontró el movimiento recurrente' }

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

function mensaje(error: unknown): string {
  const texto = error instanceof Error ? error.message : ''

  if (texto.includes('No hay sesión')) return 'Tu sesión expiró. Vuelve a entrar.'
  if (texto.includes('mayor que cero')) return 'El monto debe ser mayor que cero'
  if (texto.includes('categoría') || texto.includes('category')) {
    return 'Elige una categoría válida para este tipo de movimiento'
  }
  return 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.'
}
