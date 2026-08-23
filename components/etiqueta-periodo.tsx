import type { Period } from '@/lib/domain/cycle'
import { lastDayOfMonth } from '@/lib/domain/civil-date'

/**
 * Nombre legible de un período.
 *
 * Cuando el ciclo coincide con el mes calendario, «agosto de 2026» es lo natural.
 * Cuando no —un ciclo del 15 al 14, por ejemplo—, el nombre de un mes sería
 * engañoso y se muestra el rango completo (D-025).
 */
export function EtiquetaPeriodo({
  periodo,
  locale,
}: {
  periodo: Period
  locale: string
}) {
  return <>{nombrarPeriodo(periodo, locale)}</>
}

export function nombrarPeriodo(periodo: Period, locale: string): string {
  const { start, end } = periodo

  const esMesCompleto =
    start.day === 1 &&
    start.year === end.year &&
    start.month === end.month &&
    end.day === lastDayOfMonth(end.year, end.month)

  if (esMesCompleto) {
    const nombre = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(Date.UTC(start.year, start.month - 1, 1))
    return nombre.charAt(0).toUpperCase() + nombre.slice(1)
  }

  const corto = (year: number, month: number, day: number) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(Date.UTC(year, month - 1, day))

  const desde = corto(start.year, start.month, start.day)
  const hasta = corto(end.year, end.month, end.day)
  const anio = start.year === end.year ? ` de ${end.year}` : ''

  return `${desde} – ${hasta}${anio}`
}
