import { sql, eq, isNotNull, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorizationLog } from '@/lib/db/schema'
import { codificar, embeddingAVector, encoderDisponible } from '@/lib/ai/encoder'
import type { MovementKind } from '@/lib/domain/categories'

/**
 * Consultas de embedding para búsqueda semántica (spec 013).
 *
 * El encoder genera vectores de 384 dimensiones que se almacenan en la
 * columna `embedding` de `categorization_log`. La búsqueda usa pgvector
 * con distancia coseno para encontrar descripciones similares.
 */

const UMBRAL_CONFIANZA = 0.7
const LIMITE_POR_DEFECTO = 5

export type ResultadoSimilitud = {
  readonly categoria: string
  readonly confianza: number
  readonly texto: string
}

export type ResultadoBusqueda = {
  readonly categoria: string | null
  readonly confianza: number
  readonly alternativas: readonly ResultadoSimilitud[]
}

/**
 * Busca las categorías más similares a una descripción dada.
 *
 * Genera un embedding de la descripción y busca en pgvector las filas
 * más cercanas dentro del historial del usuario.
 *
 * @returns La categoría con mayor confianza, o null si no hay suficiente confianza.
 */
export async function buscarSimilares(
  userId: string,
  descripcion: string,
  tipo: MovementKind,
  opciones?: {
    limite?: number
    umbral?: number
  },
): Promise<ResultadoBusqueda> {
  const limite = opciones?.limite ?? LIMITE_POR_DEFECTO
  const umbral = opciones?.umbral ?? UMBRAL_CONFIANZA

  const sinResultado: ResultadoBusqueda = {
    categoria: null,
    confianza: 0,
    alternativas: [],
  }

  if (!encoderDisponible) return sinResultado

  const embedding = await codificar(descripcion)
  if (!embedding) return sinResultado

  const vectorStr = embeddingAVector(embedding)

  try {
    // Buscar las filas más cercanas usando pgvector con cosine distance.
    // El casteo ::vector convierte el string a tipo vector de pgvector.
    // La distancia coseno se calcula con <=> y se invierte para obtener confianza.
    const resultados = await db
      .select({
        categoria: categorizationLog.suggestedCategory,
        texto: categorizationLog.inputText,
        confianza: sql<number>`1 - ((${categorizationLog.embedding})::vector <=> ${sql.param(vectorStr)}::vector)`,
      })
      .from(categorizationLog)
      .where(
        and(
          eq(categorizationLog.userId, userId),
          isNotNull(categorizationLog.suggestedCategory),
          isNotNull(categorizationLog.embedding),
          // Filtrar por tipo de movimiento: el embedding busca en la misma
          // categoría de tipo (expense/income) para evitar cruces.
          sql`(${categorizationLog.mechanism} IN ('keywords', 'similarity', 'model'))`,
        ),
      )
      .orderBy(desc(sql`1 - ((${categorizationLog.embedding})::vector <=> ${sql.param(vectorStr)}::vector)`))
      .limit(limite)

    if (resultados.length === 0) return sinResultado

    const alternativas: ResultadoSimilitud[] = []
    let mejorCategoria: string | null = null
    let mejorConfianza = 0

    for (const r of resultados) {
      if (!r.categoria) continue
      const confianza = Number(r.confianza)
      if (confianza < umbral) continue

      alternativas.push({
        categoria: r.categoria,
        confianza,
        texto: r.texto,
      })

      if (confianza > mejorConfianza) {
        mejorConfianza = confianza
        mejorCategoria = r.categoria
      }
    }

    return {
      categoria: mejorCategoria,
      confianza: mejorConfianza,
      alternativas,
    }
  } catch (error) {
    console.warn(
      '[embeddings] Error en búsqueda semántica:',
      error instanceof Error ? error.message : error,
    )
    return sinResultado
  }
}

/**
 * Guarda el embedding de una descripción en el log de categorización.
 *
 * Se llama después de generar un embedding para una transacción nueva.
 */
export async function guardarEmbedding(
  logId: string,
  embedding: Float32Array,
): Promise<void> {
  const vectorStr = embeddingAVector(embedding)

  await db
    .update(categorizationLog)
    .set({
      embedding: sql`${sql.param(vectorStr)}::vector`,
    })
    .where(eq(categorizationLog.id, logId))
}

/**
 * Genera y guarda el embedding para una descripción.
 *
 * Combina codificar + guardarEmbedding en una sola llamada.
 * Se usa al registrar una transacción o al categorizar.
 */
export async function codificarYGuardar(
  logId: string,
  descripcion: string,
): Promise<Float32Array | null> {
  const embedding = await codificar(descripcion)
  if (!embedding) return null

  await guardarEmbedding(logId, embedding)
  return embedding
}
