'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { cerrarConversacion } from '@/lib/db/queries/conversations'

/**
 * Empezar de cero con Serva AI (spec 003, FR-019 · E8).
 *
 * El usuario sale de la sesión del servidor, nunca de un parámetro: así no hay
 * forma de cerrar la conversación de otra cuenta.
 */
export async function empezarConversacion(): Promise<void> {
  const userId = await requireUserId()
  await cerrarConversacion(userId)
  revalidatePath('/asistente')
}
