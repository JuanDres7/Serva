import { z } from 'zod'
import { CATEGORIES, type MovementKind } from '@/lib/domain/categories'

/**
 * Esquemas de todo lo que devuelve el modelo.
 *
 * Artículo III: ninguna respuesta entra al sistema como texto libre. Se valida
 * antes de tocar la base de datos o la interfaz.
 *
 * Que la categoría sea un enumerado y no una cadena es deliberado: un modelo
 * pequeño inventa categorías con facilidad —«comida», «restaurante», «Alimentos»—
 * y el esquema las rechaza antes de que lleguen a ninguna parte.
 */

const CLAVES = CATEGORIES.map((c) => c.key) as [string, ...string[]]

export const sugerenciaSchema = z.object({
  categoria: z.enum(CLAVES),
  confianza: z.number().min(0).max(1),
  descripcionCorta: z.string().trim().min(1).max(80),
})

export type Sugerencia = z.infer<typeof sugerenciaSchema>

/**
 * Valida una respuesta del modelo contra el esquema y contra el tipo de
 * movimiento.
 *
 * La segunda comprobación es necesaria porque el esquema por sí solo aceptaría
 * «salario» como categoría de un gasto: son claves válidas del catálogo, pero no
 * de ese tipo de movimiento.
 */
export function validarSugerencia(
  bruto: unknown,
  tipo: MovementKind,
): { ok: true; valor: Sugerencia } | { ok: false; motivo: string } {
  const resultado = sugerenciaSchema.safeParse(bruto)

  if (!resultado.success) {
    return {
      ok: false,
      motivo: resultado.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    }
  }

  const categoria = CATEGORIES.find((c) => c.key === resultado.data.categoria)
  if (categoria?.kind !== tipo) {
    return {
      ok: false,
      motivo: `La categoría "${resultado.data.categoria}" no corresponde a un movimiento de tipo ${tipo}`,
    }
  }

  return { ok: true, valor: resultado.data }
}
