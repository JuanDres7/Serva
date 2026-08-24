import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { sql, eq } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions, recurringMovements, userSettings } from '@/lib/db/schema'
import { createTransaction } from '@/lib/db/queries/transactions'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  crearRecurrente,
  confirmarCobro,
  listarRecurrentes,
  pendientesDeConfirmar,
  contarPendientes,
} from '@/lib/db/queries/recurring'
import { todayIn, toISO, addDays } from '@/lib/domain/civil-date'

/**
 * El modelo de datos de la feature 010 (fase 2).
 *
 * Ninguna de estas pruebas necesita un modelo: comprueban qué queda escrito y
 * con qué marca, que es lo que hace cumplible el Artículo II.2.
 */

const ANA = 'test-esc-ana'
const ZONA = 'America/Bogota'
const hoy = () => todayIn(ZONA)

beforeEach(async () => {
  await db.delete(user).where(eq(user.id, ANA))
  await db
    .insert(user)
    .values({ id: ANA, name: 'Ana', email: `${ANA}@serva.local`, emailVerified: true })
})

afterAll(async () => {
  await db.delete(user).where(eq(user.id, ANA))
  await client.end()
})

describe('T-406 — quién escribió cada movimiento', () => {
  it('lo registrado por una persona queda marcado como suyo, sin pedirlo', async () => {
    const movimiento = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 2500000,
      currency: 'COP',
      category: 'groceries',
      occurredOn: toISO(hoy()),
      description: 'mercado',
      categorySource: 'user',
    })

    const [fila] = await db
      .select({ createdBy: transactions.createdBy, escritura: transactions.assistantWriteId })
      .from(transactions)
      .where(eq(transactions.id, movimiento.id))

    expect(fila?.createdBy).toBe('user')
    expect(fila?.escritura).toBeNull()
  })

  it('la columna distingue origen, que `categorySource` no puede', async () => {
    // `categorySource` dice cómo se eligió la categoría; podría valer 'model'
    // en un movimiento que tecleó la persona. Son dos preguntas distintas.
    const movimiento = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 1000000,
      currency: 'COP',
      category: 'eating_out',
      occurredOn: toISO(hoy()),
      description: 'almuerzo',
      categorySource: 'model',
    })

    const [fila] = await db
      .select({
        createdBy: transactions.createdBy,
        categorySource: transactions.categorySource,
      })
      .from(transactions)
      .where(eq(transactions.id, movimiento.id))

    expect(fila?.categorySource).toBe('model')
    expect(fila?.createdBy).toBe('user')
  })
})

describe('T-408 — la activación del registro automático', () => {
  it('una cuenta nueva nace con el automático apagado', async () => {
    await ensureUserSettings(ANA)

    const [fila] = await db
      .select({ activado: userSettings.autoRegisterEnabledAt })
      .from(userSettings)
      .where(eq(userSettings.userId, ANA))

    expect(fila?.activado).toBeNull()
  })

  it('guarda cuándo se activó, no solo que se activó', async () => {
    // El Artículo II.1 pide consentimiento consciente, y un booleano no
    // registra cuándo se dio. Con la marca de tiempo, «¿esto lo autorizó?»
    // tiene respuesta.
    await ensureUserSettings(ANA)
    const momento = new Date()

    await db
      .update(userSettings)
      .set({ autoRegisterEnabledAt: momento })
      .where(eq(userSettings.userId, ANA))

    const [fila] = await db
      .select({ activado: userSettings.autoRegisterEnabledAt })
      .from(userSettings)
      .where(eq(userSettings.userId, ANA))

    expect(fila?.activado?.getTime()).toBe(momento.getTime())
  })
})

