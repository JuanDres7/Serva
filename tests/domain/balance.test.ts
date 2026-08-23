import { describe, it, expect } from 'vitest'
import {
  computeTotals,
  computeBreakdown,
  compareWithPrevious,
  sumBreakdown,
  type PeriodAggregates,
} from '@/lib/domain/balance'
import { money } from '@/lib/domain/money'

const COP = 'COP'

const aggregates = (partial: Partial<PeriodAggregates>): PeriodAggregates => ({
  currency: COP,
  incomeCents: 0,
  expenseCents: 0,
  savingContributionCents: 0,
  savingWithdrawalCents: 0,
  ...partial,
})

describe('totales del período', () => {
  it('calcula el saldo como ingresos menos gastos', () => {
    const totales = computeTotals(
      aggregates({ incomeCents: 300000000, expenseCents: 84730000 }),
    )
    expect(totales.balance.cents).toBe(215270000)
  })

  it('descuenta los aportes de ahorro del disponible', () => {
    // El dinero ahorrado deja de estar disponible, aunque no se haya gastado.
    const totales = computeTotals(
      aggregates({
        incomeCents: 300000000,
        expenseCents: 100000000,
        savingContributionCents: 20000000,
      }),
    )
    expect(totales.balance.cents).toBe(180000000)
  })

  it('devuelve al disponible lo retirado de una meta', () => {
    const totales = computeTotals(
      aggregates({
        incomeCents: 300000000,
        expenseCents: 100000000,
        savingContributionCents: 20000000,
        savingWithdrawalCents: 5000000,
      }),
    )
    expect(totales.balance.cents).toBe(185000000)
  })

  it('no cuenta el ahorro como gasto', () => {
    // Si el ahorro inflara el gasto, la aplicación diría «gastaste mucho» justo
    // cuando el usuario ahorró (D-028).
    const totales = computeTotals(
      aggregates({ expenseCents: 100000000, savingContributionCents: 50000000 }),
    )
    expect(totales.expense.cents).toBe(100000000)
    expect(totales.savedNet.cents).toBe(50000000)
  })

  it('admite retiros mayores que aportes en el mismo período', () => {
    const totales = computeTotals(
      aggregates({ savingContributionCents: 10000, savingWithdrawalCents: 30000 }),
    )
    expect(totales.savedNet.cents).toBe(-20000)
    expect(totales.balance.cents).toBe(20000)
  })

  it('un período sin movimientos da todo en cero', () => {
    const totales = computeTotals(aggregates({}))
    expect(totales.income.cents).toBe(0)
    expect(totales.expense.cents).toBe(0)
    expect(totales.balance.cents).toBe(0)
  })

  it('el saldo puede ser negativo', () => {
    const totales = computeTotals(
      aggregates({ incomeCents: 100000, expenseCents: 250000 }),
    )
    expect(totales.balance.cents).toBe(-150000)
  })
})

describe('desglose por categoría', () => {
  const entradas = [
    { categoryKey: 'transport', amountCents: 29000000 },
    { categoryKey: 'groceries', amountCents: 68000000 },
    { categoryKey: 'eating_out', amountCents: 41800000 },
  ]

  it('ordena de mayor a menor gasto', () => {
    const desglose = computeBreakdown(entradas, COP)
    expect(desglose.map((e) => e.category.key)).toEqual([
      'groceries',
      'eating_out',
      'transport',
    ])
  })

  it('calcula el porcentaje sobre el total', () => {
    const desglose = computeBreakdown(entradas, COP)
    const suma = desglose.reduce((acc, e) => acc + e.percentage, 0)
    expect(suma).toBeCloseTo(100, 0)
  })

  it('la suma del desglose coincide con el total', () => {
    const desglose = computeBreakdown(entradas, COP)
    expect(sumBreakdown(desglose, COP).cents).toBe(138800000)
  })

  it('incluye el color de cada categoría para los gráficos', () => {
    const desglose = computeBreakdown(entradas, COP)
    expect(desglose[0]?.category.color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('un desglose vacío no divide por cero', () => {
    expect(computeBreakdown([], COP)).toEqual([])
  })

  it('falla ante una categoría que no existe en el catálogo', () => {
    expect(() => computeBreakdown([{ categoryKey: 'inventada', amountCents: 1 }], COP))
      .toThrow()
  })
})

describe('comparación con el período anterior', () => {
  it('calcula diferencia y variación porcentual', () => {
    const comparacion = compareWithPrevious(money(89000000, COP), money(79000000, COP))
    expect(comparacion.difference.cents).toBe(10000000)
    expect(comparacion.percentageChange).toBeCloseTo(12.7, 1)
  })

  it('reconoce una bajada', () => {
    const comparacion = compareWithPrevious(money(50000, COP), money(100000, COP))
    expect(comparacion.difference.cents).toBe(-50000)
    expect(comparacion.percentageChange).toBe(-50)
  })

  it('no inventa un porcentaje cuando el período anterior fue cero', () => {
    // Dividir por cero daría infinito; mostrar «+∞%» no informa de nada.
    const comparacion = compareWithPrevious(money(50000, COP), money(0, COP))
    expect(comparacion.percentageChange).toBeNull()
  })
})
