import { quitarTildes } from '@/lib/domain/keywords'

/**
 * Normalización de texto para encoding semántico.
 *
 * Aplica la misma normalización que las keywords (minúsculas, sin tildes,
 * sin puntuación) para garantizar consistencia entre el encoding de
 * almacenamiento y el de búsqueda.
 *
 * Lógica pura, sin dependencias externas.
 */
export function normalizarParaEncoding(texto: string): string {
  return quitarTildes(texto.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
