import { currentUserId } from '@/lib/session'
import { leerImagen } from '@/lib/db/queries/goals'

/**
 * Imagen de una meta.
 *
 * Va acotada al usuario de la sesión como cualquier otra consulta: las fotos que
 * alguien sube a sus metas son suyas, y conocer el identificador de una meta
 * ajena no debe bastar para ver su imagen (Art. VI.1).
 */
export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await currentUserId()
  if (!userId) return new Response('No autorizado', { status: 401 })

  const { id } = await params
  const imagen = await leerImagen(userId, id)
  if (!imagen) return new Response('No encontrada', { status: 404 })

  return new Response(new Uint8Array(imagen.datos), {
    headers: {
      'Content-Type': imagen.tipo,
      // Privada: nunca en una caché compartida.
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
