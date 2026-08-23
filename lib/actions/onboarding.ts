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

    // Con movimientos ya registrados la moneda se conserva, pero la
    // configuración se completa igual. Bloquearla dejaría atrapada a cualquier
    // cuenta anterior a esta pantalla: el contenedor la manda aquí y aquí no
    // podría salir.
    const conservarMoneda = (await countTransactions(userId)) > 0

    await completarConfiguracion(userId, {
      displayName: nombre,
      country: datos.country,
      conservarMoneda,
    })

    revalidatePath('/')
    revalidatePath('/ajustes')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo guardar la configuración' }
  }
}
