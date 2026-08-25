import { describe, it, expect } from 'vitest'
import { computeTotals, type PeriodAggregates } from '@/lib/domain/balance'

/**
 * La prueba que decide si la feature 011 se puede entregar (T-511).
 *
 * No comprueba que las deudas funcionen. Comprueba que **las once features
 * anteriores siguen diciendo la verdad** después de introducirlas.
 *
 * Serva lleva meses construida sobre una idea de dos términos —ingresos menos
 * gastos— y los préstamos son la primera cosa que mueve dinero sin ser ninguno
 * de los dos. Si esa separación se hace mal no falla la pantalla de deudas:
 * fallan el resumen, los presupuestos y los gráficos.
 */

const COP = 'COP'

const base = (partial: Partial<PeriodAggregates> = {}): PeriodAggregates => ({
  currency: COP,
  incomeCents: 300000000, // 3.000.000 de sueldo
  expenseCents: 180000000, // 1.800.000 de gastos
  savingContributionCents: 0,
  savingWithdrawalCents: 0,
  debtReceivedCents: 0,
  debtLentCents: 0,
  debtCollectedCents: 0,
  ...partial,
})

/** Los tres números que la persona ve y que no pueden mentir. */
const visibles = (agregados: PeriodAggregates) => {
  const t = computeTotals(agregados)
  return {
    ingresos: t.income.cents,
    gastos: t.expense.cents,
    balance: t.balance.cents,
  }
}

describe('criterio 3 — ningún préstamo altera los totales', () => {
  const antes = visibles(base())

  it('me prestan 200.000 y los totales no se mueven', () => {
    const despues = visibles(base({ debtReceivedCents: 20000000 }))
    expect(despues).toEqual(antes)
  })

  it('presto 80.000 y los totales no se mueven', () => {
    const despues = visibles(base({ debtLentCents: 8000000 }))
    expect(despues).toEqual(antes)
  })

  it('me devuelven 80.000 y los totales no se mueven', () => {
    const despues = visibles(base({ debtCollectedCents: 8000000 }))
    expect(despues).toEqual(antes)
  })

  it('las tres cosas a la vez, y siguen sin moverse', () => {
    const despues = visibles(
      base({
        debtReceivedCents: 20000000,
        debtLentCents: 8000000,
        debtCollectedCents: 8000000,
      }),
    )
    expect(despues).toEqual(antes)
  })

  it('ni con cantidades absurdas', () => {
    // Si un préstamo entrara en el balance por algún camino, una cifra grande
    // lo delataría aunque una pequeña se perdiera en el redondeo.
    const despues = visibles(base({ debtReceivedCents: 99999999999 }))
    expect(despues).toEqual(antes)
  })
})

describe('un préstamo recibido no es ingreso (RN-002)', () => {
  it('el mes en que pides prestado no se ve como un mes bueno', () => {
    const normal = computeTotals(base())
    const conPrestamo = computeTotals(base({ debtReceivedCents: 50000000 }))

    // Lo que se protege: que el balance no mejore por endeudarse.
    expect(conPrestamo.balance.cents).toBe(normal.balance.cents)
    expect(conPrestamo.income.cents).toBe(normal.income.cents)
  })
})

describe('lo que sí cuenta es el abono', () => {
  it('abonar a una deuda es un gasto como cualquier otro', () => {
    // El abono no llega como `debt`: llega como `expense` en «Deudas y
    // créditos», porque ahí el dinero se fue de verdad.
    const sinAbonar = computeTotals(base())
    const abonando = computeTotals(base({ expenseCents: 180000000 + 5000000 }))

    expect(abonando.expense.cents - sinAbonar.expense.cents).toBe(5000000)
    expect(abonando.balance.cents).toBe(sinAbonar.balance.cents - 5000000)
  })
})

describe('el ahorro sigue comportándose igual que antes', () => {
  it('las deudas no alteraron la mecánica del ahorro', () => {
    // La contraprueba: el cambio no puede haber roto la spec 006.
    const conAhorro = computeTotals(base({ savingContributionCents: 30000000 }))
    const sinAhorro = computeTotals(base())

    expect(conAhorro.savedNet.cents).toBe(30000000)
    expect(conAhorro.balance.cents).toBe(sinAhorro.balance.cents - 30000000)
  })

  it('y un préstamo no se cuela como aporte a ahorro', () => {
    // Este era el fallo concreto que había esperando: la cadena de `else` de
    // `periodAggregates` mandaba todo lo que no fuera ingreso ni gasto a
    // «aporte a ahorro». Un préstamo habría bajado el balance.
    const conPrestamo = computeTotals(base({ debtReceivedCents: 20000000 }))
    expect(conPrestamo.savedNet.cents).toBe(0)
  })
})

describe('los movimientos de deuda se pueden mostrar aparte', () => {
  it('se agregan, aunque no entren en el balance', () => {
    const t = computeTotals(
      base({ debtReceivedCents: 20000000, debtLentCents: 8000000, debtCollectedCents: 3000000 }),
    )

    expect(t.recibido?.cents).toBe(20000000)
    expect(t.prestado?.cents).toBe(8000000)
    expect(t.cobrado?.cents).toBe(3000000)
  })
})
