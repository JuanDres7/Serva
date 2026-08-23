import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, categorizationLog } from '@/lib/db/schema'
import {
  generarDatosDeEjemplo,
  eliminarDatosDeEjemplo,
  tieneDatosDeEjemplo,
} from '@/lib/db/queries/sample-data'
import { createTransaction, listTransactions } from '@/lib/db/queries/transactions'
import { buscarPorPalabrasClave } from '@/lib/db/queries/learning'
import { fromISO, compareDates } from '@/lib/domain/civil-date'

const USUARIO = 'test-sample-user'
const HOY = fromISO('2026-08-23')

afterAll(async () => {
  await db.delete(user).where(sql`id = ${USUARIO}`)
  await client.end()
})

describe('datos de ejemplo', () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({ id: USUARIO, name: 'Prueba', email: 'sample@test.local', emailVerified: false })
      .onConflictDoNothing()
  })

  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id = ${USUARIO}`)
    await db.delete(categorizationLog).where(sql`user_id = ${USUARIO}`)
  })

  it('genera movimientos suficientes para que la aplicación se vea llena', async () => {
    const resultado = await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })
    expect(resultado.movimientos).toBeGreaterThan(50)
  })

  it('cubre varios períodos, no solo el actual', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })

    const [rango] = await db.execute<{ meses: number }>(sql`
      SELECT count(distinct date_trunc('month', occurred_on))::int AS meses
      FROM transactions WHERE user_id = ${USUARIO}
    `)
    // Sin varios períodos, la comparación con el anterior no tendría sentido.
    expect(rango?.meses).toBeGreaterThanOrEqual(3)
  })

  it('nunca genera fechas futuras', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })

    const movimientos = await listTransactions(USUARIO, { limit: 500 })
    for (const movimiento of movimientos) {
      expect(compareDates(fromISO(movimiento.occurredOn), HOY)).toBeLessThanOrEqual(0)
    }
  })

  it('incluye ingresos y gastos, para que el saldo signifique algo', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })

    const ingresos = await listTransactions(USUARIO, { type: 'income', limit: 100 })
    const gastos = await listTransactions(USUARIO, { type: 'expense', limit: 500 })
    expect(ingresos.length).toBeGreaterThan(0)
    expect(gastos.length).toBeGreaterThan(0)
  })

  it('usa montos enteros en la moneda del usuario', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })

    const movimientos = await listTransactions(USUARIO, { limit: 500 })
    for (const movimiento of movimientos) {
      expect(Number.isInteger(movimiento.amountCents)).toBe(true)
      expect(movimiento.amountCents).toBeGreaterThan(0)
      expect(movimiento.currency).toBe('COP')
    }
  })

  it('puebla también el aprendizaje, para que la categorización funcione', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })

    // Quien pruebe la aplicación debe ver la sugerencia funcionando desde el
    // primer registro que escriba.
    const coincidencia = await buscarPorPalabrasClave(USUARIO, ['almuerzo'], 'expense')
    expect(coincidencia?.categoria).toBe('eating_out')
  })

  it('es reproducible: el mismo usuario obtiene siempre lo mismo', async () => {
    const primera = await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })
    const totalPrimera = await sumaDe(USUARIO)

    await db.delete(transactions).where(sql`user_id = ${USUARIO}`)
    await db.delete(categorizationLog).where(sql`user_id = ${USUARIO}`)

    const segunda = await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })
    expect(segunda.movimientos).toBe(primera.movimientos)
    expect(await sumaDe(USUARIO)).toBe(totalPrimera)
  })

  it('quedan marcados como ejemplo', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })
    expect(await tieneDatosDeEjemplo(USUARIO)).toBe(true)
  })
})

describe('borrado de los datos de ejemplo', () => {
  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id = ${USUARIO}`)
    await db.delete(categorizationLog).where(sql`user_id = ${USUARIO}`)
  })

  it('se van todos de una vez', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })
    await eliminarDatosDeEjemplo(USUARIO)

    expect(await tieneDatosDeEjemplo(USUARIO)).toBe(false)
    expect(await listTransactions(USUARIO, { limit: 500 })).toHaveLength(0)
  })

  it('no toca los movimientos que registró la persona', async () => {
    // El requisito que hace usable la función: quien prueba, le gusta y decide
    // usar Finzen en serio no puede quedarse con gastos inventados mezclados.
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })

    const propio = await createTransaction(USUARIO, {
      type: 'expense',
      amountCents: 4500000,
      currency: 'COP',
      category: 'health',
      occurredOn: '2026-08-20',
      description: 'esto lo registré yo',
      categorySource: 'user',
    })

    await eliminarDatosDeEjemplo(USUARIO)

    const quedan = await listTransactions(USUARIO, { limit: 500 })
    expect(quedan).toHaveLength(1)
    expect(quedan[0]?.id).toBe(propio.id)
    expect(quedan[0]?.description).toBe('esto lo registré yo')
  })

  it('se lleva consigo el aprendizaje de los ejemplos', async () => {
    await generarDatosDeEjemplo(USUARIO, { currency: 'COP', hoy: HOY })
    await eliminarDatosDeEjemplo(USUARIO)

    const [fila] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(categorizationLog)
      .where(eq(categorizationLog.userId, USUARIO))

    expect(fila?.total).toBe(0)
  })
})

async function sumaDe(userId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amountCents}), 0)` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isSample, true)))

  return Number(fila?.total ?? 0)
}
