import {
  type CivilDate,
  addDays,
  daysBetween,
  toISO,
} from './civil-date'
import type { Period } from './cycle'

/**
 * Series para los gráficos de evolución y ritmo (spec 008).
 *
 * Lógica pura: recibe cifras ya agregadas por la base y las convierte en series
 * listas para dibujar. Rellenar huecos y acumular es donde están los errores
 * sutiles, así que vive aquí, donde se prueba sin base de datos.
 */

export type GastoDiario = {
  readonly dia: string
  readonly cents: number
}

export type PuntoAcumulado = {
  /** Día del período, empezando en 1. */
  readonly dia: number
  readonly fecha: string
  readonly actual: number | null
  readonly anterior: number | null
}

/**
 * Convierte gastos sueltos por día en una curva acumulada del período.
 *
 * **Los días sin gasto tienen que aparecer.** Si se omitieran, la curva daría un
 * salto de un día al siguiente y parecería que se gastó en un día lo de tres.
 *
 * El período actual se corta en el día de hoy: dibujar la línea plana hasta fin
 * de mes haría creer que se dejó de gastar.
 */
export function acumularPeriodo(
  gastos: readonly GastoDiario[],
  periodo: Period,
  hasta?: CivilDate,
): { readonly dia: number; readonly fecha: string; readonly cents: number }[] {
  const porDia = new Map(gastos.map((g) => [g.dia, g.cents]))
  const totalDias = daysBetween(periodo.start, periodo.end) + 1
  const limite = hasta ? daysBetween(periodo.start, hasta) + 1 : totalDias

  const serie: { dia: number; fecha: string; cents: number }[] = []
  let acumulado = 0

  for (let i = 0; i < Math.min(totalDias, Math.max(limite, 0)); i += 1) {
    const fecha = addDays(periodo.start, i)
    acumulado += porDia.get(toISO(fecha)) ?? 0
    serie.push({ dia: i + 1, fecha: toISO(fecha), cents: acumulado })
  }

  return serie
}

/**
 * Superpone el período actual sobre el anterior, día a día.
 *
 * Es el gráfico que avisa a mitad de período de que se va más rápido de lo
 * normal, cuando todavía se puede reaccionar (D-034).
 */
export function compararRitmo(
  actual: readonly GastoDiario[],
  anterior: readonly GastoDiario[],
  periodos: { actual: Period; anterior: Period },
  hoy: CivilDate,
): PuntoAcumulado[] {
  const serieActual = acumularPeriodo(actual, periodos.actual, hoy)
  const serieAnterior = acumularPeriodo(anterior, periodos.anterior)

  // Los períodos pueden tener distinta cantidad de días —febrero y marzo, sin ir
  // más lejos—, así que la comparación se hace por número de día, no por fecha.
  const dias = Math.max(serieActual.length, serieAnterior.length)
  const puntos: PuntoAcumulado[] = []

  for (let i = 0; i < dias; i += 1) {
    puntos.push({
      dia: i + 1,
      fecha: serieActual[i]?.fecha ?? serieAnterior[i]?.fecha ?? '',
      actual: serieActual[i]?.cents ?? null,
      anterior: serieAnterior[i]?.cents ?? null,
    })
  }

  return puntos
}

export type PuntoEvolucion = {
  readonly etiqueta: string
  readonly ingresos: number
  readonly gastos: number
}

/** Indica si el gasto del período va por encima del anterior a la misma altura. */
export function ritmoRelativo(puntos: readonly PuntoAcumulado[]): {
  readonly diferencia: number
  readonly porcentaje: number | null
} | null {
  const ultimoConAmbos = [...puntos].reverse().find((p) => p.actual !== null && p.anterior !== null)
  if (!ultimoConAmbos || ultimoConAmbos.anterior === null || ultimoConAmbos.actual === null) {
    return null
  }

  const diferencia = ultimoConAmbos.actual - ultimoConAmbos.anterior
  return {
    diferencia,
    porcentaje:
      ultimoConAmbos.anterior === 0
        ? null
        : Math.round((diferencia / ultimoConAmbos.anterior) * 1000) / 10,
  }
}
