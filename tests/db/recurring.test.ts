import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, recurringMovements } from '@/lib/db/schema'
import {
  crearRecurrente,
  listarRecurrentes,
  pendientesDeConfirmar,
  contarPendientes,
  confirmarCobro,
  reprogramar,
  eliminarRecurrente,
} from '@/lib/db/queries/recurring'
import { listTransactions } from '@/lib/db/queries/transactions'
import { fromISO, toISO } from '@/lib/domain/civil-date'

const ANA = 'test-recurring-ana'
const BRUNO = 'test-recurring-bruno'
const HOY = fromISO('2026-08-23')

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

async function crearArriendo(userId: string, day = 1) {
  return crearRecurrente(
    userId,
    {
      type: 'expense',
      amountCents: 120000000,
      category: 'housing',
      description: 'arriendo',
      schedule: { kind: 'monthly', day },
    },
    { currency: 'COP', hoy: HOY },
  )
}

describe('movimientos recurrentes', () => {
  beforeAll(async () => {
    for (const [id, email] of [
      [ANA, 'ana@recurring.test'],
      [BRUNO, 'bruno@recurring.test'],
    ]) {
      await db
        .insert(user)
        .values({ id: id!, name: id!, email: email!, emailVerified: false })
        .onConflictDoNothing()
    }
  })

  beforeEach(async () => {
    await db.delete(recurringMovements).where(sql`user_id in (${ANA}, ${BRUNO})`)
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('se define con su próxima fecha calculada', async () => {
    const arriendo = await crearArriendo(ANA, 1)
    // El día 1 de agosto ya pasó, así que el próximo cobro es en septiembre.
    expect(arriendo.nextDueOn).toBe('2026-09-01')
  })

  it('rechaza una categoría que no corresponde al tipo', async () => {
    await expect(
      crearRecurrente(
        ANA,
        {
          type: 'expense',
          amountCents: 1000,
          category: 'salary',
          description: 'sueldo',
          schedule: { kind: 'monthly', day: 5 },
        },
        { currency: 'COP', hoy: HOY },
      ),
    ).rejects.toThrow()
  })

  it('un cobro vencido aparece entre los pendientes', async () => {
    const spotify = await crearRecurrente(
      ANA,
      {
        type: 'expense',
        amountCents: 1690000,
        category: 'subscriptions',
        description: 'suscripción de música',
        schedule: { kind: 'monthly', day: 30 },
      },
      { currency: 'COP', hoy: HOY },
    )

    await reprogramar(ANA, spotify.id, '2026-08-20')

    const pendientes = await pendientesDeConfirmar(ANA, HOY)
    expect(pendientes).toHaveLength(1)
    expect(await contarPendientes(ANA, HOY)).toBe(1)
  })

  it('un cobro futuro no aparece como pendiente', async () => {
    await crearArriendo(ANA, 1)
    expect(await pendientesDeConfirmar(ANA, HOY)).toHaveLength(0)
  })

  it('confirmar registra un movimiento normal y adelanta la fecha', async () => {
    const arriendo = await crearArriendo(ANA, 1)
    await reprogramar(ANA, arriendo.id, '2026-08-01')

    const resultado = await confirmarCobro(ANA, arriendo.id)
    expect(resultado?.proximaFecha).toBe('2026-09-01')

    // El movimiento es indistinguible de uno creado a mano (FR-008).
    const movimientos = await listTransactions(ANA)
    expect(movimientos).toHaveLength(1)
    expect(movimientos[0]?.amountCents).toBe(120000000)
    expect(movimientos[0]?.occurredOn).toBe('2026-08-01')
    expect(movimientos[0]?.category).toBe('housing')
  })

  it('el monto nuevo se conserva para los próximos cobros', async () => {
    const spotify = await crearRecurrente(
      ANA,
      {
        type: 'expense',
        amountCents: 1690000,
        category: 'subscriptions',
        description: 'suscripción',
        schedule: { kind: 'monthly', day: 5 },
      },
      { currency: 'COP', hoy: HOY },
    )
    await reprogramar(ANA, spotify.id, '2026-08-05')

    // Subió de precio: el cambio vale de ahora en adelante.
    await confirmarCobro(ANA, spotify.id, { amountCents: 1890000 })

    const [actualizado] = await listarRecurrentes(ANA)
    expect(actualizado?.amountCents).toBe(1890000)
  })

  it('un cambio puntual no altera los próximos cobros', async () => {
    const arriendo = await crearArriendo(ANA, 5)
    await reprogramar(ANA, arriendo.id, '2026-08-05')

    // Un descuento de una sola vez: el arriendo sigue siendo el de siempre.
    await confirmarCobro(ANA, arriendo.id, {
      amountCents: 100000000,
      montoPermanente: false,
    })

    const [actualizado] = await listarRecurrentes(ANA)
    expect(actualizado?.amountCents).toBe(120000000)

    // Pero el movimiento registrado sí lleva el monto real pagado.
    const movimientos = await listTransactions(ANA)
    expect(movimientos[0]?.amountCents).toBe(100000000)
  })

  it('la serie no se desplaza aunque se confirme tarde', async () => {
    // RN-002: la próxima fecha se calcula desde el cobro confirmado, no desde
    // hoy. Quien entra con días de retraso no desordena todos los siguientes.
    const arriendo = await crearArriendo(ANA, 5)
    await reprogramar(ANA, arriendo.id, '2026-08-05')

    const resultado = await confirmarCobro(ANA, arriendo.id)
    expect(resultado?.proximaFecha).toBe('2026-09-05')
  })

  it('reprogramar mueve el cobro sin registrar nada', async () => {
    const arriendo = await crearArriendo(ANA, 1)
    await reprogramar(ANA, arriendo.id, '2026-09-10')

    const [actualizado] = await listarRecurrentes(ANA)
    expect(actualizado?.nextDueOn).toBe('2026-09-10')
    expect(await listTransactions(ANA)).toHaveLength(0)
  })

  it('eliminar no borra los movimientos que ya generó', async () => {
    // Son gastos que de verdad ocurrieron: borrarlos falsearía el historial.
    const arriendo = await crearArriendo(ANA, 1)
    await reprogramar(ANA, arriendo.id, '2026-08-01')
    await confirmarCobro(ANA, arriendo.id)

    await eliminarRecurrente(ANA, arriendo.id)

    expect(await listarRecurrentes(ANA)).toHaveLength(0)
    expect(await listTransactions(ANA)).toHaveLength(1)
  })

  it('no se puede programar un ahorro', async () => {
    // El ahorro va a metas, donde tiene destino.
    await expect(
      db.insert(recurringMovements).values({
        userId: ANA,
        type: 'saving',
        amountCents: 1000,
        currency: 'COP',
        category: 'housing',
        description: 'ahorro',
        schedule: { kind: 'monthly', day: 5 },
        nextDueOn: '2026-09-05',
      }),
    ).rejects.toThrow()
  })
})

describe('aislamiento de los recurrentes', () => {
  beforeEach(async () => {
    await db.delete(recurringMovements).where(sql`user_id in (${ANA}, ${BRUNO})`)
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('nadie ve ni toca los recurrentes de otro', async () => {
    const deBruno = await crearArriendo(BRUNO, 1)

    expect(await listarRecurrentes(ANA)).toHaveLength(0)
    expect(await contarPendientes(ANA, HOY)).toBe(0)
    expect(await confirmarCobro(ANA, deBruno.id)).toBeNull()
    expect(await reprogramar(ANA, deBruno.id, '2026-09-09')).toBe(false)
    expect(await eliminarRecurrente(ANA, deBruno.id)).toBe(false)

    // Y el de Bruno sigue intacto.
    const [suyo] = await listarRecurrentes(BRUNO)
    expect(suyo?.nextDueOn).toBe(toISO(fromISO('2026-09-01')))
  })
})
