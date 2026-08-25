import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, debts, debtPayments } from '@/lib/db/schema'
import {
  crearDeuda,
  listarDeudas,
  leerDeuda,
  abonar,
  saldar,
  reabrir,
  descartarDeuda,
  totalesDeDeuda,
  registrarMovimientoDeDeuda,
  comoDeuda,
  comoAbonos,
} from '@/lib/db/queries/debts'
import { saldoDe, estaSaldada } from '@/lib/domain/deudas'
import { todayIn, toISO, addDays } from '@/lib/domain/civil-date'

/**
 * Deudas contra la base (spec 011, fase 4).
 *
 * Lo que se protege aquí es que el saldo derivado cuadre siempre con los abonos
 * reales, y que nadie alcance las deudas de otra cuenta.
 */

const ANA = 'test-deuda-ana'
const BRUNO = 'test-deuda-bruno'
const ZONA = 'America/Bogota'
const COP = 'COP'
const hoy = () => todayIn(ZONA)

beforeEach(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await db.insert(user).values([
    { id: ANA, name: 'Ana', email: `${ANA}@serva.local`, emailVerified: true },
    { id: BRUNO, name: 'Bruno', email: `${BRUNO}@serva.local`, emailVerified: true },
  ])
})

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

const deudaMia = (userId = ANA, cents = 50000000, extra = {}) =>
  crearDeuda(
    userId,
    { direction: 'owed_by_me', counterparty: 'mi hermana', originalCents: cents, ...extra },
    COP,
  )

const abonoDe = (id: string, cents: number) =>
  abonar(ANA, id, { amountCents: cents, paidOn: toISO(hoy()), currency: COP })

describe('T-518 — crear y leer', () => {
  it('E1 — una deuda nueva aparece con su saldo completo', async () => {
    const creada = await deudaMia()
    const leida = await leerDeuda(ANA, creada.id)

    expect(leida?.fila.counterparty).toBe('mi hermana')
    expect(saldoDe(comoDeuda(leida!.fila), comoAbonos(leida!.abonos)).cents).toBe(50000000)
  })

  it('la base rechaza una contraparte vacía', async () => {
    await expect(
      crearDeuda(
        ANA,
        { direction: 'owed_by_me', counterparty: '   ', originalCents: 1000 },
        COP,
      ),
    ).rejects.toThrow()
  })

  it('y un monto de cero o negativo', async () => {
    await expect(
      crearDeuda(ANA, { direction: 'owed_by_me', counterparty: 'x', originalCents: 0 }, COP),
    ).rejects.toThrow()
  })
})

describe('T-519 y T-520 — abonar', () => {
  it('E2 — el saldo baja y queda constancia del abono', async () => {
    const deuda = await deudaMia()
    const r = await abonoDe(deuda.id, 20000000)

    expect(r.ok).toBe(true)
    const leida = await leerDeuda(ANA, deuda.id)
    expect(saldoDe(comoDeuda(leida!.fila), comoAbonos(leida!.abonos)).cents).toBe(30000000)
    expect(leida?.abonos).toHaveLength(1)
  })

  it('FR-006 — abonar a lo mío registra un gasto en «Deudas y créditos»', async () => {
    const deuda = await deudaMia()
    const r = await abonoDe(deuda.id, 20000000)

    const [movimiento] = await db
      .select({ tipo: transactions.type, categoria: transactions.category })
      .from(transactions)
      .where(eq(transactions.id, (r as { transactionId: string }).transactionId))

    expect(movimiento?.tipo).toBe('expense')
    expect(movimiento?.categoria).toBe('debt')
  })

  it('las dos filas quedan enlazadas', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 20000000)

    const [abono] = await db
      .select({ transactionId: debtPayments.transactionId })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, deuda.id))

    expect(abono?.transactionId).not.toBeNull()
  })

  it('T-520 — el último abono la salda sin que nadie lo pida (FR-005)', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 30000000)
    const r = await abonoDe(deuda.id, 20000000)

    expect(r.ok && r.saldada).toBe(true)

    const leida = await leerDeuda(ANA, deuda.id)
    expect(leida?.fila.settledAt).not.toBeNull()
    expect(estaSaldada(comoDeuda(leida!.fila), comoAbonos(leida!.abonos))).toBe(true)
  })

  it('E3 — al saldarse sale de la lista activa', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 50000000)

    const activas = await listarDeudas(ANA)
    expect(activas.map((d) => d.fila.id)).not.toContain(deuda.id)

    const todas = await listarDeudas(ANA, { incluirSaldadas: true })
    expect(todas.map((d) => d.fila.id)).toContain(deuda.id)
  })

  it('FR-004 — un abono de más se rechaza y no deja rastro', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 30000000)

    const r = await abonoDe(deuda.id, 30000000)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.motivo).toBe('excede-el-saldo')

    // Criterio 4 de la spec: nada escrito.
    const leida = await leerDeuda(ANA, deuda.id)
    expect(leida?.abonos).toHaveLength(1)
  })

  it('no se puede abonar a una saldada', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 50000000)

    const r = await abonoDe(deuda.id, 1000)
    expect(!r.ok && r.motivo).toBe('ya-saldada')
  })
})

