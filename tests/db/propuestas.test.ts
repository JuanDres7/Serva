import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, assistantWrites, recurringMovements } from '@/lib/db/schema'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { createTransaction } from '@/lib/db/queries/transactions'
import {
  guardarPropuesta,
  leerPropuesta,
  aplicarCreacion,
  aplicarAnulacion,
  revertir,
  descartar,
  automaticoActivo,
  activarAutomatico,
  revocarAutomatico,
  HORAS_DE_VIGENCIA,
} from '@/lib/db/queries/assistant-writes'
import { todayIn, toISO, addDays } from '@/lib/domain/civil-date'
import type { MovimientoListo } from '@/lib/ai/propuesta'

/**
 * La ejecución de propuestas (spec 010, fase 5).
 *
 * **Aquí es donde se comprueba lo que protege al usuario**, y nada de ello
 * necesita un modelo: se siembra la propuesta ya formada y se intenta
 * aplicarla. Que no se escriba sin permiso, que una propuesta ajena o caducada
 * no haga nada, y que nada se escriba dos veces.
 */

const ANA = 'test-prop-ana'
const BRUNO = 'test-prop-bruno'
const ZONA = 'America/Bogota'
const hoy = () => todayIn(ZONA)

const movimiento = (parcial: Partial<MovimientoListo> = {}): MovimientoListo => ({
  tipo: 'expense',
  amountCents: 1800000,
  descripcion: 'tres cervezas',
  descripcionCorta: 'cervezas',
  categoria: 'entertainment',
  categoriaSegura: true,
  occurredOn: toISO(hoy()),
  esFuturo: false,
  ...parcial,
})

async function sembrar(userId: string, movimientos: MovimientoListo[] = [movimiento()]) {
  return guardarPropuesta({
    userId,
    kind: 'crear',
    inputText: 'salí de fiesta y me tomé tres cervezas de 18 mil',
    proposal: { movimientos },
  })
}

beforeEach(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await db.insert(user).values([
    { id: ANA, name: 'Ana', email: `${ANA}@serva.local`, emailVerified: true },
    { id: BRUNO, name: 'Bruno', email: `${BRUNO}@serva.local`, emailVerified: true },
  ])
  await ensureUserSettings(ANA)
  await ensureUserSettings(BRUNO)
})

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

describe('T-422 y T-423 — persistir y ejecutar', () => {
  it('la propuesta se guarda antes de mostrarse, con la frase de origen', async () => {
    const id = await sembrar(ANA)
    const guardada = await leerPropuesta(ANA, id)

    expect(guardada?.status).toBe('propuesta')
    expect(guardada?.kind).toBe('crear')
  })

  it('aplicarla escribe el movimiento y lo marca como del asistente', async () => {
    const id = await sembrar(ANA)
    const resultado = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    expect(resultado.ok).toBe(true)

    const [fila] = await db
      .select({
        monto: transactions.amountCents,
        origen: transactions.createdBy,
        escritura: transactions.assistantWriteId,
      })
      .from(transactions)
      .where(eq(transactions.userId, ANA))

    expect(fila?.monto).toBe(1800000)
    expect(fila?.origen).toBe('assistant')
    expect(fila?.escritura).toBe(id)
  })

  it('FR-011 — desde el movimiento se llega hasta la frase que lo originó', async () => {
    const id = await sembrar(ANA)
    await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    const [movimientoEscrito] = await db
      .select({ escritura: transactions.assistantWriteId })
      .from(transactions)
      .where(eq(transactions.userId, ANA))

    const [escritura] = await db
      .select({ frase: assistantWrites.inputText })
      .from(assistantWrites)
      .where(eq(assistantWrites.id, movimientoEscrito!.escritura!))

    expect(escritura?.frase).toContain('tres cervezas')
  })
})

describe('T-424 — varios movimientos de un mismo mensaje', () => {
  it('entran todos los que estaban completos', async () => {
    const id = await sembrar(ANA, [
      movimiento({ descripcion: 'almuerzo', amountCents: 2000000, categoria: 'eating_out' }),
      movimiento({ descripcion: 'bus', amountCents: 500000, categoria: 'transport' }),
    ])

    const resultado = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    expect(resultado.ok && resultado.transactionIds).toHaveLength(2)
  })
})

describe('T-425 — una propuesta ajena no escribe nada', () => {
  it('aplicar con el identificador de otro no encuentra nada', async () => {
    const deBruno = await sembrar(BRUNO)

    const resultado = await aplicarCreacion({
      userId: ANA,
      id: deBruno,
      currency: 'COP',
      hoy: hoy(),
    })

    expect(resultado).toEqual({ ok: false, motivo: 'no-existe' })
  })

  it('y no toca ninguna fila de ninguno de los dos', async () => {
    const deBruno = await sembrar(BRUNO)
    await aplicarCreacion({ userId: ANA, id: deBruno, currency: 'COP', hoy: hoy() })

    const [total] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(sql`${transactions.userId} in (${ANA}, ${BRUNO})`)

    expect(total?.n).toBe(0)
    expect((await leerPropuesta(BRUNO, deBruno))?.status).toBe('propuesta')
  })
})

