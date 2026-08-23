import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * Usuario de la petición en curso.
 *
 * **Toda consulta a datos parte de aquí, nunca de un identificador enviado por el
 * cliente** (Art. VI.1, plan 001 §6). Un identificador que llega del navegador es
 * una sugerencia del visitante, no una identidad comprobada.
 */
export async function currentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user.id ?? null
}

/**
 * Igual que `currentUserId`, pero exige sesión.
 *
 * Es la que deben usar las páginas y acciones con datos del usuario: si no hay
 * sesión, falla en lugar de continuar con datos de nadie (FR-008 de la spec 000).
 */
export async function requireUserId(): Promise<string> {
  const userId = await currentUserId()
  if (!userId) {
    throw new Error('No hay sesión activa')
  }
  return userId
}