describe('T-410 — un cobro de una sola vez se archiva, no se reprograma', () => {
  async function cobroUnico(dentroDeDias: number) {
    const fecha = addDays(hoy(), dentroDeDias)
    return crearRecurrente(
      ANA,
      {
        type: 'expense',
        amountCents: 20000000,
        category: 'debt',
        description: 'pago del préstamo',
        schedule: { kind: 'once', on: { year: fecha.year, month: fecha.month, day: fecha.day } },
      },
      { currency: 'COP', hoy: hoy() },
    )
  }

  it('E5 — queda programado para su fecha y aparece cuando llega', async () => {
    const cobro = await cobroUnico(0)

    expect(cobro.nextDueOn).toBe(toISO(hoy()))
    const pendientes = await pendientesDeConfirmar(ANA, hoy())
    expect(pendientes.map((p) => p.id)).toContain(cobro.id)
  })

  it('al confirmarlo no hay próxima fecha', async () => {
    const cobro = await cobroUnico(0)
    const resultado = await confirmarCobro(ANA, cobro.id)

    expect(resultado?.proximaFecha).toBeNull()
    expect(resultado?.transactionId).toBeTruthy()
  })

  it('deja de aparecer entre los pendientes y en la lista', async () => {
    const cobro = await cobroUnico(0)
    await confirmarCobro(ANA, cobro.id)

    expect(await contarPendientes(ANA, hoy())).toBe(0)
    expect((await listarRecurrentes(ANA)).map((r) => r.id)).not.toContain(cobro.id)
  })

  it('pero su fila sigue existiendo: archivar no es borrar (Art. VII)', async () => {
    const cobro = await cobroUnico(0)
    await confirmarCobro(ANA, cobro.id)

    const [fila] = await db
      .select({ id: recurringMovements.id, archivado: recurringMovements.archivedAt })
      .from(recurringMovements)
      .where(eq(recurringMovements.id, cobro.id))

    expect(fila?.id).toBe(cobro.id)
    expect(fila?.archivado).not.toBeNull()
  })

  it('y el movimiento que generó es uno normal, indistinguible de los demás', async () => {
    const cobro = await cobroUnico(0)
    const resultado = await confirmarCobro(ANA, cobro.id)

    const [movimiento] = await db
      .select({ monto: transactions.amountCents, fecha: transactions.occurredOn })
      .from(transactions)
      .where(eq(transactions.id, resultado!.transactionId))

    expect(movimiento?.monto).toBe(20000000)
    expect(movimiento?.fecha).toBe(toISO(hoy()))
  })

  it('un recurrente de verdad sí se reprograma', async () => {
    // La contraprueba: el cambio de T-410 no puede haber roto la spec 007.
    const mensual = await crearRecurrente(
      ANA,
      {
        type: 'expense',
        amountCents: 120000000,
        category: 'housing',
        description: 'arriendo',
        schedule: { kind: 'monthly', day: hoy().day },
      },
      { currency: 'COP', hoy: hoy() },
    )

    // Un mensual recién creado apunta al mes que viene. Se adelanta la fecha
    // para reproducir lo único en lo que se confirma un cobro: que su día haya
    // llegado.
    await db
      .update(recurringMovements)
      .set({ nextDueOn: toISO(hoy()) })
      .where(eq(recurringMovements.id, mensual.id))

    const resultado = await confirmarCobro(ANA, mensual.id)

    expect(resultado?.proximaFecha).not.toBeNull()
    expect((await listarRecurrentes(ANA)).map((r) => r.id)).toContain(mensual.id)
  })
})

describe('el aislamiento no se pierde con las columnas nuevas', () => {
  it('confirmar un cobro ajeno no hace nada', async () => {
    const OTRO = 'test-esc-otro'
    await db.delete(user).where(eq(user.id, OTRO))
    await db
      .insert(user)
      .values({ id: OTRO, name: 'Otro', email: `${OTRO}@serva.local`, emailVerified: true })

    const fecha = hoy()
    const cobro = await crearRecurrente(
      OTRO,
      {
        type: 'expense',
        amountCents: 5000000,
        category: 'debt',
        description: 'ajeno',
        schedule: { kind: 'once', on: { year: fecha.year, month: fecha.month, day: fecha.day } },
      },
      { currency: 'COP', hoy: fecha },
    )

    expect(await confirmarCobro(ANA, cobro.id)).toBeNull()

    const [fila] = await db
      .select({ archivado: recurringMovements.archivedAt })
      .from(recurringMovements)
      .where(eq(recurringMovements.id, cobro.id))
    expect(fila?.archivado).toBeNull()

    await db.delete(user).where(eq(user.id, OTRO))
  })
})

describe('sin comas flotantes en las columnas nuevas (Art. I)', () => {
  it('las columnas de dinero de la feature siguen siendo enteras', async () => {
    const columnas = await db.execute(sql`
      select column_name, data_type
      from information_schema.columns
      where table_name in ('assistant_writes', 'transactions', 'recurring_movements')
        and data_type in ('real', 'double precision', 'numeric')
    `)

    const flotantes = (columnas as unknown as { column_name: string }[]).map(
      (c) => c.column_name,
    )

    // `confidence` es la única excepción admitida, y es incertidumbre, no
    // dinero (D-054).
    expect(flotantes.filter((c) => c !== 'confidence')).toEqual([])
  })
})
