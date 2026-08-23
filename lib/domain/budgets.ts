/**
 * Presupuestos (spec 005).
 *
 * Lógica pura: el estado de un tope y la sugerencia a partir del historial.
 *
 * La idea que gobierna esta feature: el presupuesto no falla porque el usuario
 * gaste mucho, sino porque el número era ficción. Partir de lo que gasta de
 * verdad es lo que lo hace sostenible.
 */

export type NivelPresupuesto = 'holgado' | 'cerca' | 'excedido'

export type EstadoPresupuesto = {
  readonly gastadoCents: number
  readonly topeCents: number
  readonly restanteCents: number
  /** Puede pasar de 100 cuando se excede: la cifra real informa más que un tope. */
  readonly porcentaje: number
  readonly nivel: NivelPresupuesto
}

/**
 * Umbral de aviso.
 *
 * Al 100% ya no queda nada por hacer salvo sentirse mal. Al 80% todavía hay
 * margen de reaccionar, que es el único motivo por el que vale la pena
 * interrumpir a alguien (D-026, RN-003).
 */
export const UMBRAL_AVISO = 0.8

export function estadoDePresupuesto(
  gastadoCents: number,
  topeCents: number,
): EstadoPresupuesto {
  const porcentaje =
    topeCents <= 0 ? 0 : Math.round((gastadoCents / topeCents) * 1000) / 10

  const nivel: NivelPresupuesto =
    gastadoCents > topeCents
      ? 'excedido'
      : gastadoCents >= topeCents * UMBRAL_AVISO
        ? 'cerca'
        : 'holgado'

  return {
    gastadoCents,
    topeCents,
    restanteCents: topeCents - gastadoCents,
    porcentaje,
    nivel,
  }
}

/**
 * Redondea una cifra sugerida a algo que una persona escribiría.
 *
 * Proponer «$347.283» delata que es un cálculo y invita a discutirlo; «$350.000»
 * se acepta o se cambia, que es lo que se busca.
 */
export function redondearSugerencia(cents: number): number {
  if (cents <= 0) return 0

  const unidades = cents / 100
  const magnitud = Math.pow(10, Math.max(0, String(Math.round(unidades)).length - 2))
  const redondeado = Math.round(unidades / magnitud) * magnitud

  return Math.max(magnitud, redondeado) * 100
}

/**
 * Tope sugerido a partir del gasto real (FR-003, RN-005).
 *
 * Se propone algo por debajo del promedio, pero alcanzable: un recorte del diez
 * por ciento cambia el comportamiento sin condenar al usuario a fallar en la
 * segunda semana.
 */
export const RECORTE_SUGERIDO = 0.9

export function sugerirTope(promedioCents: number): number | null {
  if (promedioCents <= 0) return null
  return redondearSugerencia(Math.round(promedioCents * RECORTE_SUGERIDO))
}

/**
 * Promedio de gasto por período, a partir de lo gastado en cada uno.
 *
 * Se ignoran los períodos sin gasto en esa categoría: quien empezó a pedir
 * domicilios el mes pasado no tiene un promedio de «la mitad», tiene el de un
 * mes.
 */
export function promedioPorPeriodo(gastosPorPeriodo: readonly number[]): number {
  const conGasto = gastosPorPeriodo.filter((cents) => cents > 0)
  if (conGasto.length === 0) return 0

  return Math.round(conGasto.reduce((suma, cents) => suma + cents, 0) / conGasto.length)
}

export type MensajePresupuesto = {
  readonly texto: string
  readonly nivel: NivelPresupuesto
}

/**
 * Mensaje del estado de un presupuesto.
 *
 * **Nunca reprocha.** «¡Excediste tu presupuesto!» en rojo informa lo mismo que
 * decir cuánto se pasó, pero además castiga; y un usuario que se siente juzgado
 * deja de abrir la aplicación, que es el fracaso del producto (D-024, FR-010).
 */
export function mensajeDePresupuesto(
  estado: EstadoPresupuesto,
  diasRestantes: number,
): MensajePresupuesto {
  const dias =
    diasRestantes <= 0
      ? 'El período termina hoy'
      : diasRestantes === 1
        ? 'Queda 1 día del período'
        : `Quedan ${diasRestantes} días del período`

  if (estado.nivel === 'excedido') {
    return { texto: `Pasaste el tope. ${dias}.`, nivel: 'excedido' }
  }
  if (estado.nivel === 'cerca') {
    return { texto: `Te estás acercando al tope. ${dias}.`, nivel: 'cerca' }
  }
  return { texto: dias, nivel: 'holgado' }
}
