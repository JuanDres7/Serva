import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions } from '@/lib/db/schema'
import {
  createTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
  voidTransaction,
  restoreTransaction,
  countTransactions,
  periodAggregates,
  categoryBreakdown,
} from '@/lib/db/queries/transactions'
import { CALENDAR_MONTH, periodFor } from '@/lib/domain/cycle'
import { fromISO } from '@/lib/domain/civil-date'
import { computeTotals, computeBreakdown, sumBreakdown } from '@/lib/domain/balance'

const USUARIO = 'test-transactions-user'
const AGOSTO = periodFor(CALENDAR_MONTH, fromISO('2026-08-15'))
const COP = 'COP'

const gasto = (amountCents: number, category: string, occurredOn: string) =>
  createTransaction(USUARIO, {
    type: 'expense' as const,
    amountCents,
    currency: COP,
    category,
    occurredOn,
    categorySource: 'user' as const,
  })

describe('consultas de movimientos', () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({
        id: USUARIO,
        name: 'Pruebas',
        email: 'transactions@test.local',
        emailVerified: false,
      })
      .onConflictDoNothing()
  })

  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id = ${USUARIO}`)
  })

  afterAll(async () => {
    await db.delete(user).where(sql`id = ${USUARIO}`)
    await client.end()
  })

  describe('creación y validación', () => {
    it('guarda un movimiento y lo devuelve intacto', async () => {
      const creado = await gasto(4180000, 'eating_out', '2026-08-10')
      const leido = await getTransaction(USUARIO, creado.id)

      expect(leido?.amountCents).toBe(4180000)
      expect(leido?.category).toBe('eating_out')
      expect(leido?.occurredOn).toBe('2026-08-10')
      expect(leido?.status).toBe('active')
    })

    it('rechaza una categoría de ingreso en un gasto', async () => {
      await expect(gasto(1000, 'salary', '2026-08-10')).rejects.toThrow()
    })

    it('rechaza un gasto sin categoría', async () => {
      await expect(
        createTransaction(USUARIO, {
          type: 'expense',
          amountCents: 1000,
          currency: COP,
          occurredOn: '2026-08-10',
          categorySource: 'user',
        }),
      ).rejects.toThrow()
    })

    it('rechaza montos que no sean enteros positivos', async () => {
      await expect(gasto(0, 'groceries', '2026-08-10')).rejects.toThrow()
      await expect(gasto(-500, 'groceries', '2026-08-10')).rejects.toThrow()
      await expect(gasto(15.5, 'groceries', '2026-08-10')).rejects.toThrow()
    })

    it('rechaza un ahorro con categoría: su destino es la meta', async () => {
      await expect(
        createTransaction(USUARIO, {
          type: 'saving',
          amountCents: 1000,
          currency: COP,
          category: 'groceries',
          occurredOn: '2026-08-10',
          categorySource: 'user',
        }),
      ).rejects.toThrow()
    })
  })

  describe('listado', () => {
    it('ordena por fecha descendente', async () => {
      await gasto(1000, 'groceries', '2026-08-05')
      await gasto(2000, 'transport', '2026-08-20')
      await gasto(3000, 'health', '2026-08-12')

      const lista = await listTransactions(USUARIO)
      expect(lista.map((t) => t.occurredOn)).toEqual([
        '2026-08-20',
        '2026-08-12',
        '2026-08-05',
      ])
    })

    it('filtra por período', async () => {
      await gasto(1000, 'groceries', '2026-07-31')
      await gasto(2000, 'groceries', '2026-08-01')

      const lista = await listTransactions(USUARIO, { period: AGOSTO })
      expect(lista).toHaveLength(1)
      expect(lista[0]?.occurredOn).toBe('2026-08-01')
    })

    it('filtra por tipo y por categoría', async () => {
      await gasto(1000, 'groceries', '2026-08-05')
      await gasto(2000, 'transport', '2026-08-06')
      await createTransaction(USUARIO, {
        type: 'income',
        amountCents: 500000,
        currency: COP,
        category: 'salary',
        occurredOn: '2026-08-01',
        categorySource: 'user',
      })

      expect(await listTransactions(USUARIO, { type: 'income' })).toHaveLength(1)
      expect(await listTransactions(USUARIO, { category: 'transport' })).toHaveLength(1)
    })

    it('pagina sin repetir ni saltarse filas', async () => {
      for (let i = 1; i <= 5; i += 1) {
        await gasto(i * 1000, 'groceries', `2026-08-0${i}`)
      }

      const primera = await listTransactions(USUARIO, { limit: 2, offset: 0 })
      const segunda = await listTransactions(USUARIO, { limit: 2, offset: 2 })

      expect(primera).toHaveLength(2)
      expect(segunda).toHaveLength(2)
      const ids = [...primera, ...segunda].map((t) => t.id)
      expect(new Set(ids).size).toBe(4)
    })
  })

  describe('corrección y anulación', () => {
    it('editar el monto lo refleja en los totales', async () => {
      const creado = await gasto(1000000, 'groceries', '2026-08-10')
      await updateTransaction(USUARIO, creado.id, { amountCents: 2500000 })

      const totales = await periodAggregates(USUARIO, AGOSTO, COP)
      expect(totales.expenseCents).toBe(2500000)
    })

    it('cambiar la categoría a mano la marca como decisión del usuario', async () => {
      // La corrección del usuario es soberana: ninguna sugerencia posterior la
      // sobrescribe (Art. II).
      const creado = await createTransaction(USUARIO, {
        type: 'expense',
        amountCents: 1000,
        currency: COP,
        category: 'shopping',
        occurredOn: '2026-08-10',
        categorySource: 'model',
      })
      const actualizado = await updateTransaction(USUARIO, creado.id, {
        category: 'groceries',
      })

      expect(actualizado?.category).toBe('groceries')
      expect(actualizado?.categorySource).toBe('user')
    })

    it('anular no borra: conserva el movimiento y permite restaurarlo', async () => {
      const creado = await gasto(1000000, 'groceries', '2026-08-10')
      await voidTransaction(USUARIO, creado.id)

      const anulado = await getTransaction(USUARIO, creado.id)
      expect(anulado).not.toBeNull()
      expect(anulado?.status).toBe('voided')
      expect(anulado?.voidedAt).not.toBeNull()
      expect(anulado?.amountCents).toBe(1000000)

      await restoreTransaction(USUARIO, creado.id)
      expect((await getTransaction(USUARIO, creado.id))?.status).toBe('active')
    })

    it('un movimiento anulado desaparece del historial y de los totales', async () => {
      const creado = await gasto(1000000, 'groceries', '2026-08-10')
      await gasto(500000, 'transport', '2026-08-11')
      await voidTransaction(USUARIO, creado.id)

      expect(await listTransactions(USUARIO)).toHaveLength(1)
      expect(await countTransactions(USUARIO)).toBe(1)
      expect((await periodAggregates(USUARIO, AGOSTO, COP)).expenseCents).toBe(500000)

      // Salvo que se pidan explícitamente.
      expect(await listTransactions(USUARIO, { includeVoided: true })).toHaveLength(2)
    })

    it('restaurar lo devuelve a los totales', async () => {
      const creado = await gasto(1000000, 'groceries', '2026-08-10')
      await voidTransaction(USUARIO, creado.id)
      await restoreTransaction(USUARIO, creado.id)

      expect((await periodAggregates(USUARIO, AGOSTO, COP)).expenseCents).toBe(1000000)
    })
  })

  describe('totales y desglose', () => {
    it('los totales coinciden exactamente con la suma manual, con decimales', async () => {
      // Criterio de aceptación 3 de la spec 001.
      const montos = [1541850, 41833, 999999, 1, 250075]
      for (const [i, monto] of montos.entries()) {
        await gasto(monto, 'groceries', `2026-08-0${i + 1}`)
      }

      const esperado = montos.reduce((a, b) => a + b, 0)
      const totales = await periodAggregates(USUARIO, AGOSTO, COP)
      expect(totales.expenseCents).toBe(esperado)
    })

    it('aplica la fórmula del saldo con ahorro incluido', async () => {
      await createTransaction(USUARIO, {
        type: 'income',
        amountCents: 300000000,
        currency: COP,
        category: 'salary',
        occurredOn: '2026-08-01',
        categorySource: 'user',
      })
      await gasto(100000000, 'groceries', '2026-08-05')
      await db.insert(transactions).values({
        userId: USUARIO,
        type: 'saving',
        amountCents: 20000000,
        currency: COP,
        occurredOn: '2026-08-06',
        savingDirection: 'contribution',
      })

      const totales = computeTotals(await periodAggregates(USUARIO, AGOSTO, COP))
      expect(totales.income.cents).toBe(300000000)
      expect(totales.expense.cents).toBe(100000000)
      expect(totales.savedNet.cents).toBe(20000000)
      expect(totales.balance.cents).toBe(180000000)
    })

    it('el ahorro no aparece en el desglose de gasto', async () => {
      await gasto(1000000, 'groceries', '2026-08-05')
      await db.insert(transactions).values({
        userId: USUARIO,
        type: 'saving',
        amountCents: 5000000,
        currency: COP,
        occurredOn: '2026-08-06',
        savingDirection: 'contribution',
      })

      const desglose = await categoryBreakdown(USUARIO, AGOSTO)
      expect(desglose).toHaveLength(1)
      expect(desglose[0]?.categoryKey).toBe('groceries')
    })

    it('la suma del desglose coincide con el total de gasto', async () => {
      await gasto(6800000, 'groceries', '2026-08-05')
      await gasto(4180000, 'eating_out', '2026-08-06')
      await gasto(2900000, 'transport', '2026-08-07')

      const totales = await periodAggregates(USUARIO, AGOSTO, COP)
      const desglose = computeBreakdown(await categoryBreakdown(USUARIO, AGOSTO), COP)

      expect(sumBreakdown(desglose, COP).cents).toBe(totales.expenseCents)
    })

    it('los movimientos fuera del período no entran en los totales', async () => {
      await gasto(1000000, 'groceries', '2026-07-31')
      await gasto(2000000, 'groceries', '2026-08-01')

      expect((await periodAggregates(USUARIO, AGOSTO, COP)).expenseCents).toBe(2000000)
    })

    it('un período sin movimientos da cero, no error', async () => {
      const vacio = periodFor(CALENDAR_MONTH, fromISO('2026-01-15'))
      const totales = computeTotals(await periodAggregates(USUARIO, vacio, COP))
      expect(totales.balance.cents).toBe(0)
      expect(await categoryBreakdown(USUARIO, vacio)).toEqual([])
    })
  })
})
