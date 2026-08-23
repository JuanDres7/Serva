import {
  type CivilDate,
  addDays,
  civilDateClamped,
  compareDates,
  daysBetween,
  lastDayOfMonth,
} from './civil-date'

/**
 * Periodicidad de los movimientos recurrentes (spec 007).
 *
 * Lógica pura: calcular cuándo toca el próximo cobro no necesita base de datos y
 * es donde están los errores sutiles.
 *
 * **Un cobro mensual no es cada 30 días.** Un cargo del día 5 avanzaría a 4 de
 * febrero, 6 de marzo, 5 de abril… desfasándose casi una semana en un año, y la
 * aplicación acabaría preguntando por el cobro el día equivocado (D-032).
 */

export type Periodicidad =
  | { readonly kind: 'monthly'; readonly day: number }
  | { readonly kind: 'every-n-days'; readonly n: number }

export class RecurrenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecurrenceError'
  }
}

export function validarPeriodicidad(periodicidad: Periodicidad): void {
  if (periodicidad.kind === 'monthly') {
    if (!Number.isInteger(periodicidad.day) || periodicidad.day < 1 || periodicidad.day > 31) {
      throw new RecurrenceError(`Día fuera de rango: ${periodicidad.day}`)
    }
    return
  }
  if (!Number.isInteger(periodicidad.n) || periodicidad.n < 1 || periodicidad.n > 365) {
    throw new RecurrenceError(`Número de días fuera de rango: ${periodicidad.n}`)
  }
}

/**
 * Fecha del cobro siguiente al de `desde`.
 *
 * Para lo mensual se avanza de mes en mes conservando el día configurado, no
 * sumando días: es lo que evita el desfase. Si el día no existe en el mes de
 * destino —el 31 en febrero—, se usa el último día (RN-003, FR-003).
 */
export function proximaFecha(periodicidad: Periodicidad, desde: CivilDate): CivilDate {
  validarPeriodicidad(periodicidad)

  if (periodicidad.kind === 'every-n-days') {
    return addDays(desde, periodicidad.n)
  }

  // El día configurado manda siempre, no el día en que se confirmó: si un cobro
  // del 5 se confirmó tarde, el siguiente vuelve a ser el 5.
  return civilDateClamped(desde.year, desde.month + 1, periodicidad.day)
}

/**
 * Primera fecha de cobro a partir de hoy, para un recurrente recién definido.
 */
export function primeraFecha(periodicidad: Periodicidad, hoy: CivilDate): CivilDate {
  validarPeriodicidad(periodicidad)

  if (periodicidad.kind === 'every-n-days') {
    return addDays(hoy, periodicidad.n)
  }

  const diaEsteMes = Math.min(periodicidad.day, lastDayOfMonth(hoy.year, hoy.month))

  // Si el día de este mes aún no pasó, el próximo cobro es este mes.
  return hoy.day < diaEsteMes
    ? civilDateClamped(hoy.year, hoy.month, periodicidad.day)
    : civilDateClamped(hoy.year, hoy.month + 1, periodicidad.day)
}

/** Un cobro está vencido cuando su fecha ya llegó o pasó. */
export function estaVencido(fecha: CivilDate, hoy: CivilDate): boolean {
  return compareDates(fecha, hoy) <= 0
}

/** Días de retraso de un cobro. Cero si aún no ha llegado su fecha. */
export function diasDeRetraso(fecha: CivilDate, hoy: CivilDate): number {
  return Math.max(0, daysBetween(fecha, hoy))
}

/**
 * Describe la periodicidad en palabras, para mostrarla.
 */
export function describirPeriodicidad(periodicidad: Periodicidad): string {
  if (periodicidad.kind === 'every-n-days') {
    if (periodicidad.n === 7) return 'Cada semana'
    if (periodicidad.n === 14) return 'Cada dos semanas'
    return `Cada ${periodicidad.n} días`
  }
  return `El ${periodicidad.day} de cada mes`
}
