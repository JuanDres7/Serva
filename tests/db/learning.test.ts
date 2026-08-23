import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, categorizationLog } from '@/lib/db/schema'
import {
  registrarCategorizacion,
  confirmarCategorizacion,
  buscarPorPalabrasClave,
  estadisticasAcierto,
} from '@/lib/db/queries/learning'
import { createTransaction } from '@/lib/db/queries/transactions'
import { extraerPalabrasClave, normalizar } from '@/lib/domain/keywords'

const ANA = 'test-learning-ana'
const BRUNO = 'test-learning-bruno'

async function crearUsuario(id: string, email: string) {
  await db
    .insert(user)
    .values({ id, name: id, email, emailVerified: false })
    .onConflictDoNothing()
}

/** Simula el ciclo completo: se categoriza, el usuario decide, se aprende. */
async function aprender(userId: string, texto: string, categoriaFinal: string) {
  const movimiento = await createTransaction(userId, {
    type: 'expense',
    amountCents: 1000,
    currency: 'COP',
    category: categoriaFinal,
    occurredOn: '2026-08-01',
    description: texto,
    categorySource: 'user',
  })

  const logId = await registrarCategorizacion(userId, {
    inputText: texto,
    normalizedText: normalizar(texto),
    keywords: extraerPalabrasClave(texto),
    suggestedCategory: null,
    confidence: null,
    mechanism: 'none',
    latencyMs: null,
  })

  await confirmarCategorizacion(userId, logId, {
    transactionId: movimiento.id,
    finalCategory: categoriaFinal,
  })

  return logId
}

// La conexión se cierra una sola vez, cuando termina todo el archivo.
afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

