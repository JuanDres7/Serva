'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import {
  createTransaction,
  updateTransaction,
  voidTransaction,
  restoreTransaction,
  type TransactionInput,
  type TransactionPatch,
} from '@/lib/db/queries/transactions'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { confirmarCategorizacion } from '@/lib/db/queries/learning'

/**
 * Mutaciones de movimientos.
 *
 * El usuario sale siempre de la sesión del servidor (`requireUserId`), nunca de
 * un parámetro del cliente: un identificador enviado por el navegador es una
 * sugerencia del visitante, no una identidad (Art. VI.1).
 *
 * La moneda tampoco la elige el cliente: se toma de la configuración del usuario.
 * Aceptarla desde el formulario permitiría registrar movimientos en una moneda
 * distinta a la de la cuenta y falsear todos los totales.
 */

export type ResultadoAccion =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly error: string }

type EntradaRegistro = Omit<TransactionInput, 'currency' | 'categorySource'> & {
  readonly categorySource?: TransactionInput['categorySource']
  /**
   * Registro de aprendizaje asociado, si hubo sugerencia. Al guardar se cierra
   * el ciclo: qué propuso el sistema y con qué se quedó la persona (D-015).
   */
  readonly logId?: string | null
}

export async function registrarMovimiento(
  entrada: EntradaRegistro,
): Promise<ResultadoAccion> {
  try {
    const userId = await requireUserId()
    const settings = await ensureUserSettings(userId)

    const { logId, ...datos } = entrada

    const fila = await createTransaction(userId, {
      ...datos,
      currency: settings.currency,
      categorySource: entrada.categorySource ?? 'user',
    })

    if (logId) {
      // Un fallo cerrando el aprendizaje no puede tumbar un movimiento que ya
      // se guardó bien.
      try {
        await confirmarCategorizacion(userId, logId, {
          transactionId: fila.id,
          finalCategory: fila.category,
        })
      } catch {
        // Se pierde una muestra de aprendizaje; el registro del usuario, no.
      }
    }

    revalidatePath('/')
    revalidatePath('/historial')
    return { ok: true, id: fila.id }
  } catch (error) {
    return { ok: false, error: mensajeDeError(error) }
  }
}

export async function actualizarMovimiento(
  id: string,
  parche: TransactionPatch,
): Promise<ResultadoAccion> {
  try {
    const userId = await requireUserId()
    const fila = await updateTransaction(userId, id, parche)
    if (!fila) return { ok: false, error: 'No se encontró el movimiento' }

    revalidatePath('/')
    revalidatePath('/historial')
    return { ok: true, id: fila.id }
  } catch (error) {
    return { ok: false, error: mensajeDeError(error) }
  }
}

export async function anularMovimiento(id: string): Promise<ResultadoAccion> {
  try {
    const userId = await requireUserId()
    const fila = await voidTransaction(userId, id)
    if (!fila) return { ok: false, error: 'No se encontró el movimiento' }

    revalidatePath('/')
    revalidatePath('/historial')
    return { ok: true, id: fila.id }
  } catch (error) {
    return { ok: false, error: mensajeDeError(error) }
  }
}

export async function restaurarMovimiento(id: string): Promise<ResultadoAccion> {
  try {
    const userId = await requireUserId()
    const fila = await restoreTransaction(userId, id)
    if (!fila) return { ok: false, error: 'No se encontró el movimiento' }

    revalidatePath('/')
    revalidatePath('/historial')
    return { ok: true, id: fila.id }
  } catch (error) {
    return { ok: false, error: mensajeDeError(error) }
  }
}

/**
 * Traduce el fallo a algo que el usuario pueda entender.
 *
 * Nunca se devuelve el error original: puede contener detalles del esquema o de
 * la consulta, y eso no ayuda a nadie salvo a quien busque atacar la aplicación.
 */
function mensajeDeError(error: unknown): string {
  const texto = error instanceof Error ? error.message : ''

  if (texto.includes('amount_positive')) return 'El monto debe ser mayor que cero'
  if (texto.includes('date_not_future')) return 'La fecha no puede ser futura'
  if (texto.includes('No hay sesión')) return 'Tu sesión expiró. Vuelve a entrar.'
  if (texto.includes('categoría') || texto.includes('category')) {
    return 'Elige una categoría válida para este tipo de movimiento'
  }
  return 'No se pudo guardar el movimiento. Revisa los datos e inténtalo de nuevo.'
}
