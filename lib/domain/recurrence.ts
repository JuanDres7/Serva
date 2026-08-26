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
  /**
   * Una sola vez, en una fecha concreta (spec 010, E5).
   *
   * Sí, «un movimiento recurrente que ocurre una sola vez» es un oxímoron. Se
   * asume el nombre a cambio de reutilizar toda la maquinaria de la spec 007
   * —pendientes, confirmar, reprogramar, «¿te cobraron el monto de siempre?»—,
   * que es exactamente lo que pide «tengo que pagar 200 mil el martes»: que
   * aparezca para confirmar cuando llegue el día. Una entidad paralela la
   * duplicaría entera para ganar solo un nombre más exacto (Art. VIII).
   */
  | { readonly kind: 'once'; readonly on: CivilDate }

export class RecurrenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RecurrenceError'
  }
}

export function validarPeriodicidad(periodicidad: Periodicidad): void {
  if (periodicidad.kind === 'once') {
    // La fecha ya viene validada por el tipo `CivilDate`; lo único que hay que
    // impedir es que se cuele una fecha imposible por otra vía.
    if (!Number.isInteger(periodicidad.on.year) || periodicidad.on.month < 1) {
      throw new RecurrenceError('Fecha inválida para un cobro de una sola vez')
    }
    return
  }
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

  if (periodicidad.kind === 'once') {
    // No hay siguiente. Quien confirma un cobro de una sola vez lo archiva en
    // lugar de reprogramarlo, así que llegar aquí es un error de llamada.
    throw new RecurrenceError('Un cobro de una sola vez no se reprograma: se archiva')
  }

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

  if (periodicidad.kind === 'once') return periodicidad.on

  if (periodicidad.kind === 'every-n-days') {
    return addDays(hoy, periodicidad.n)
  }

  const diaEsteMes = Math.min(periodicidad.day, lastDayOfMonth(hoy.year, hoy.month))

  // Si el día de este mes aún no pasó, el próximo cobro es este mes.
  return hoy.day < diaEsteMes
    ? civilDateClamped(hoy.year, hoy.month, periodicidad.day)
    : civilDateClamped(hoy.year, hoy.month + 1, periodicidad.day)
}

/** Un cobro de una sola vez no se repite: al confirmarlo se archiva. */
export function seRepite(periodicidad: Periodicidad): boolean {
  return periodicidad.kind !== 'once'
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
  if (periodicidad.kind === 'once') return 'Una sola vez'

  if (periodicidad.kind === 'every-n-days') {
    if (periodicidad.n === 7) return 'Cada semana'
    if (periodicidad.n === 14) return 'Cada dos semanas'
    return `Cada ${periodicidad.n} días`
  }
  return `El ${periodicidad.day} de cada mes`
}

export type ResultadoPeriodicidad =
  | { readonly ok: true; readonly periodicidad: Periodicidad }
  | { readonly ok: false; readonly necesitaDia: boolean }

/**
 * Resuelve el texto del modelo a una Periodicidad soportada (spec 012, §4).
 *
 * «cada mes el 5» → monthly/5, «semanal» → every-n-days/7, «quincenal» →
 * every-n-days/15. Sin día para mensual → necesitaDia.
 */
export function resolverPeriodicidad(texto: string): ResultadoPeriodicidad {
  const normalizado = texto.toLowerCase().trim()

  // Mensual con día
  const mensualConDia = normalizado.match(
    /cada\s+mes\s+(?:el\s+)?(\d{1,2})/,
  )
  if (mensualConDia) {
    const day = parseInt(mensualConDia[1]!, 10)
    if (day >= 1 && day <= 31) {
      return { ok: true, periodicidad: { kind: 'monthly', day } }
    }
  }

  // Mensual sin día
  if (
    normalizado === 'cada mes' ||
    normalizado === 'mensual' ||
    normalizado === 'mes'
  ) {
    return { ok: false, necesitaDia: true }
  }

  // Semanal
  if (
    normalizado === 'semanal' ||
    normalizado === 'cada semana' ||
    normalizado === 'semana'
  ) {
    return { ok: true, periodicidad: { kind: 'every-n-days', n: 7 } }
  }

  // Quincenal
  if (
    normalizado === 'quincenal' ||
    normalizado === 'cada dos semanas' ||
    normalizado === 'quincena'
  ) {
    return { ok: true, periodicidad: { kind: 'every-n-days', n: 15 } }
  }

  // Diario
  if (
    normalizado === 'diario' ||
    normalizado === 'cada día' ||
    normalizado === 'todos los días'
  ) {
    return { ok: true, periodicidad: { kind: 'every-n-days', n: 1 } }
  }

  // Anual
  if (
    normalizado === 'anual' ||
    normalizado === 'cada año' ||
    normalizado === 'una vez al año'
  ) {
    return { ok: true, periodicidad: { kind: 'every-n-days', n: 365 } }
  }

  // «cada X días»
  const cadaXDias = normalizado.match(/cada\s+(\d{1,3})\s+días?/)
  if (cadaXDias) {
    const n = parseInt(cadaXDias[1]!, 10)
    if (n >= 1 && n <= 365) {
      return { ok: true, periodicidad: { kind: 'every-n-days', n } }
    }
  }

  return { ok: false, necesitaDia: false }
}
