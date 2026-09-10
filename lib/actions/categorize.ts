'use server'

import { requireUserId } from '@/lib/session'
import { categorizar } from '@/lib/ai/categorize'
import { crearProveedor } from '@/lib/ai/provider'
import {
  buscarPorPalabrasClave,
  registrarCategorizacion,
} from '@/lib/db/queries/learning'
import { buscarSimilares, codificarYGuardar } from '@/lib/db/queries/embeddings'
import { encoderDisponible } from '@/lib/ai/encoder'
import type { MovementKind } from '@/lib/domain/categories'

/**
 * Pide una sugerencia de categoría para lo que el usuario acaba de escribir.
 *
 * Nunca lanza: si algo falla —el modelo, la red, la base—, devuelve una
 * sugerencia vacía. La categorización es una comodidad, no un requisito, y un
 * fallo aquí no puede impedir registrar (spec 002, FR-011).
 */

export type SugerenciaParaUI = {
  /** Clave de categoría, o `null` si no se alcanzó confianza suficiente. */
  readonly categoria: string | null
  readonly confianza: number
  readonly mecanismo: 'keywords' | 'similarity' | 'model' | 'none'
  readonly descripcionCorta: string
  /** Identificador del registro de aprendizaje, para cerrarlo al guardar. */
  readonly logId: string | null
}

const VACIA: SugerenciaParaUI = {
  categoria: null,
  confianza: 0,
  mecanismo: 'none',
  descripcionCorta: '',
  logId: null,
}

export async function sugerirCategoria(
  texto: string,
  tipo: MovementKind,
): Promise<SugerenciaParaUI> {
  try {
    if (texto.trim() === '') return VACIA

    const userId = await requireUserId()

    const resultado = await categorizar({
      texto,
      tipo,
      proveedor: crearProveedor(),
      buscarEnHistorial: (palabrasClave, tipoMovimiento) =>
        buscarPorPalabrasClave(userId, palabrasClave, tipoMovimiento),
      buscarSimilares: encoderDisponible
        ? async (desc, tipoMov) => {
            const resultado = await buscarSimilares(userId, desc, tipoMov)
            // Convertir ResultadoBusqueda a CoincidenciaHistorial | null
            if (resultado.categoria === null) return null
            return {
              categoria: resultado.categoria,
              confianza: resultado.confianza,
            }
          }
        : undefined,
    })

    // Se registra incluso cuando no hubo sugerencia: saber cuántas veces el
    // sistema no supo qué proponer es tan informativo como saber cuántas acertó
    // (D-015).
    const logId = await registrarCategorizacion(userId, {
      inputText: texto,
      normalizedText: resultado.textoNormalizado,
      keywords: resultado.palabrasClave,
      suggestedCategory: resultado.categoria,
      confidence: resultado.categoria ? resultado.confianza : null,
      mechanism: resultado.mecanismo,
      latencyMs: resultado.latenciaMs,
    })

    // Generar y guardar el embedding para futuras búsquedas (spec 013).
    // Se hace en background: no bloquea la respuesta al usuario.
    if (logId && encoderDisponible) {
      codificarYGuardar(logId, texto).catch(() => {
        // Silencioso: el embedding es una mejora, no un requisito.
      })
    }

    return {
      categoria: resultado.categoria,
      confianza: resultado.confianza,
      mecanismo: resultado.mecanismo,
      descripcionCorta: resultado.descripcionCorta,
      logId,
    }
  } catch {
    return VACIA
  }
}
