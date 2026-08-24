'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { todayIn } from '@/lib/domain/civil-date'
import {
  leerPropuesta,
  aplicarCreacion,
  aplicarCorreccion,
  aplicarAnulacion,
  revertir,
  descartar,
  activarAutomatico,
  revocarAutomatico,
  type MotivoFallo,
} from '@/lib/db/queries/assistant-writes'

/**
 * Los botones de la tarjeta de Serva AI (spec 010, FR-012).
 *
 * **Reciben un identificador, nunca un cuerpo de movimientos.** Lo que se va a
 * escribir ya está guardado en el servidor desde que se propuso: si el cliente
 * mandara los datos, quien manipule la petición escribiría lo que quisiera
 * saltándose la extracción entera.
 *
 * El usuario sale de la sesión, así que una propuesta ajena no se encuentra y
 * no se puede aplicar.
 */

export type Resultado =
  | { readonly ok: true }
  | { readonly ok: false; readonly mensaje: string }

const MENSAJES: Record<MotivoFallo, string> = {
  'no-existe': 'Esa acción ya no está disponible.',
  'ya-resuelta': 'Esto ya se resolvió antes.',
  caducada: 'Pasó demasiado tiempo desde que lo propuse. Vuelve a decírmelo.',
  'nada-que-hacer': 'No había nada que registrar.',
}

function refrescar() {
  revalidatePath('/asistente')
  revalidatePath('/historial')
  revalidatePath('/')
}

/** Confirma lo que Serva propuso. */
export async function confirmarAccion(propuestaId: string): Promise<Resultado> {
  const userId = await requireUserId()
  const propuesta = await leerPropuesta(userId, propuestaId)
  if (!propuesta) return { ok: false, mensaje: MENSAJES['no-existe'] }

  const settings = await ensureUserSettings(userId)

  const resultado =
    propuesta.kind === 'crear'
      ? await aplicarCreacion({
          userId,
          id: propuestaId,
          currency: settings.currency,
          hoy: todayIn(settings.timeZone),
        })
      : propuesta.kind === 'corregir'
        ? await aplicarCorreccion({ userId, id: propuestaId })
        : await aplicarAnulacion({ userId, id: propuestaId })

  if (!resultado.ok) return { ok: false, mensaje: MENSAJES[resultado.motivo] }

  refrescar()
  return { ok: true }
}

/**
 * Deshace lo que Serva escribió (FR-023).
 *
 * No pide confirmación adicional. No es una excepción a la regla de que lo
 * destructivo confirma: deshacer devuelve a la persona donde estaba, y lo que
 * se anula lo escribió la IA hace un momento, no ella hace semanas.
 */
export async function revertirAccion(propuestaId: string): Promise<Resultado> {
  const userId = await requireUserId()
  const resultado = await revertir({ userId, id: propuestaId })

  if (!resultado.ok) return { ok: false, mensaje: MENSAJES[resultado.motivo] }

  refrescar()
  return { ok: true }
}

/** Descarta una propuesta sin aplicarla. */
export async function cancelarAccion(propuestaId: string): Promise<Resultado> {
  const userId = await requireUserId()
  await descartar(userId, propuestaId)
  refrescar()
  return { ok: true }
}

/**
 * Activa el registro automático, desde el chat (Art. II.1, FR-007).
 *
 * Confirma la propuesta en curso y además deja constancia de que a partir de
 * ahora no hace falta preguntar. Las dos cosas en un gesto: la persona dijo
 * «sí, y no me preguntes más», no dos frases distintas.
 */
export async function confirmarYActivar(propuestaId: string): Promise<Resultado> {
  const userId = await requireUserId()
  await activarAutomatico(userId)
  return confirmarAccion(propuestaId)
}

/** Revoca el registro automático (FR-008). */
export async function revocarAutomatismo(): Promise<Resultado> {
  const userId = await requireUserId()
  await revocarAutomatico(userId)
  refrescar()
  return { ok: true }
}