describe('E4 y E5 — lo que me deben', () => {
  it('un préstamo a favor no es gasto', async () => {
    const deuda = await crearDeuda(
      ANA,
      { direction: 'owed_to_me', counterparty: 'un amigo', originalCents: 8000000 },
      COP,
    )
    await registrarMovimientoDeDeuda(ANA, deuda, hoy())

    const [movimiento] = await db
      .select({ tipo: transactions.type, flujo: transactions.debtFlow })
      .from(transactions)
      .where(eq(transactions.userId, ANA))

    expect(movimiento?.tipo).toBe('debt')
    expect(movimiento?.flujo).toBe('lent')
  })

  it('E5 — que me devuelvan tampoco es ingreso (FR-008)', async () => {
    const deuda = await crearDeuda(
      ANA,
      { direction: 'owed_to_me', counterparty: 'un amigo', originalCents: 8000000 },
      COP,
    )
    const r = await abonar(ANA, deuda.id, {
      amountCents: 8000000,
      paidOn: toISO(hoy()),
      currency: COP,
    })

    const [movimiento] = await db
      .select({ tipo: transactions.type, flujo: transactions.debtFlow })
      .from(transactions)
      .where(eq(transactions.id, (r as { transactionId: string }).transactionId))

    expect(movimiento?.tipo).toBe('debt')
    expect(movimiento?.flujo).toBe('collected')
  })
})

describe('T-521 — saldar y reabrir', () => {
  it('se puede dar por saldada sin abonar el resto', async () => {
    const deuda = await deudaMia()
    expect(await saldar(ANA, deuda.id)).toBe(true)
    expect((await leerDeuda(ANA, deuda.id))?.fila.settledAt).not.toBeNull()
  })

  it('FR-014 — reabrir la devuelve a la lista, con sus abonos intactos', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 20000000)
    await saldar(ANA, deuda.id)

    expect(await reabrir(ANA, deuda.id)).toBe(true)

    const leida = await leerDeuda(ANA, deuda.id)
    expect(leida?.fila.settledAt).toBeNull()
    expect(leida?.abonos).toHaveLength(1)
    expect(saldoDe(comoDeuda(leida!.fila), comoAbonos(leida!.abonos)).cents).toBe(30000000)
  })

  it('descartar anula los movimientos, no los borra (Art. VII)', async () => {
    const deuda = await deudaMia()
    const r = await abonoDe(deuda.id, 20000000)
    const idMovimiento = (r as { transactionId: string }).transactionId

    await descartarDeuda(ANA, deuda.id)

    const [movimiento] = await db
      .select({ estado: transactions.status })
      .from(transactions)
      .where(eq(transactions.id, idMovimiento))

    expect(movimiento?.estado).toBe('voided')
  })
})

