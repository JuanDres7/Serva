/**
 * Fechas civiles: días del calendario, no instantes en el tiempo.
 *
 * La fecha de un movimiento es «el 31 de agosto», no «un momento concreto». Si se
 * guardara como instante, un usuario que abriera la aplicación desde otra zona
 * horaria vería ese gasto saltar al mes siguiente, y con él todos los totales del
 * período.
 *
 * La aritmética se hace en UTC a propósito: no porque la fecha esté en UTC, sino
 * porque UTC no tiene horario de verano y por tanto todos los días duran lo mismo.
 */

export type CivilDate = {
  readonly year: number
  /** 1 a 12. */
  readonly month: number
  /** 1 a 31. */
  readonly day: number
}

export class CivilDateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CivilDateError'
  }
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function civilDate(year: number, month: number, day: number): CivilDate {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new CivilDateError('Una fecha civil se compone de enteros')
  }
  if (month < 1 || month > 12) {
    throw new CivilDateError(`Mes fuera de rango: ${month}`)
  }
  const max = lastDayOfMonth(year, month)
  if (day < 1 || day > max) {
    throw new CivilDateError(
      `El día ${day} no existe en ${month}/${year}: ese mes tiene ${max} días`,
    )
  }
  return { year, month, day }
}

/**
 * Construye una fecha ajustando el día al último del mes cuando no existe.
 *
 * Es la regla que comparten los ciclos de pago y los movimientos recurrentes: quien
 * configura el día 31 espera que en febrero se use el día 28 (D-025).
 */
export function civilDateClamped(year: number, month: number, day: number): CivilDate {
  const normalizedYear = year + Math.floor((month - 1) / 12)
  const normalizedMonth = ((((month - 1) % 12) + 12) % 12) + 1
  const max = lastDayOfMonth(normalizedYear, normalizedMonth)
  return civilDate(normalizedYear, normalizedMonth, Math.min(day, max))
}

export function toISO(date: CivilDate): string {
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${date.year}-${m}-${d}`
}

export function fromISO(value: string): CivilDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new CivilDateError(`Fecha no reconocida: "${value}". Se espera AAAA-MM-DD`)
  }
  return civilDate(Number(match[1]), Number(match[2]), Number(match[3]))
}

const MS_PER_DAY = 86_400_000

function toEpochDay(date: CivilDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / MS_PER_DAY
}

function fromEpochDay(days: number): CivilDate {
  const d = new Date(days * MS_PER_DAY)
  return civilDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function addDays(date: CivilDate, days: number): CivilDate {
  return fromEpochDay(toEpochDay(date) + days)
}

/** Días desde `from` hasta `to`. Negativo si `to` es anterior. */
export function daysBetween(from: CivilDate, to: CivilDate): number {
  return toEpochDay(to) - toEpochDay(from)
}

/** Negativo, cero o positivo, como todo comparador. */
export function compareDates(a: CivilDate, b: CivilDate): number {
  return toEpochDay(a) - toEpochDay(b)
}

export function isSameDate(a: CivilDate, b: CivilDate): boolean {
  return compareDates(a, b) === 0
}

/** Día de la semana: 0 domingo, 6 sábado. */
export function weekdayOf(date: CivilDate): number {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()
}

export function addMonths(date: CivilDate, months: number): CivilDate {
  return civilDateClamped(date.year, date.month + months, date.day)
}

/** La fecha civil de hoy en la zona horaria indicada. */
export function todayIn(timeZone: string, now: Date = new Date()): CivilDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return fromISO(parts)
}
