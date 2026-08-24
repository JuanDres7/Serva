/**
 * Períodos y ciclos.
 *
 * Todo total, filtro y comparación de Serva se calcula sobre un período, y un
 * período se deriva de un ciclo. El mes calendario es solo uno de los ciclos
 * posibles, no un caso especial (D-025).
 *
 * Reglas que este módulo garantiza:
 * - Si el día configurado no existe en el mes, se usa el último día del mes.
 * - Los ciclos no se desplazan por fines de semana ni festivos: son reglas de
 *   calendario, no fechas de depósito. Desplazarlos produciría períodos solapados
 *   o con huecos.
 * - Los períodos consecutivos son contiguos: sin solapes y sin días huérfanos.
 */

import {
  type CivilDate,
  addDays,
  civilDateClamped,
  compareDates,
  daysBetween,
  lastDayOfMonth,
  weekdayOf,
} from './civil-date'

export type CycleConfig =
  | { readonly kind: 'calendar-month' }
  | { readonly kind: 'monthly'; readonly day: number }
  | { readonly kind: 'semi-monthly'; readonly days: readonly [number, number] }
  | { readonly kind: 'weekly'; readonly weekday: number }
  | { readonly kind: 'every-n-days'; readonly n: number; readonly anchor: CivilDate }

/** Rango de fechas de un período. Ambos extremos incluidos. */
export type Period = {
  readonly start: CivilDate
  readonly end: CivilDate
}

export class CycleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CycleError'
  }
}

export const CALENDAR_MONTH: CycleConfig = { kind: 'calendar-month' }

export function validateCycle(config: CycleConfig): void {
  switch (config.kind) {
    case 'calendar-month':
      return
    case 'monthly':
      if (!Number.isInteger(config.day) || config.day < 1 || config.day > 31) {
        throw new CycleError(`Día de ciclo fuera de rango: ${config.day}`)
      }
      return
    case 'semi-monthly': {
      const [a, b] = config.days
      if (![a, b].every((d) => Number.isInteger(d) && d >= 1 && d <= 31)) {
        throw new CycleError(`Días de ciclo fuera de rango: ${a} y ${b}`)
      }
      if (a >= b) {
        throw new CycleError(
          `Los dos días del ciclo deben ir en orden ascendente y ser distintos: ${a} y ${b}`,
        )
      }
      return
    }
    case 'weekly':
      if (!Number.isInteger(config.weekday) || config.weekday < 0 || config.weekday > 6) {
        throw new CycleError(`Día de la semana fuera de rango: ${config.weekday}`)
      }
      return
    case 'every-n-days':
      if (!Number.isInteger(config.n) || config.n < 1) {
        throw new CycleError(`El número de días debe ser positivo: ${config.n}`)
      }
      return
  }
}

/** Inicio del período que contiene la fecha dada. */
function startOfPeriod(config: CycleConfig, date: CivilDate): CivilDate {
  switch (config.kind) {
    case 'calendar-month':
      return civilDateClamped(date.year, date.month, 1)

    case 'monthly': {
      const anchorThisMonth = Math.min(config.day, lastDayOfMonth(date.year, date.month))
      if (date.day >= anchorThisMonth) {
        return civilDateClamped(date.year, date.month, config.day)
      }
      return civilDateClamped(date.year, date.month - 1, config.day)
    }

    case 'semi-monthly': {
      const [first, second] = config.days
      const dim = lastDayOfMonth(date.year, date.month)
      const firstThisMonth = Math.min(first, dim)
      const secondThisMonth = Math.min(second, dim)

      if (date.day >= secondThisMonth) {
        return civilDateClamped(date.year, date.month, second)
      }
      if (date.day >= firstThisMonth) {
        return civilDateClamped(date.year, date.month, first)
      }
      return civilDateClamped(date.year, date.month - 1, second)
    }

    case 'weekly': {
      const delta = (weekdayOf(date) - config.weekday + 7) % 7
      return addDays(date, -delta)
    }

    case 'every-n-days': {
      const elapsed = daysBetween(config.anchor, date)
      // Math.floor también con diferencias negativas: sirve para fechas
      // anteriores a la de referencia.
      const completed = Math.floor(elapsed / config.n)
      return addDays(config.anchor, completed * config.n)
    }
  }
}

/** Inicio del período siguiente al que empieza en `start`. */
function nextStart(config: CycleConfig, start: CivilDate): CivilDate {
  switch (config.kind) {
    case 'calendar-month':
      return civilDateClamped(start.year, start.month + 1, 1)

    case 'monthly':
      return civilDateClamped(start.year, start.month + 1, config.day)

    case 'semi-monthly': {
      const [first, second] = config.days
      const dim = lastDayOfMonth(start.year, start.month)
      const isSecondHalf = start.day >= Math.min(second, dim)
      return isSecondHalf
        ? civilDateClamped(start.year, start.month + 1, first)
        : civilDateClamped(start.year, start.month, second)
    }

    case 'weekly':
      return addDays(start, 7)

    case 'every-n-days':
      return addDays(start, config.n)
  }
}

/** Inicio del período anterior al que empieza en `start`. */
function previousStart(config: CycleConfig, start: CivilDate): CivilDate {
  switch (config.kind) {
    case 'calendar-month':
      return civilDateClamped(start.year, start.month - 1, 1)

    case 'monthly':
      return civilDateClamped(start.year, start.month - 1, config.day)

    case 'semi-monthly': {
      const [first, second] = config.days
      const dim = lastDayOfMonth(start.year, start.month)
      const isSecondHalf = start.day >= Math.min(second, dim)
      return isSecondHalf
        ? civilDateClamped(start.year, start.month, first)
        : civilDateClamped(start.year, start.month - 1, second)
    }

    case 'weekly':
      return addDays(start, -7)

    case 'every-n-days':
      return addDays(start, -config.n)
  }
}

/** Período que contiene la fecha dada. */
export function periodFor(config: CycleConfig, date: CivilDate): Period {
  validateCycle(config)
  const start = startOfPeriod(config, date)
  return { start, end: addDays(nextStart(config, start), -1) }
}

export function nextPeriod(config: CycleConfig, period: Period): Period {
  const start = nextStart(config, period.start)
  return { start, end: addDays(nextStart(config, start), -1) }
}

export function previousPeriod(config: CycleConfig, period: Period): Period {
  const start = previousStart(config, period.start)
  return { start, end: addDays(period.start, -1) }
}

export function containsDate(period: Period, date: CivilDate): boolean {
  return compareDates(date, period.start) >= 0 && compareDates(date, period.end) <= 0
}

export function periodLengthInDays(period: Period): number {
  return daysBetween(period.start, period.end) + 1
}
