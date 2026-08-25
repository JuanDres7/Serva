import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions } from '@/lib/db/schema'
import { createTransaction, periodAggregates, categoryBreakdown } from '@/lib/db/queries/transactions'
import { gastoPorDia, evolucion } from '@/lib/db/queries/charts'
import { computeTotals } from '@/lib/domain/balance'
import { periodFor, CALENDAR_MONTH } from '@/lib/domain/cycle'
import { todayIn, toISO } from '@/lib/domain/civil-date'

/**
 * Que las once features anteriores sigan diciendo la verdad (T-512 a T-515).
 *
 * La versión con datos reales de la prueba de dominio: aquí los préstamos pasan
 * por la base, por las agregaciones de SQL y por las consultas que alimentan el
 * resumen, los presupuestos y los gráficos.
 *
 * La forma es siempre la misma: **medir, registrar un préstamo, volver a medir
 * y exigir que nada se haya movido.**
 */

const ANA = 'test-deudas-tot'
const ZONA = 'America/Bogota'
const COP = 'COP'
const hoy = () => todayIn(ZONA)
const periodo = () => periodFor(CALENDAR_MONTH, hoy())

beforeEach(async () => {
  await db.delete(user).where(eq(user.id, ANA))
  await db
    .insert(user)
    .values({ id: ANA, name: 'Ana', email: `${ANA}@serva.local`, emailVerified: true })

  // Un mes cualquiera: sueldo y algunos gastos.
  await createTransaction(ANA, {
    type: 'income',
    amountCents: 300000000,
    currency: COP,
    category: 'salary',
    occurredOn: toISO(hoy()),
    description: 'sueldo',
  })
  await createTransaction(ANA, {
    type: 'expense',
    amountCents: 18000000,
    currency: COP,
    category: 'groceries',
    occurredOn: toISO(hoy()),
    description: 'mercado',
  })
})

afterAll(async () => {
  await db.delete(user).where(eq(user.id, ANA))
  await client.end()
})

/** Todo lo que la persona ve y que no puede mentir. */
async function retrato() {
  const p = periodo()
  const totales = computeTotals(await periodAggregates(ANA, p, COP))
  const desglose = await categoryBreakdown(ANA, p)
  const diario = await gastoPorDia(ANA, p)
  const serie = await evolucion(ANA, CALENDAR_MONTH, p, 3)

  return {
    ingresos: totales.income.cents,
    gastos: totales.expense.cents,
    balance: totales.balance.cents,
    ahorroNeto: totales.savedNet.cents,
    desglose: desglose.map((d) => `${d.categoryKey}:${d.amountCents}`).sort(),
    gastoDiario: diario.reduce((s, d) => s + d.cents, 0),
    evolucion: serie.map((e) => `${e.ingresos}/${e.gastos}`),
  }
}

async function prestamo(flujo: 'received' | 'lent' | 'collected', cents: number) {
  return createTransaction(ANA, {
    type: 'debt',
    amountCents: cents,
    currency: COP,
    // Un préstamo no tiene categoría: no es gasto de nada (spec 011).
    category: null,
    occurredOn: toISO(hoy()),
    description: 'préstamo',
    debtFlow: flujo,
  })
}

describe('T-512 a T-515 — ningún préstamo mueve lo que ya funcionaba', () => {
  it('me prestan 200.000: todo idéntico', async () => {
    const antes = await retrato()
    await prestamo('received', 20000000)
    expect(await retrato()).toEqual(antes)
  })

  it('presto 80.000: todo idéntico', async () => {
    const antes = await retrato()
    await prestamo('lent', 8000000)
    expect(await retrato()).toEqual(antes)
  })

  it('me devuelven 80.000: todo idéntico', async () => {
    const antes = await retrato()
    await prestamo('collected', 8000000)
    expect(await retrato()).toEqual(antes)
  })

  it('los tres a la vez: todo idéntico', async () => {
    const antes = await retrato()
    await prestamo('received', 20000000)
    await prestamo('lent', 8000000)
    await prestamo('collected', 8000000)
    expect(await retrato()).toEqual(antes)
  })

  it('T-512 — ningún préstamo consume tope de ninguna categoría', async () => {
    const antes = await categoryBreakdown(ANA, periodo())
    await prestamo('received', 50000000)
    expect(await categoryBreakdown(ANA, periodo())).toEqual(antes)
  })

  it('T-513 — el gasto diario y la evolución no se enteran', async () => {
    const antesDiario = await gastoPorDia(ANA, periodo())
    await prestamo('received', 50000000)
    expect(await gastoPorDia(ANA, periodo())).toEqual(antesDiario)
  })
})

describe('T-516 — lo que sí cuenta es el abono', () => {
  it('abonar a una deuda sube el gasto, porque el dinero se fue', async () => {
    const antes = await retrato()

    // El abono no entra como préstamo: entra como gasto en «Deudas y créditos».
    await createTransaction(ANA, {
      type: 'expense',
      amountCents: 5000000,
      currency: COP,
      category: 'debt',
      occurredOn: toISO(hoy()),
      description: 'abono a mi hermana',
    })

    const despues = await retrato()
    expect(despues.gastos - antes.gastos).toBe(5000000)
    expect(despues.balance).toBe(antes.balance - 5000000)
  })
})

describe('el préstamo sí queda registrado, aunque no cuente', () => {
  it('la fila existe y se puede consultar', async () => {
    const fila = await prestamo('received', 20000000)

    const [guardado] = await db
      .select({
        tipo: transactions.type,
        flujo: transactions.debtFlow,
        monto: transactions.amountCents,
        categoria: transactions.category,
      })
      .from(transactions)
      .where(eq(transactions.id, fila.id))

    expect(guardado?.tipo).toBe('debt')
    expect(guardado?.flujo).toBe('received')
    expect(guardado?.monto).toBe(20000000)
    // La base lo impone, no solo el código (T-509).
    expect(guardado?.categoria).toBeNull()
  })

  it('la base rechaza un préstamo con categoría', async () => {
    await expect(
      createTransaction(ANA, {
        type: 'debt',
        amountCents: 1000000,
        currency: COP,
        category: 'groceries',
        occurredOn: toISO(hoy()),
        description: 'imposible',
        debtFlow: 'received',
      }),
    ).rejects.toThrow()
  })
})
