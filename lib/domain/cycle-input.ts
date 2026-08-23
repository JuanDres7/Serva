import { z } from 'zod'
import { validateCycle, type CycleConfig } from './cycle'
import { civilDate } from './civil-date'

/**
 * Validación del ciclo que llega desde la interfaz (spec 005, FR-012).
 *
 * El motor de períodos existe desde la feature 001 y admite las cinco formas;
 * esto es solo la puerta de entrada, que comprueba lo que envía el navegador
 * antes de dejarlo pasar.
 */

const cicloSchema = z.union([
  z.object({ kind: z.literal('calendar-month') }),
  z.object({ kind: z.literal('monthly'), day: z.number().int().min(1).max(31) }),
  z.object({
    kind: z.literal('semi-monthly'),
    days: z.tuple([z.number().int().min(1).max(31), z.number().int().min(1).max(31)]),
  }),
  z.object({ kind: z.literal('weekly'), weekday: z.number().int().min(0).max(6) }),
  z.object({
    kind: z.literal('every-n-days'),
    n: z.number().int().min(1).max(365),
    anchor: z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    }),
  }),
])

export function validarCicloDeEntrada(entrada: unknown): CycleConfig {
  const resultado = cicloSchema.safeParse(entrada)
  if (!resultado.success) {
    throw new Error('El ciclo no es válido')
  }

  const ciclo = resultado.data
  if (ciclo.kind === 'every-n-days') {
    // La fecha de referencia debe existir de verdad: un 31 de febrero rompería
    // todos los cálculos posteriores.
    civilDate(ciclo.anchor.year, ciclo.anchor.month, ciclo.anchor.day)
  }

  // El motor de períodos aplica sus propias reglas, como que los dos días de un
  // ciclo quincenal vayan en orden y sean distintos.
  validateCycle(ciclo as CycleConfig)
  return ciclo as CycleConfig
}
