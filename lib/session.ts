import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
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
 * El usuario de la petición, con lo poco que la interfaz necesita enseñar.
 *
 * Existe para no pedir la sesión dos veces cuando además del identificador hace
 * falta el correo. Sale de la misma fuente y con la misma garantía que
 * `currentUserId`: de la sesión del servidor, nunca de lo que mande el
 * navegador.
 */
export async function currentUser(): Promise<{ id: string; email: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  return { id: session.user.id, email: session.user.email }
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

/**
 * Igual que `requireUserId`, pero redirige en lugar de lanzar.
 *
 * Es la que deben usar las **páginas**: aunque el contenedor de la aplicación ya
 * comprueba la sesión, Next puede renderizar la página en paralelo con él, y una
 * excepción sin controlar ensucia los registros y puede llegar a mostrarse.
 *
 * Las acciones del servidor siguen usando `requireUserId`, porque ahí lanzar es
 * la respuesta correcta: no hay ninguna pantalla a la que llevar al usuario.
 */
export async function requireUserIdOrRedirect(): Promise<string> {
  const userId = await currentUserId()
  if (!userId) redirect('/entrar')
  return userId
}