describe('historial de aprendizaje', () => {
  beforeAll(async () => {
    await crearUsuario(ANA, 'ana@learning.test')
    await crearUsuario(BRUNO, 'bruno@learning.test')
  })

  beforeEach(async () => {
    await db.delete(categorizationLog).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('aprende de lo que el usuario categorizó', async () => {
    await aprender(ANA, 'almuerzo', 'eating_out')

    const coincidencia = await buscarPorPalabrasClave(ANA, ['almuerzo'], 'expense')
    expect(coincidencia?.categoria).toBe('eating_out')
    expect(coincidencia?.confianza).toBeGreaterThanOrEqual(0.6)
  })

  it('reconoce la misma cosa dicha de otra forma', async () => {
    // El caso que da sentido a toda la feature: la frase cambia, el contenido no.
    await aprender(ANA, 'fui a la tienda y compré un cartón de leche', 'groceries')

    const coincidencia = await buscarPorPalabrasClave(
      ANA,
      extraerPalabrasClave('compré leche en la tienda'),
      'expense',
    )
    expect(coincidencia?.categoria).toBe('groceries')
  })

  it('refuerza la categoría que el usuario repite', async () => {
    await aprender(ANA, 'almuerzo', 'eating_out')
    await aprender(ANA, 'almuerzo del trabajo', 'eating_out')
    await aprender(ANA, 'almuerzo con amigos', 'eating_out')

    const coincidencia = await buscarPorPalabrasClave(ANA, ['almuerzo'], 'expense')
    expect(coincidencia?.categoria).toBe('eating_out')
    expect(coincidencia?.confianza).toBeGreaterThan(0.6)
  })

  it('la última decisión del usuario pesa: gana la categoría más parecida', async () => {
    await aprender(ANA, 'gasolina', 'transport')
    await aprender(ANA, 'mercado', 'groceries')

    expect((await buscarPorPalabrasClave(ANA, ['gasolina'], 'expense'))?.categoria).toBe(
      'transport',
    )
    expect((await buscarPorPalabrasClave(ANA, ['mercado'], 'expense'))?.categoria).toBe(
      'groceries',
    )
  })

  it('no sugiere una categoría de ingreso para un gasto', async () => {
    await aprender(ANA, 'consultoría', 'other_expense')

    const coincidencia = await buscarPorPalabrasClave(ANA, ['consultoria'], 'income')
    expect(coincidencia).toBeNull()
  })

  it('sin historial no inventa nada', async () => {
    expect(await buscarPorPalabrasClave(ANA, ['inexistente'], 'expense')).toBeNull()
    expect(await buscarPorPalabrasClave(ANA, [], 'expense')).toBeNull()
  })

  it('no se confunde con texto que parece SQL', async () => {
    // Las palabras clave vienen de texto escrito por el usuario y viajan como
    // parámetro, no interpoladas en la consulta.
    const traviesas = extraerPalabrasClave("robot'; DROP TABLE transactions; --")
    const coincidencia = await buscarPorPalabrasClave(ANA, traviesas, 'expense')
    expect(coincidencia).toBeNull()

    // La tabla sigue ahí.
    const [existe] = await db.execute(
      sql`SELECT to_regclass('public.transactions') IS NOT NULL AS existe`,
    )
    expect(existe?.existe).toBe(true)
  })
})

describe('aislamiento del aprendizaje', () => {
  beforeAll(async () => {
    await crearUsuario(ANA, 'ana@learning.test')
    await crearUsuario(BRUNO, 'bruno@learning.test')
  })

  beforeEach(async () => {
    await db.delete(categorizationLog).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('lo que aprende una cuenta no afecta a las sugerencias de otra', async () => {
    // Además de ser una fuga de datos, mezclar hábitos de personas distintas
    // empeoraría el acierto de ambas.
    await aprender(ANA, 'uber', 'transport')
    await aprender(BRUNO, 'uber', 'shopping')

    expect((await buscarPorPalabrasClave(ANA, ['uber'], 'expense'))?.categoria).toBe(
      'transport',
    )
    expect((await buscarPorPalabrasClave(BRUNO, ['uber'], 'expense'))?.categoria).toBe(
      'shopping',
    )
  })

  it('un usuario sin historial no hereda el de otro', async () => {
    await aprender(BRUNO, 'almuerzo', 'eating_out')
    expect(await buscarPorPalabrasClave(ANA, ['almuerzo'], 'expense')).toBeNull()
  })
})

describe('medición del acierto', () => {
  beforeAll(async () => {
    await crearUsuario(ANA, 'ana@learning.test')
  })

  beforeEach(async () => {
    await db.delete(categorizationLog).where(sql`user_id = ${ANA}`)
  })

  it('distingue sugerencias aceptadas de corregidas', async () => {
    const movimiento = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 1000,
      currency: 'COP',
      category: 'groceries',
      occurredOn: '2026-08-01',
      categorySource: 'model',
    })

    // Una aceptada: lo sugerido y lo final coinciden.
    const aceptada = await registrarCategorizacion(ANA, {
      inputText: 'mercado',
      normalizedText: 'mercado',
      keywords: ['mercado'],
      suggestedCategory: 'groceries',
      confidence: 0.9,
      mechanism: 'model',
      latencyMs: 300,
    })
    await confirmarCategorizacion(ANA, aceptada, {
      transactionId: movimiento.id,
      finalCategory: 'groceries',
    })

    // Una corregida: el usuario cambió la propuesta.
    const corregida = await registrarCategorizacion(ANA, {
      inputText: 'algo',
      normalizedText: 'algo',
      keywords: ['algo'],
      suggestedCategory: 'shopping',
      confidence: 0.7,
      mechanism: 'model',
      latencyMs: 300,
    })
    await confirmarCategorizacion(ANA, corregida, {
      transactionId: movimiento.id,
      finalCategory: 'groceries',
    })

    const stats = await estadisticasAcierto(ANA)
    expect(stats.conSugerencia).toBe(2)
    expect(stats.aceptadas).toBe(1)
    expect(stats.corregidas).toBe(1)
    expect(stats.tasaAcierto).toBeCloseTo(0.5)
  })

  it('elegir cuando no se sugirió nada no cuenta como corrección', async () => {
    await aprender(ANA, 'almuerzo', 'eating_out')

    const stats = await estadisticasAcierto(ANA)
    expect(stats.total).toBe(1)
    expect(stats.conSugerencia).toBe(0)
    expect(stats.corregidas).toBe(0)
    expect(stats.tasaAcierto).toBeNull()
  })
})
