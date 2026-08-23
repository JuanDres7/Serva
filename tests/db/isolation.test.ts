import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user } from '@/lib/db/schema'
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

/**
 * T-020 — Aislamiento entre usuarios.
 *
 * Es el criterio de aceptación más importante del proyecto (Art. VI.1). Un fallo
 * aquí expone lo que otra persona gasta en salud, en deudas o en su vida privada.
 *
 * La prueba crea dos usuarios con datos cruzados y comprueba que **ninguna**
 * función del módulo de consultas deja que uno alcance los datos del otro: ni
 * para leerlos, ni para modificarlos, ni sumados dentro de un total.
 */

const ANA = 'test-isolation-ana'
const BRUNO = 'test-isolation-bruno'
const PERIODO = periodFor(CALENDAR_MONTH, fromISO('2026-08-15'))

let movimientoDeAna: string
let movimientoDeBruno: string

async function crearUsuario(id: string, email: string) {
  await db
    .insert(user)
    .values({ id, name: id, email, emailVerified: false })
    .onConflictDoNothing()
}

describe('aislamiento entre usuarios', () => {
  beforeAll(async () => {
    await crearUsuario(ANA, 'ana@isolation.test')
    await crearUsuario(BRUNO, 'bruno@isolation.test')

    const deAna = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 4500000,
      currency: 'COP',
      category: 'health',
      occurredOn: '2026-08-10',
      description: 'consulta médica',
      categorySource: 'user',
    })
    movimientoDeAna = deAna.id

    const deBruno = await createTransaction(BRUNO, {
      type: 'expense',
      amountCents: 9900000,
      currency: 'COP',
      category: 'debt',
      occurredOn: '2026-08-11',
      description: 'cuota del préstamo',
      categorySource: 'user',
    })
    movimientoDeBruno = deBruno.id

    await createTransaction(BRUNO, {
      type: 'income',
      amountCents: 300000000,
      currency: 'COP',
      category: 'salary',
      occurredOn: '2026-08-01',
      categorySource: 'user',
    })
  })

  afterAll(async () => {
    await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
    await client.end()
  })

  it('el listado solo devuelve movimientos propios', async () => {
    const deAna = await listTransactions(ANA)
    expect(deAna).toHaveLength(1)
    expect(deAna[0]?.userId).toBe(ANA)
    expect(deAna.map((t) => t.id)).not.toContain(movimientoDeBruno)
  })

  it('no se puede leer un movimiento ajeno ni conociendo su identificador', async () => {
    // Adivinar o filtrar un identificador no debe bastar para ver el dato.
    expect(await getTransaction(ANA, movimientoDeBruno)).toBeNull()
    expect(await getTransaction(BRUNO, movimientoDeAna)).toBeNull()
  })

  it('no se puede modificar un movimiento ajeno', async () => {
    const resultado = await updateTransaction(ANA, movimientoDeBruno, {
      amountCents: 1,
    })
    expect(resultado).toBeNull()

    // Y el movimiento de Bruno sigue intacto.
    const original = await getTransaction(BRUNO, movimientoDeBruno)
    expect(original?.amountCents).toBe(9900000)
  })

  it('no se puede anular un movimiento ajeno', async () => {
    expect(await voidTransaction(ANA, movimientoDeBruno)).toBeNull()
    const original = await getTransaction(BRUNO, movimientoDeBruno)
    expect(original?.status).toBe('active')
  })

  it('no se puede restaurar un movimiento ajeno', async () => {
    expect(await restoreTransaction(ANA, movimientoDeBruno)).toBeNull()
  })

  it('el conteo no incluye movimientos ajenos', async () => {
    expect(await countTransactions(ANA)).toBe(1)
    expect(await countTransactions(BRUNO)).toBe(2)
  })

  it('los totales no suman movimientos ajenos', async () => {
    const deAna = await periodAggregates(ANA, PERIODO, 'COP')
    expect(deAna.expenseCents).toBe(4500000)
    expect(deAna.incomeCents).toBe(0)

    const deBruno = await periodAggregates(BRUNO, PERIODO, 'COP')
    expect(deBruno.expenseCents).toBe(9900000)
    expect(deBruno.incomeCents).toBe(300000000)
  })

  it('el desglose por categoría no filtra categorías ajenas', async () => {
    const deAna = await categoryBreakdown(ANA, PERIODO)
    expect(deAna.map((e) => e.categoryKey)).toEqual(['health'])

    const deBruno = await categoryBreakdown(BRUNO, PERIODO)
    expect(deBruno.map((e) => e.categoryKey)).toEqual(['debt'])
  })

  it('un usuario sin datos no ve nada, en lugar de verlo todo', async () => {
    // El fallo clásico: una condición mal construida que, ante un usuario sin
    // movimientos, deja de filtrar y devuelve la tabla entera.
    await crearUsuario('test-isolation-vacio', 'vacio@isolation.test')

    expect(await listTransactions('test-isolation-vacio')).toHaveLength(0)
    expect(await countTransactions('test-isolation-vacio')).toBe(0)

    const totales = await periodAggregates('test-isolation-vacio', PERIODO, 'COP')
    expect(totales.expenseCents).toBe(0)
    expect(totales.incomeCents).toBe(0)

    await db.delete(user).where(sql`id = 'test-isolation-vacio'`)
  })

  it('un identificador de usuario inexistente no devuelve datos de nadie', async () => {
    expect(await listTransactions('no-existe')).toHaveLength(0)
    expect(await countTransactions('no-existe')).toBe(0)
  })

  it('los filtros no debilitan el aislamiento', async () => {
    // Añadir filtros no puede, en ningún caso, ampliar lo que se ve.
    const conFiltros = await listTransactions(ANA, {
      period: PERIODO,
      type: 'expense',
      category: 'debt', // la categoría es de Bruno
      includeVoided: true,
    })
    expect(conFiltros).toHaveLength(0)
  })
})
