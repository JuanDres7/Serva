'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { updateDisplayName } from '@/lib/db/queries/settings'

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string }

export async function cambiarNombre(nombre: string): Promise<Resultado> {
  const limpio = nombre.trim()

  if (limpio === '') return { ok: false, error: 'Escribe un nombre' }
  if (limpio.length > 60) return { ok: false, error: 'El nombre es demasiado largo' }

  try {
    const userId = await requireUserId()
    await updateDisplayName(userId, limpio)

    revalidatePath('/')
    revalidatePath('/ajustes')
    return { ok: true }
  } catch {
    return { ok: false, error: 'No se pudo guardar el nombre' }
  }
}
