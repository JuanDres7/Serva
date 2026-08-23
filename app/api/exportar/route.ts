import { currentUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { listTransactions } from '@/lib/db/queries/transactions'
import { construirLibro, nombreDeArchivo } from '@/lib/export/excel'
import { todayIn, toISO, fromISO } from '@/lib/domain/civil-date'
import { periodFor } from '@/lib/domain/cycle'

/** Tope de filas por exportación. Muy por encima de cualquier uso real. */
const MAXIMO = 10_000

/**
 * Descarga del historial en hoja de cálculo (spec 009).
 *
 * Es una ruta y no una acción del servidor porque el navegador tiene que recibir
 * un archivo, no una respuesta que la aplicación interprete.
 */
export async function GET(peticion: Request) {
  const userId = await currentUserId()
  if (!userId) {
    return new Response('No autorizado', { status: 401 })
  }

  const settings = await ensureUserSettings(userId)
  const url = new URL(peticion.url)
  const hoy = todayIn(settings.timeZone)

  // Sin rango indicado se exporta todo el historial (FR-005).
  const desde = url.searchParams.get('desde')
  const hasta = url.searchParams.get('hasta')
  const periodo =
    desde && hasta
      ? { start: fromISO(desde), end: fromISO(hasta) }
      : url.searchParams.get('periodo') === 'actual'
        ? periodFor(settings.cycleConfig, hoy)
        : undefined

  const movimientos = await listTransactions(userId, {
    period: periodo,
    // Los anulados se incluyen, identificados como tales: son datos del usuario
    // y el Artículo VI dice que se lleva todo lo suyo.
    includeVoided: true,
    limit: MAXIMO,
  })

  if (movimientos.length === 0) {
    // FR-009: se avisa en lugar de entregar un archivo vacío sin explicación.
    return new Response('No hay movimientos en el rango elegido', { status: 404 })
  }

  const libro = await construirLibro(movimientos, {
    locale: settings.locale,
    currency: settings.currency,
  })

  return new Response(new Uint8Array(libro), {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreDeArchivo(toISO(hoy))}"`,
      'Cache-Control': 'no-store',
    },
  })
}
