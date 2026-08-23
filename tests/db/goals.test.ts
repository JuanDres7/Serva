import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, savingsGoals } from '@/lib/db/schema'
import {
  crearMeta,
  listarMetas,
  obtenerMeta,
  moverEnMeta,
  eliminarMeta,
  contarMetasActivas,
  guardarImagen,
  leerImagen,
  MAXIMO_IMAGEN_BYTES,
} from '@/lib/db/queries/goals'
import { periodAggregates, categoryBreakdown } from '@/lib/db/queries/transactions'
import { computeTotals } from '@/lib/domain/balance'
import { CALENDAR_MONTH, periodFor } from '@/lib/domain/cycle'
import { todayIn } from '@/lib/domain/civil-date'

const ANA = 'test-goals-ana'
const BRUNO = 'test-goals-bruno'
const HOY = todayIn('America/Bogota')
const PERIODO = periodFor(CALENDAR_MONTH, HOY)

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

async function crearMoto(userId: string, objetivo = 600000000) {
  return crearMeta(
    userId,
    { name: 'Moto', targetCents: objetivo },
    { currency: 'COP' },
  )
}

describe('metas de ahorro', () => {
  beforeAll(async () => {
    for (const [id, email] of [
      [ANA, 'ana@goals.test'],
      [BRUNO, 'bruno@goals.test'],
    ]) {
      await db
        .insert(user)
        .values({ id: id!, name: id!, email: email!, emailVerified: false })
        .onConflictDoNothing()
    }
  })

  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
    await db.delete(savingsGoals).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('una meta nueva empieza en cero', async () => {
    await crearMoto(ANA)
    const [meta] = await listarMetas(ANA)

    expect(meta?.name).toBe('Moto')
    expect(meta?.aportadoCents).toBe(0)
  })

  it('el progreso es aportes menos retiros', async () => {
    // RN-001. El progreso no se guarda: se deriva de los movimientos, igual que
    // los saldos se derivan del historial.
    const moto = await crearMoto(ANA)

    await moverEnMeta(ANA, moto.id, {
      amountCents: 20000000,
      direccion: 'contribution',
      fecha: HOY,
    })
    await moverEnMeta(ANA, moto.id, {
      amountCents: 5000000,
      direccion: 'withdrawal',
      fecha: HOY,
    })

    expect((await obtenerMeta(ANA, moto.id))?.aportadoCents).toBe(15000000)
  })

  it('un aporte descuenta del disponible sin contar como gasto', async () => {
    // D-028: si el ahorro inflara el gasto, la aplicación diría «gastaste mucho»
    // justo cuando el usuario ahorró.
    const moto = await crearMoto(ANA)
    await moverEnMeta(ANA, moto.id, {
      amountCents: 20000000,
      direccion: 'contribution',
      fecha: HOY,
    })

    const totales = computeTotals(await periodAggregates(ANA, PERIODO, 'COP'))
    expect(totales.expense.cents).toBe(0)
    expect(totales.savedNet.cents).toBe(20000000)
    expect(totales.balance.cents).toBe(-20000000)

    // Y no aparece en el desglose de gasto.
    expect(await categoryBreakdown(ANA, PERIODO)).toEqual([])
  })

  it('un retiro devuelve el dinero al disponible', async () => {
    const moto = await crearMoto(ANA)
    await moverEnMeta(ANA, moto.id, {
      amountCents: 20000000,
      direccion: 'contribution',
      fecha: HOY,
    })
    await moverEnMeta(ANA, moto.id, {
      amountCents: 20000000,
      direccion: 'withdrawal',
      fecha: HOY,
    })

    const totales = computeTotals(await periodAggregates(ANA, PERIODO, 'COP'))
    expect(totales.savedNet.cents).toBe(0)
    expect(totales.balance.cents).toBe(0)
  })

  it('no se puede retirar más de lo aportado', async () => {
    const moto = await crearMoto(ANA)
    await moverEnMeta(ANA, moto.id, {
      amountCents: 10000000,
      direccion: 'contribution',
      fecha: HOY,
    })

    await expect(
      moverEnMeta(ANA, moto.id, {
        amountCents: 15000000,
        direccion: 'withdrawal',
        fecha: HOY,
      }),
    ).rejects.toThrow(/más de lo que has aportado/)
  })

  it('rechaza montos que no sean enteros positivos', async () => {
    const moto = await crearMoto(ANA)
    for (const monto of [0, -100, 15.5]) {
      await expect(
        moverEnMeta(ANA, moto.id, {
          amountCents: monto,
          direccion: 'contribution',
          fecha: HOY,
        }),
      ).rejects.toThrow()
    }
  })

  it('al completarla se marca como alcanzada y se archiva', async () => {
    const moto = await crearMoto(ANA, 10000000)
    const resultado = await moverEnMeta(ANA, moto.id, {
      amountCents: 10000000,
      direccion: 'contribution',
      fecha: HOY,
    })

    expect(resultado?.reciénAlcanzada).toBe(true)
    // Se archiva, no se borra (RN-004).
    expect(await listarMetas(ANA)).toHaveLength(0)
    expect(await listarMetas(ANA, { incluirLogradas: true })).toHaveLength(1)
  })

  it('un retiro puede devolver una meta lograda a activa', async () => {
    const moto = await crearMoto(ANA, 10000000)
    await moverEnMeta(ANA, moto.id, {
      amountCents: 10000000,
      direccion: 'contribution',
      fecha: HOY,
    })
    await moverEnMeta(ANA, moto.id, {
      amountCents: 4000000,
      direccion: 'withdrawal',
      fecha: HOY,
    })

    expect(await listarMetas(ANA)).toHaveLength(1)
  })

  it('cuenta las metas activas para el flujo de aportes', async () => {
    // FR-016: al aportar solo se listan las activas.
    await crearMoto(ANA)
    expect(await contarMetasActivas(ANA)).toBe(1)
  })

  it('admite varias metas a la vez', async () => {
    await crearMoto(ANA)
    await crearMeta(ANA, { name: 'Viaje', targetCents: 300000000 }, { currency: 'COP' })

    expect(await listarMetas(ANA)).toHaveLength(2)
  })

  it('guarda y devuelve la imagen', async () => {
    const moto = await crearMoto(ANA)
    const datos = Buffer.from('imagen-de-prueba')

    await guardarImagen(ANA, moto.id, { datos, tipo: 'image/png' })

    const leida = await leerImagen(ANA, moto.id)
    expect(leida?.tipo).toBe('image/png')
    expect(leida?.datos.toString()).toBe('imagen-de-prueba')
    expect((await obtenerMeta(ANA, moto.id))?.tieneImagen).toBe(true)
  })

  it('rechaza imágenes demasiado grandes', async () => {
    const moto = await crearMoto(ANA)
    const enorme = Buffer.alloc(MAXIMO_IMAGEN_BYTES + 1)

    await expect(
      guardarImagen(ANA, moto.id, { datos: enorme, tipo: 'image/png' }),
    ).rejects.toThrow(/demasiado grande/)
  })

  it('los movimientos anulados no cuentan en el progreso', async () => {
    const moto = await crearMoto(ANA)
    const aporte = await moverEnMeta(ANA, moto.id, {
      amountCents: 20000000,
      direccion: 'contribution',
      fecha: HOY,
    })

    await db
      .update(transactions)
      .set({ status: 'voided' })
      .where(sql`id = ${aporte!.transactionId}`)

    expect((await obtenerMeta(ANA, moto.id))?.aportadoCents).toBe(0)
  })
})

describe('aislamiento de las metas', () => {
  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
    await db.delete(savingsGoals).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('nadie ve ni toca las metas de otro', async () => {
    const deBruno = await crearMoto(BRUNO)

    expect(await listarMetas(ANA)).toHaveLength(0)
    expect(await obtenerMeta(ANA, deBruno.id)).toBeNull()
    expect(await leerImagen(ANA, deBruno.id)).toBeNull()
    expect(await eliminarMeta(ANA, deBruno.id)).toBe(false)
    expect(
      await moverEnMeta(ANA, deBruno.id, {
        amountCents: 1000,
        direccion: 'contribution',
        fecha: HOY,
      }),
    ).toBeNull()

    // Y la de Bruno sigue intacta.
    expect(await listarMetas(BRUNO)).toHaveLength(1)
  })
})