describe('T-426 — una propuesta resuelta no se vuelve a aplicar (FR-025)', () => {
  it('pulsar dos veces escribe una vez', async () => {
    const id = await sembrar(ANA)

    const primera = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })
    const segunda = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    expect(primera.ok).toBe(true)
    expect(segunda).toEqual({ ok: false, motivo: 'ya-resuelta' })

    const [total] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.userId, ANA))
    expect(total?.n).toBe(1)
  })

  it('una descartada tampoco se aplica después', async () => {
    const id = await sembrar(ANA)
    await descartar(ANA, id)

    const resultado = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })
    expect(resultado).toEqual({ ok: false, motivo: 'ya-resuelta' })
  })

  it('una revertida tampoco', async () => {
    const id = await sembrar(ANA)
    await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })
    await revertir({ userId: ANA, id })

    const resultado = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })
    expect(resultado).toEqual({ ok: false, motivo: 'ya-resuelta' })
  })
})

describe(`T-427 — las propuestas caducan a las ${HORAS_DE_VIGENCIA} horas`, () => {
  async function envejecer(id: string, horas: number) {
    await db
      .update(assistantWrites)
      .set({ createdAt: new Date(Date.now() - horas * 60 * 60 * 1000) })
      .where(eq(assistantWrites.id, id))
  }

  it('una de ayer no se aplica, y dice por qué', async () => {
    const id = await sembrar(ANA)
    await envejecer(id, HORAS_DE_VIGENCIA + 1)

    const resultado = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    expect(resultado).toEqual({ ok: false, motivo: 'caducada' })
  })

  it('y queda marcada como caducada, no en el limbo', async () => {
    const id = await sembrar(ANA)
    await envejecer(id, HORAS_DE_VIGENCIA + 1)
    await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    expect((await leerPropuesta(ANA, id))?.status).toBe('caducada')
  })

  it('una de hace una hora sigue valiendo', async () => {
    const id = await sembrar(ANA)
    await envejecer(id, 1)

    const resultado = await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })
    expect(resultado.ok).toBe(true)
  })
})

describe('T-428 — revertir es inmediato y anula lo escrito (FR-023)', () => {
  it('deja el movimiento anulado y la propuesta como revertida', async () => {
    const id = await sembrar(ANA)
    await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    const resultado = await revertir({ userId: ANA, id })
    expect(resultado.ok).toBe(true)

    const [fila] = await db
      .select({ estado: transactions.status })
      .from(transactions)
      .where(eq(transactions.userId, ANA))

    expect(fila?.estado).toBe('voided')
    expect((await leerPropuesta(ANA, id))?.status).toBe('revertida')
  })

  it('anular no borra: la fila sigue existiendo (Art. VII)', async () => {
    const id = await sembrar(ANA)
    await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })
    await revertir({ userId: ANA, id })

    const [total] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.userId, ANA))
    expect(total?.n).toBe(1)
  })

  it('revertir lo de otro no hace nada', async () => {
    const deBruno = await sembrar(BRUNO)
    await aplicarCreacion({ userId: BRUNO, id: deBruno, currency: 'COP', hoy: hoy() })

    expect(await revertir({ userId: ANA, id: deBruno })).toEqual({
      ok: false,
      motivo: 'no-existe',
    })
  })
})

describe('E5 — lo que cae en el futuro se programa, no se registra', () => {
  it('un movimiento futuro entra como cobro y no como movimiento', async () => {
    const futuro = toISO(addDays(hoy(), 15))
    const id = await sembrar(ANA, [
      movimiento({
        descripcion: 'pago del préstamo',
        amountCents: 20000000,
        categoria: 'debt',
        occurredOn: futuro,
        esFuturo: true,
      }),
    ])

    await aplicarCreacion({ userId: ANA, id, currency: 'COP', hoy: hoy() })

    const [movimientos] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.userId, ANA))
    expect(movimientos?.n).toBe(0)

    const [cobro] = await db
      .select({ fecha: recurringMovements.nextDueOn })
      .from(recurringMovements)
      .where(eq(recurringMovements.userId, ANA))
    expect(cobro?.fecha).toBe(futuro)
  })
})

describe('T-429 y T-430 — la activación (Art. II.1)', () => {
  it('una cuenta nueva no tiene el automático activo', async () => {
    expect(await automaticoActivo(ANA)).toBe(false)
  })

  it('activar y revocar, ambas desde el chat', async () => {
    await activarAutomatico(ANA)
    expect(await automaticoActivo(ANA)).toBe(true)

    await revocarAutomatico(ANA)
    expect(await automaticoActivo(ANA)).toBe(false)
  })

  it('activar en una cuenta no activa la otra', async () => {
    await activarAutomatico(ANA)
    expect(await automaticoActivo(BRUNO)).toBe(false)
  })
})

describe('anular hablando', () => {
  it('anula el movimiento señalado y lo deja restaurable', async () => {
    const existente = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 2400000,
      currency: 'COP',
      category: 'eating_out',
      occurredOn: toISO(hoy()),
      description: 'almuerzo',
    })

    const id = await guardarPropuesta({
      userId: ANA,
      kind: 'anular',
      inputText: 'quita el almuerzo de ayer',
      proposal: { transactionId: existente.id },
    })

    const resultado = await aplicarAnulacion({ userId: ANA, id })
    expect(resultado.ok).toBe(true)

    const [fila] = await db
      .select({ estado: transactions.status })
      .from(transactions)
      .where(eq(transactions.id, existente.id))
    expect(fila?.estado).toBe('voided')
  })
})
