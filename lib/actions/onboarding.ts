'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { completarConfiguracion } from '@/lib/db/queries/settings'
import { countTransactions } from '@/lib/db/queries/transactions'
import { buscarPais } from '@/lib/domain/countries'

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

export async function guardarConfiguracionInicial(datos: {
  displayName: string
  country: string
}): Promise<Resultado> {
  const nombre = datos.displayName.trim()

  if (nombre === '') return { ok: false, error: 'Escribe cómo quieres que te llamemos' }
  if (nombre.length > 60) return { ok: false, error: 'Ese nombre es demasiado largo' }
  if (!buscarPais(datos.country)) return { ok: false, error: 'Elige tu país' }

  try {
    const userId = await requireUserId()

    // La moneda solo se fija mientras no haya movimientos: después, cambiarla
    // falsearía todo el historial porque los montos guardados no se convierten
    // (FR-011 de la spec 004).
    if ((await countTransactions(userId)) > 0) {
      return {
        ok: false,
        error: 'Ya tienes movimientos registrados: la moneda no se puede cambiar',
      }
    }

    await completarConfiguracion(userId, { displayName: nombre, country: datos.country })

    revalidatePath('/')
    revalidatePath('/ajustes')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo guardar la configuración' }
  }
}
