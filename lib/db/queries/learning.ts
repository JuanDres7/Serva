import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categorizationLog, type CategorizationLogRow } from '@/lib/db/schema'
import { isValidFor, type MovementKind } from '@/lib/domain/categories'
import { similitud } from '@/lib/domain/keywords'
import type { CoincidenciaHistorial, Mecanismo } from '@/lib/ai/categorize'

/**
 * Historial de aprendizaje: lo que alimenta el nivel 1 de la cascada.
 *
 * Como en el resto del proyecto, **ninguna función existe sin recibir el
 * usuario**. Lo que aprende una cuenta no puede influir en las sugerencias de
 * otra: además de ser una fuga de datos, mezclaría los hábitos de personas
 * distintas y empeoraría el acierto de ambas.
 */

/** Cuántas entradas del historial se examinan por consulta. */
const MAXIMO_CANDIDATOS = 100

/**
 * Refuerzo por coincidencias repetidas.
 *
 * Que el usuario haya categorizado algo equivalente varias veces es señal de
 * hábito, no de casualidad. El refuerzo es pequeño a propósito: la similitud
 * sigue mandando.
 */
const REFUERZO_POR_REPETICION = 0.05

export type EntradaLog = {
  readonly inputText: string
  readonly normalizedText: string
  readonly keywords: readonly string[]
  readonly suggestedCategory: string | null
  readonly confidence: number | null
  readonly mechanism: Mecanismo
  readonly latencyMs: number | null
}

/** Guarda una categorización. Devuelve el identificador para vincularla luego. */
export async function registrarCategorizacion(
  userId: string,
  entrada: EntradaLog,
): Promise<string> {
  const [fila] = await db
    .insert(categorizationLog)
    .values({
      userId,
      inputText: entrada.inputText,
      normalizedText: entrada.normalizedText,
      keywords: [...entrada.keywords],
      suggestedCategory: entrada.suggestedCategory as CategorizationLogRow['suggestedCategory'],
      confidence: entrada.confidence,
      mechanism: entrada.mechanism,
      latencyMs: entrada.latencyMs,
    })
    .returning({ id: categorizationLog.id })

  return fila!.id
}

/**
 * Cierra el ciclo de aprendizaje: qué categoría quedó finalmente y si el usuario
 * corrigió la sugerencia.
 *
 * Sin este paso el historial guardaría lo que la IA propuso pero no lo que la
 * persona decidió, que es justamente la parte que enseña.
 */
export async function confirmarCategorizacion(
  userId: string,
  logId: string,
  datos: { transactionId: string; finalCategory: string | null },
): Promise<void> {
  const [actual] = await db
    .select({ suggested: categorizationLog.suggestedCategory })
    .from(categorizationLog)
    .where(and(eq(categorizationLog.userId, userId), eq(categorizationLog.id, logId)))
    .limit(1)

  if (!actual) return

  await db
    .update(categorizationLog)
    .set({
      transactionId: datos.transactionId,
      finalCategory: datos.finalCategory as CategorizationLogRow['finalCategory'],
      // Solo cuenta como corrección si había una sugerencia y el usuario la
      // cambió. Elegir cuando no se sugirió nada no es corregir.
      wasCorrected:
        actual.suggested !== null && actual.suggested !== datos.finalCategory,
    })
    .where(and(eq(categorizationLog.userId, userId), eq(categorizationLog.id, logId)))
}

/**
 * Nivel 1 de la cascada: busca entre lo que este usuario ya categorizó.
 *
 * El solapamiento de términos se filtra en la base —que para eso tiene el índice—
 * y la similitud se calcula sobre los pocos candidatos que quedan.
 */
export async function buscarPorPalabrasClave(
  userId: string,
  palabrasClave: readonly string[],
  tipo: MovementKind,
): Promise<CoincidenciaHistorial | null> {
  if (palabrasClave.length === 0) return null

  const candidatos = await db
    .select({
      categoria: categorizationLog.finalCategory,
      keywords: categorizationLog.keywords,
    })
    .from(categorizationLog)
    .where(
      and(
        eq(categorizationLog.userId, userId),
        isNotNull(categorizationLog.finalCategory),
        // Las palabras clave salen de texto escrito por el usuario, así que van
        // como parámetro. Construir el array interpolando en la consulta sería
        // una vía de inyección, por mucho que se escapen las comillas.
        sql`${categorizationLog.keywords} && ${sql.param([...palabrasClave])}::text[]`,
      ),
    )
    .orderBy(desc(categorizationLog.createdAt))
    .limit(MAXIMO_CANDIDATOS)

  const puntajes = new Map<string, { mejor: number; veces: number }>()

  for (const candidato of candidatos) {
    if (!candidato.categoria) continue
    // Una categoría de ingreso no sirve para sugerir en un gasto.
    if (!isValidFor(candidato.categoria, tipo)) continue

    const parecido = similitud(palabrasClave, candidato.keywords)
    if (parecido === 0) continue

    const previo = puntajes.get(candidato.categoria)
    puntajes.set(candidato.categoria, {
      mejor: Math.max(previo?.mejor ?? 0, parecido),
      veces: (previo?.veces ?? 0) + 1,
    })
  }

  let ganadora: { categoria: string; confianza: number } | null = null

  for (const [categoria, { mejor, veces }] of puntajes) {
    const confianza = Math.min(1, mejor + REFUERZO_POR_REPETICION * (veces - 1))
    if (!ganadora || confianza > ganadora.confianza) {
      ganadora = { categoria, confianza }
    }
  }

  return ganadora
}

export type EstadisticasAcierto = {
  readonly total: number
  readonly conSugerencia: number
  readonly aceptadas: number
  readonly corregidas: number
  /** Proporción de sugerencias que el usuario aceptó sin cambiar. */
  readonly tasaAcierto: number | null
}

/**
 * Cuánto acierta el sistema con este usuario.
 *
 * Sin esta medición no hay forma de saber si un cambio en la cascada o en el
 * mensaje al modelo mejoró o empeoró las cosas (spec 002, criterio 2).
 */
export async function estadisticasAcierto(userId: string): Promise<EstadisticasAcierto> {
  const [fila] = await db
    .select({
      total: sql<number>`count(*)::int`,
      conSugerencia: sql<number>`count(*) filter (where ${categorizationLog.suggestedCategory} is not null)::int`,
      corregidas: sql<number>`count(*) filter (where ${categorizationLog.wasCorrected})::int`,
    })
    .from(categorizationLog)
    .where(
      and(
        eq(categorizationLog.userId, userId),
        isNotNull(categorizationLog.finalCategory),
      ),
    )

  const total = fila?.total ?? 0
  const conSugerencia = fila?.conSugerencia ?? 0
  const corregidas = fila?.corregidas ?? 0
  const aceptadas = conSugerencia - corregidas

  return {
    total,
    conSugerencia,
    aceptadas,
    corregidas,
    tasaAcierto: conSugerencia === 0 ? null : aceptadas / conSugerencia,
  }
}
