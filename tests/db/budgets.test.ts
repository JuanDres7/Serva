import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, budgets } from '@/lib/db/schema'
import {
  guardarPresupuesto,
  listarPresupuestos,
  eliminarPresupuesto,
  presupuestosConGasto,
  sugerenciasDeTope,
  contarEnAviso,
} from '@/lib/db/queries/budgets'
import { createTransaction } from '@/lib/db/queries/transactions'
import { CALENDAR_MONTH, periodFor, previousPeriod } from '@/lib/domain/cycle'
import { todayIn, toISO } from '@/lib/domain/civil-date'

const ANA = 'test-budgets-ana'
const BRUNO = 'test-budgets-bruno'
const HOY = todayIn('America/Bogota')
const PERIODO = periodFor(CALENDAR_MONTH, HOY)

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

async function gastar(userId: string, cents: number, categoria: string, fecha = toISO(HOY)) {
  return createTransaction(userId, {
    type: 'expense',
    amountCents: cents,
    currency: 'COP',
    category: categoria,
    occurredOn: fecha,
    categorySource: 'user',
  })
}

describe('presupuestos', () => {
  beforeAll(async () => {
    for (const [id, email] of [
      [ANA, 'ana@budgets.test'],
      [BRUNO, 'bruno@budgets.test'],
    ]) {
      await db
        .insert(user)
        .values({ id: id!, name: id!, email: email!, emailVerified: false })
        .onConflictDoNothing()
    }
  })

  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
    await db.delete(budgets).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('se define un tope por categoría', async () => {
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 35000000 },
      { currency: 'COP' },
    )

    const definidos = await listarPresupuestos(ANA)
    expect(definidos).toHaveLength(1)
    expect(definidos[0]?.limitCents).toBe(35000000)
  })

  it('solo puede haber un presupuesto por categoría', async () => {
    // FR-005: dos topes para lo mismo no significarían nada. Volver a definirlo
    // lo actualiza.
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 35000000 },
      { currency: 'COP' },
    )
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 40000000 },
      { currency: 'COP' },
    )

    const definidos = await listarPresupuestos(ANA)
    expect(definidos).toHaveLength(1)
    expect(definidos[0]?.limitCents).toBe(40000000)
  })

  it('rechaza poner tope a una categoría de ingreso', async () => {
    // RN-001: un presupuesto es un tope de gasto.
    await expect(
      guardarPresupuesto(ANA, { category: 'salary', limitCents: 100 }, { currency: 'COP' }),
    ).rejects.toThrow()
  })

  it('el gasto mostrado coincide con el de la categoría en el período', async () => {
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 35000000 },
      { currency: 'COP' },
    )
    await gastar(ANA, 12000000, 'eating_out')
    await gastar(ANA, 8000000, 'eating_out')
    await gastar(ANA, 50000000, 'groceries')

    const [presupuesto] = await presupuestosConGasto(ANA, PERIODO)
    expect(presupuesto?.gastadoCents).toBe(20000000)
  })

  it('los movimientos de otros períodos no cuentan', async () => {
    const anterior = previousPeriod(CALENDAR_MONTH, PERIODO)
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 35000000 },
      { currency: 'COP' },
    )
    await gastar(ANA, 30000000, 'eating_out', toISO(anterior.start))

    const [presupuesto] = await presupuestosConGasto(ANA, PERIODO)
    expect(presupuesto?.gastadoCents).toBe(0)
  })

  it('cuenta los presupuestos que llegaron al aviso', async () => {
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 10000000 },
      { currency: 'COP' },
    )
    await gastar(ANA, 8500000, 'eating_out')

    expect(await contarEnAviso(ANA, PERIODO)).toBe(1)
  })

  it('sugiere un tope a partir del historial', async () => {
    // FR-002: sin esto el usuario tendría que inventarse un número, que es
    // exactamente por lo que los presupuestos se abandonan.
    const anterior = previousPeriod(CALENDAR_MONTH, PERIODO)
    await gastar(ANA, 40000000, 'eating_out', toISO(anterior.start))

    const sugerencias = await sugerenciasDeTope(ANA, CALENDAR_MONTH, PERIODO)
    const comidas = sugerencias.find((s) => s.category === 'eating_out')

    expect(comidas?.promedioCents).toBe(40000000)
    expect(comidas?.sugeridoCents).toBeLessThan(40000000)
    expect(comidas?.sugeridoCents).toBeGreaterThan(0)
  })

  it('sin historial no hay sugerencias que inventar', async () => {
    expect(await sugerenciasDeTope(ANA, CALENDAR_MONTH, PERIODO)).toEqual([])
  })

  it('las sugerencias vienen de mayor a menor gasto', async () => {
    // Se orienta a poner tope donde de verdad se concentra el gasto (FR-006).
    const anterior = previousPeriod(CALENDAR_MONTH, PERIODO)
    await gastar(ANA, 10000000, 'transport', toISO(anterior.start))
    await gastar(ANA, 90000000, 'groceries', toISO(anterior.start))

    const sugerencias = await sugerenciasDeTope(ANA, CALENDAR_MONTH, PERIODO)
    expect(sugerencias[0]?.category).toBe('groceries')
  })

  it('se puede eliminar', async () => {
    const presupuesto = await guardarPresupuesto(
      ANA,
      { category: 'shopping', limitCents: 20000000 },
      { currency: 'COP' },
    )

    expect(await eliminarPresupuesto(ANA, presupuesto.id)).toBe(true)
    expect(await listarPresupuestos(ANA)).toHaveLength(0)
  })
})

describe('aislamiento de los presupuestos', () => {
  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
    await db.delete(budgets).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('nadie ve ni toca los presupuestos de otro', async () => {
    const deBruno = await guardarPresupuesto(
      BRUNO,
      { category: 'eating_out', limitCents: 35000000 },
      { currency: 'COP' },
    )

    expect(await listarPresupuestos(ANA)).toHaveLength(0)
    expect(await presupuestosConGasto(ANA, PERIODO)).toHaveLength(0)
    expect(await eliminarPresupuesto(ANA, deBruno.id)).toBe(false)
    expect(await listarPresupuestos(BRUNO)).toHaveLength(1)
  })

  it('cada usuario puede tener su propio tope en la misma categoría', async () => {
    await guardarPresupuesto(
      ANA,
      { category: 'eating_out', limitCents: 10000000 },
      { currency: 'COP' },
    )
    await guardarPresupuesto(
      BRUNO,
      { category: 'eating_out', limitCents: 90000000 },
      { currency: 'COP' },
    )

    expect((await listarPresupuestos(ANA))[0]?.limitCents).toBe(10000000)
    expect((await listarPresupuestos(BRUNO))[0]?.limitCents).toBe(90000000)
  })
})
