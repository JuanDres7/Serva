import { type CivilDate, addDays, daysBetween } from './civil-date'

/**
 * Progreso y proyección de las metas de ahorro (spec 006).
 *
 * Lógica pura. Lo que motiva no son las frases bonitas sino los datos: «al ritmo
 * actual la tienes en marzo» engancha, «¡tú puedes!» se ignora a la tercera vez
 * (D-029).
 */

export type EstadoMeta = {
  readonly aportadoCents: number
  readonly objetivoCents: number
  /** Entre 0 y 100, redondeado a un decimal. */
  readonly porcentaje: number
  readonly faltaCents: number
  readonly alcanzada: boolean
}

export function calcularEstado(aportadoCents: number, objetivoCents: number): EstadoMeta {
  const alcanzada = aportadoCents >= objetivoCents
  const porcentaje =
    objetivoCents <= 0
      ? 0
      : Math.min(100, Math.round((aportadoCents / objetivoCents) * 1000) / 10)

  return {
    aportadoCents,
    objetivoCents,
    porcentaje,
    faltaCents: Math.max(0, objetivoCents - aportadoCents),
    alcanzada,
  }
}

export type Aporte = {
  readonly fecha: CivilDate
  readonly cents: number
}

/**
 * Ritmo de ahorro en centavos por día.
 *
 * Se mide desde el primer aporte hasta hoy, no desde la creación de la meta:
 * quien la creó hace meses y empezó a aportar la semana pasada tiene el ritmo de
 * esta semana, no un promedio diluido que le diría que tardará años.
 */
export function ritmoDiario(aportes: readonly Aporte[], hoy: CivilDate): number | null {
  if (aportes.length === 0) return null

  const netos = aportes.reduce((suma, a) => suma + a.cents, 0)
  if (netos <= 0) return null

  const primero = aportes.reduce((min, a) => (daysBetween(a.fecha, min.fecha) > 0 ? a : min))
  // Un solo día cuenta como un día, no como cero: dividir por cero daría infinito.
  const dias = Math.max(1, daysBetween(primero.fecha, hoy))

  return netos / dias
}

/**
 * Fecha estimada de llegada al ritmo actual (FR-009).
 *
 * Devuelve `null` cuando no hay ritmo del que proyectar o cuando la estimación
 * se iría tan lejos que dejaría de significar nada: decir «la tendrás en 2074»
 * no informa, desanima.
 */
const HORIZONTE_MAXIMO_DIAS = 365 * 10

export function fechaEstimada(
  estado: EstadoMeta,
  ritmo: number | null,
  hoy: CivilDate,
): CivilDate | null {
  if (estado.alcanzada) return hoy
  if (ritmo === null || ritmo <= 0) return null

  const dias = Math.ceil(estado.faltaCents / ritmo)
  if (dias > HORIZONTE_MAXIMO_DIAS) return null

  return addDays(hoy, dias)
}

/**
 * Cuánto habría que aportar por período para llegar a la fecha objetivo
 * (FR-010).
 */
export function aporteNecesario(
  estado: EstadoMeta,
  objetivo: CivilDate,
  hoy: CivilDate,
  diasPorPeriodo = 30,
): number | null {
  if (estado.alcanzada) return 0

  const dias = daysBetween(hoy, objetivo)
  // Una fecha ya pasada no permite repartir nada: no hay períodos por delante.
  if (dias <= 0) return null

  const periodos = Math.max(1, dias / diasPorPeriodo)
  return Math.ceil(estado.faltaCents / periodos)
}

export type MensajeProgreso = {
  readonly texto: string
  /** Datos para que la interfaz formatee los montos con la moneda del usuario. */
  readonly aporteSugeridoCents?: number
}

/**
 * Mensaje de avance, siempre a partir de los datos.
 *
 * **Nunca reprocha.** Si se va con retraso se ofrece la palanca —cuánto habría
 * que aportar— y no un «a este ritmo llegarías en 2031», que solo desanima
 * (D-029, FR-014).
 */
export function mensajeDeProgreso(params: {
  estado: EstadoMeta
  ritmo: number | null
  hoy: CivilDate
  fechaObjetivo?: CivilDate | null
  locale: string
}): MensajeProgreso {
  const { estado, ritmo, hoy, fechaObjetivo, locale } = params

  if (estado.alcanzada) {
    return { texto: '¡Meta alcanzada!' }
  }

  if (fechaObjetivo) {
    const necesario = aporteNecesario(estado, fechaObjetivo, hoy)
    if (necesario === null) {
      return { texto: 'La fecha objetivo ya pasó. Puedes ajustarla cuando quieras.' }
    }
    return {
      texto: 'Aportando esto al mes llegas a tiempo',
      aporteSugeridoCents: necesario,
    }
  }

  const estimada = fechaEstimada(estado, ritmo, hoy)
  if (!estimada) {
    return { texto: 'Registra un aporte para ver cuándo la alcanzarías' }
  }

  const nombreMes = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(estimada.year, estimada.month - 1, estimada.day))

  return { texto: `Al ritmo actual, la tienes en ${nombreMes}` }
}
