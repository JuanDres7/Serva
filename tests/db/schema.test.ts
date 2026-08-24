import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { transactions, user } from '@/lib/db/schema'
import { CATEGORIES } from '@/lib/domain/categories'

const USER_ID = 'test-schema-user'

describe('esquema de datos', () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({
        id: USER_ID,
        name: 'Usuario de prueba',
        email: 'schema@test.local',
        emailVerified: false,
      })
      .onConflictDoNothing()
  })

  afterAll(async () => {
    await db.delete(user).where(sql`id = ${USER_ID}`)
    await client.end()
  })

  it('no usa coma flotante salvo en la única excepción justificada', async () => {
    // Criterio 4 de la spec 001 y Artículo I: un `real` o `double precision`
    // rompería la exactitud de los montos.
    //
    // Las excepciones son nominales, no categóricas: las dos columnas
    // `confidence`. El Artículo I prohíbe la coma flotante *para montos*, donde
    // un céntimo perdido corrompe el historial. Una confianza es aproximada por
    // naturaleza —0,7341 y 0,7342 significan lo mismo— y aplicarle la regla del
    // dinero sería obedecer la letra ignorando la razón (plan 002, §5).
    //
    // `assistant_writes.confidence` se añadió con la feature 010 por el mismo
    // motivo, y hubo que añadirla aquí a mano: esta prueba falló al aparecer,
    // que es exactamente lo que se espera de ella. Cualquier otra columna de
    // coma flotante que aparezca vuelve a hacerla fallar.
    const columnas = await db.execute<{ table_name: string; column_name: string }>(sql`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('real', 'double precision', 'float', 'money')
        AND NOT (table_name = 'categorization_log' AND column_name = 'confidence')
        AND NOT (table_name = 'assistant_writes' AND column_name = 'confidence')
    `)
    expect(columnas).toHaveLength(0)
  })

  it('ninguna columna de montos usa coma flotante', async () => {
    // La comprobación que de verdad protege el Artículo I: toda columna que
    // guarde dinero debe ser entera, se llame como se llame.
    const columnas = await db.execute<{ data_type: string }>(sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (column_name LIKE '%amount%' OR column_name LIKE '%cents%'
             OR column_name LIKE '%monto%' OR column_name LIKE '%price%')
    `)
    for (const columna of columnas) {
      expect(columna.data_type).toBe('bigint')
    }
    expect(columnas.length).toBeGreaterThan(0)
  })

  it('guarda los montos como entero de 64 bits', async () => {
    const [columna] = await db.execute<{ data_type: string }>(sql`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'amount_cents'
    `)
    expect(columna?.data_type).toBe('bigint')
  })

  it('el catálogo de la base coincide exactamente con el del código', async () => {
    // Dos fuentes de verdad que se desincronizan es justo lo que este enumerado
    // pretende evitar. Si alguien añade una categoría en un sitio y no en el otro,
    // esta prueba lo detiene.
    const filas = await db.execute<{ valor: string }>(sql`
      SELECT unnest(enum_range(NULL::category_key))::text AS valor
    `)
    const enBase = new Set(filas.map((f) => f.valor))
    const enCodigo = new Set(CATEGORIES.map((c) => c.key))
    expect([...enBase].sort()).toEqual([...enCodigo].sort())
  })

  it('la base rechaza un monto que no sea positivo', async () => {
    await expect(
      db.insert(transactions).values({
        userId: USER_ID,
        type: 'expense',
        amountCents: -1000,
        currency: 'COP',
        category: 'groceries',
        occurredOn: '2026-08-01',
      }),
    ).rejects.toThrow()
  })

  it('la base rechaza una fecha futura', async () => {
    await expect(
      db.insert(transactions).values({
        userId: USER_ID,
        type: 'expense',
        amountCents: 1000,
        currency: 'COP',
        category: 'groceries',
        occurredOn: '2099-01-01',
      }),
    ).rejects.toThrow()
  })

  it('la base rechaza un gasto sin categoría', async () => {
    await expect(
      db.insert(transactions).values({
        userId: USER_ID,
        type: 'expense',
        amountCents: 1000,
        currency: 'COP',
        occurredOn: '2026-08-01',
      }),
    ).rejects.toThrow()
  })

  it('la base rechaza un ahorro con categoría: su destino es la meta', async () => {
    await expect(
      db.insert(transactions).values({
        userId: USER_ID,
        type: 'saving',
        amountCents: 1000,
        currency: 'COP',
        category: 'groceries',
        occurredOn: '2026-08-01',
      }),
    ).rejects.toThrow()
  })

  it('acepta un movimiento válido y lo devuelve intacto', async () => {
    const [fila] = await db
      .insert(transactions)
      .values({
        userId: USER_ID,
        type: 'expense',
        amountCents: 1541850,
        currency: 'COP',
        category: 'eating_out',
        occurredOn: '2026-08-01',
        description: 'almuerzo con el equipo',
      })
      .returning()

    expect(fila?.amountCents).toBe(1541850)
    expect(fila?.occurredOn).toBe('2026-08-01')
    expect(fila?.status).toBe('active')

    await db.delete(transactions).where(sql`id = ${fila!.id}`)
  })

  it('tiene los índices que exige el plan', async () => {
    const indices = await db.execute<{ indexname: string }>(sql`
      SELECT indexname FROM pg_indexes WHERE tablename = 'transactions'
    `)
    const nombres = indices.map((i) => i.indexname)
    expect(nombres).toContain('transactions_user_date_idx')
    expect(nombres).toContain('transactions_user_category_idx')
    expect(nombres).toContain('transactions_user_status_idx')
  })
})
