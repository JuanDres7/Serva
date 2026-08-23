'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  crearMeta,
  moverEnMeta,
  eliminarMeta,
  guardarImagen,
  MAXIMO_IMAGEN_BYTES,
} from '@/lib/db/queries/goals'
import { todayIn } from '@/lib/domain/civil-date'

export type Resultado =
  | { readonly ok: true; readonly id?: string; readonly alcanzada?: boolean }
  | { readonly ok: false; readonly error: string }

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp']

function refrescar() {
  revalidatePath('/')
  revalidatePath('/metas')
  revalidatePath('/historial')
}

/**
 * Crea una meta, con su imagen si la trae.
 *
 * Se recibe como formulario porque incluye un archivo: la imagen propia del
 * usuario es el mecanismo de la funcionalidad, no un adorno (D-029).
 */
export async function nuevaMeta(datos: FormData): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const settings = await ensureUserSettings(userId)

    const nombre = String(datos.get('nombre') ?? '').trim()
    const objetivo = Number(datos.get('objetivoCents'))
    const fecha = String(datos.get('fechaObjetivo') ?? '').trim()

    if (nombre === '') return { ok: false, error: '¿Para qué estás ahorrando?' }
    if (!Number.isInteger(objetivo) || objetivo <= 0) {
      return { ok: false, error: 'Escribe cuánto necesitas reunir' }
    }

    const meta = await crearMeta(
      userId,
      {
        name: nombre,
        targetCents: objetivo,
        targetDate: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : null,
      },
      { currency: settings.currency },
    )

    const imagen = datos.get('imagen')
    if (imagen instanceof File && imagen.size > 0) {
      if (!TIPOS_ACEPTADOS.includes(imagen.type)) {
        return { ok: false, error: 'La imagen debe ser JPG, PNG o WebP' }
      }
      if (imagen.size > MAXIMO_IMAGEN_BYTES) {
        return {
          ok: false,
          error: `La imagen no puede pasar de ${Math.round(MAXIMO_IMAGEN_BYTES / 1024)} KB`,
        }
      }

      await guardarImagen(userId, meta.id, {
        datos: Buffer.from(await imagen.arrayBuffer()),
        tipo: imagen.type,
      })
    }

    refrescar()
    return { ok: true, id: meta.id }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

export async function aportarAMeta(
  id: string,
  amountCents: number,
  direccion: 'contribution' | 'withdrawal' = 'contribution',
): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const settings = await ensureUserSettings(userId)

    const resultado = await moverEnMeta(userId, id, {
      amountCents,
      direccion,
      fecha: todayIn(settings.timeZone),
    })
    if (!resultado) return { ok: false, error: 'No se encontró la meta' }

    refrescar()
    return { ok: true, alcanzada: resultado.reciénAlcanzada }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

export async function borrarMeta(id: string): Promise<Resultado> {
  try {
    const userId = await requireUserId()
    const borrada = await eliminarMeta(userId, id)
    if (!borrada) return { ok: false, error: 'No se encontró la meta' }

    refrescar()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: mensaje(error) }
  }
}

function mensaje(error: unknown): string {
  const texto = error instanceof Error ? error.message : ''

  if (texto.includes('más de lo que has aportado')) {
    return 'No puedes retirar más de lo que has aportado a esta meta'
  }
  if (texto.includes('mayor que cero')) return 'El monto debe ser mayor que cero'
  if (texto.includes('demasiado grande')) return 'La imagen es demasiado grande'
  if (texto.includes('No hay sesión')) return 'Tu sesión expiró. Vuelve a entrar.'
  return 'No se pudo completar la operación. Revisa los datos e inténtalo de nuevo.'
}