describe('FR-009 — los totales por dirección', () => {
  it('separa lo que debo de lo que me deben', async () => {
    await deudaMia(ANA, 50000000)
    await crearDeuda(
      ANA,
      { direction: 'owed_to_me', counterparty: 'un amigo', originalCents: 8000000 },
      COP,
    )

    expect(await totalesDeDeuda(ANA)).toEqual({ debo: 50000000, meDeben: 8000000 })
  })

  it('descuenta los abonos y excluye las saldadas', async () => {
    const deuda = await deudaMia(ANA, 50000000)
    await abonoDe(deuda.id, 20000000)

    const otra = await deudaMia(ANA, 10000000)
    await abonoDe(otra.id, 10000000)

    expect((await totalesDeDeuda(ANA)).debo).toBe(30000000)
  })
})

describe('T-522 — aislamiento entre cuentas (Art. VI.1)', () => {
  it('no se lee una deuda ajena', async () => {
    const deBruno = await deudaMia(BRUNO)
    expect(await leerDeuda(ANA, deBruno.id)).toBeNull()
  })

  it('no aparece en la lista de otro', async () => {
    await deudaMia(BRUNO)
    expect(await listarDeudas(ANA)).toHaveLength(0)
  })

  it('no se puede abonar a una ajena', async () => {
    const deBruno = await deudaMia(BRUNO)
    const r = await abonoDe(deBruno.id, 1000000)

    expect(r.ok).toBe(false)
    expect((await leerDeuda(BRUNO, deBruno.id))?.abonos).toHaveLength(0)
  })

  it('ni saldarla, ni reabrirla, ni descartarla', async () => {
    const deBruno = await deudaMia(BRUNO)

    expect(await saldar(ANA, deBruno.id)).toBe(false)
    expect(await reabrir(ANA, deBruno.id)).toBe(false)
    expect(await descartarDeuda(ANA, deBruno.id)).toBe(false)
    expect((await leerDeuda(BRUNO, deBruno.id))?.fila.settledAt).toBeNull()
  })

  it('borrar la cuenta se lleva sus deudas y sus abonos', async () => {
    const deuda = await deudaMia()
    await abonoDe(deuda.id, 20000000)

    await db.delete(user).where(eq(user.id, ANA))

    const [quedan] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(debts)
      .where(eq(debts.userId, ANA))
    expect(quedan?.n).toBe(0)

    const [abonos] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(debtPayments)
      .where(eq(debtPayments.debtId, deuda.id))
    expect(abonos?.n).toBe(0)
  })
})

describe('el vencimiento se guarda como fecha civil', () => {
  it('E7 — una deuda con vencimiento lo conserva', async () => {
    const enTresDias = toISO(addDays(hoy(), 3))
    const deuda = await deudaMia(ANA, 50000000, { dueOn: enTresDias })

    expect((await leerDeuda(ANA, deuda.id))?.fila.dueOn).toBe(enTresDias)
  })

  it('y sin fecha pactada se guarda nula, no una inventada', async () => {
    const deuda = await deudaMia()
    expect((await leerDeuda(ANA, deuda.id))?.fila.dueOn).toBeNull()
  })
})

describe('T-530 — lo que escribe la IA queda marcado', () => {
  it('una deuda creada por el asistente es rastreable hasta su origen', async () => {
    const deuda = await crearDeuda(
      ANA,
      {
        direction: 'owed_by_me',
        counterparty: 'mi hermana',
        originalCents: 20000000,
        createdBy: 'assistant',
      },
      COP,
    )

    const [fila] = await db
      .select({ origen: debts.createdBy })
      .from(debts)
      .where(eq(debts.id, deuda.id))

    expect(fila?.origen).toBe('assistant')
  })

  it('y una creada a mano queda como del usuario, sin pedirlo', async () => {
    const deuda = await deudaMia()

    const [fila] = await db
      .select({ origen: debts.createdBy })
      .from(debts)
      .where(eq(debts.id, deuda.id))

    expect(fila?.origen).toBe('user')
  })
})
