'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings, guardarCiclo } from '@/lib/db/queries/settings'
import { guardarPresupuesto, eliminarPresupuesto } from '@/lib/db/queries/budgets'
import { validarCicloDeEntrada } from '@/lib/domain/cycle-input'

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

function refrescar() {
  revalidatePath('/')
  revalidatePath('/presupuestos')
}

export async function definirPresupuesto(
  category: string,
  limitCents: number,
): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const settings = await ensureUserSettings(userId)

    await guardarPresupuesto(
      userId,
      { category, limitCents },
      { currency: settings.currency },
    )

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

export async function quitarPresupuesto(id: string): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const borrado = await eliminarPresupuesto(userId, id)
    if (!borrado) return { ok: false, error: 'No se encontró el presupuesto' }

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

/** Guarda el ciclo de pago elegido en la primera visita a presupuestos. */
export async function definirCiclo(entrada: unknown): Promise<Resultado> {
  try {
    const ciclo = validarCicloDeEntrada(entrada)
    const userId = await requireUserId()
    await guardarCiclo(userId, ciclo)

    revalidatePath('/')
    revalidatePath('/presupuestos')
    revalidatePath('/historial')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

function mensaje(error: unknown): string {
  const texto = error instanceof Error ? error.message : ''

  if (texto.includes('categorías de gasto')) {
    return 'Solo se puede poner tope a categorías de gasto'
  }
  if (texto.includes('ciclo')) return 'Revisa los días que elegiste'
  if (texto.includes('No hay sesión')) return 'Tu sesión expiró. Vuelve a entrar.'
  return 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.'
}
