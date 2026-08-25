import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { createTransaction } from '@/lib/db/queries/transactions'
import { crearRecurrente } from '@/lib/db/queries/recurring'
import { crearDeuda } from '@/lib/db/queries/debts'
import { todayIn, toISO } from '@/lib/domain/civil-date'

/**
 * La mayúscula inicial, en los tres bordes por los que se escribe (D-076).
 *
 * Se comprueba contra la base y no sobre la función pura porque lo que importa
 * no es que `enMayuscula` funcione —eso ya está probado aparte— sino que **no
 * haya camino que se la salte**. El formulario, Serva AI y los recurrentes al
 * materializarse escriben por sitios distintos; ponerla en cada uno era la
 * versión frágil de esto.
 */

const ANA = 'test-mayus-ana'
const ZONA = 'America/Bogota'
const COP = 'COP'
const HOY = todayIn(ZONA)

beforeEach(async () => {
  await db.delete(user).where(sql`id = ${ANA}`)
  await db
    .insert(user)
    .values({ id: ANA, name: 'Ana', email: `${ANA}@serva.local`, emailVerified: true })
})

afterAll(async () => {
  await db.delete(user).where(sql`id = ${ANA}`)
  await client.end()
})

describe('movimientos', () => {
  it('la descripción se guarda con la primera en mayúscula', async () => {
    const fila = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 5000000,
      currency: COP,
      category: 'entertainment',
      occurredOn: toISO(HOY),
      description: 'palomitas cine',
      descriptionShort: 'palomitas cine',
      categorySource: 'user',
    })

    expect(fila.description).toBe('Palomitas cine')
    expect(fila.descriptionShort).toBe('Palomitas cine')
  })

  it('sin descripción no hay nada que capitalizar', async () => {
    const suelto = await createTransaction(ANA, {
      type: 'expense',
      amountCents: 1000,
      currency: COP,
      category: 'other_expense',
      occurredOn: toISO(HOY),
      categorySource: 'user',
    })

    expect(suelto.description).toBeNull()
  })
})

describe('recurrentes', () => {
  it('«arriendo» se guarda «Arriendo»', async () => {
    const creado = await crearRecurrente(
      ANA,
      {
        type: 'expense',
        amountCents: 120000000,
        category: 'housing',
        description: 'arriendo del mes',
        schedule: { kind: 'monthly', day: 5 },
      },
      { currency: COP, hoy: HOY },
    )

    expect(creado.description).toBe('Arriendo del mes')
  })
})

describe('deudas', () => {
  it('la contraparte también: «primo» se guarda «Primo»', async () => {
    const creada = await crearDeuda(
      ANA,
      { direction: 'owed_by_me', counterparty: 'primo', originalCents: 5000000 },
      COP,
    )

    expect(creada.counterparty).toBe('Primo')
  })
})
