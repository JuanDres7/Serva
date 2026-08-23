import { describe, it, expect, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'

/**
 * T-004 — La aplicación alcanza la base de datos.
 *
 * Verifica también que pgvector está disponible, porque la categorización por
 * similitud (D-013) depende de esa extensión y descubrir que falta más adelante
 * sería mucho más caro.
 */
describe('conexión a la base de datos', () => {
  afterAll(async () => {
    await client.end()
  })

  it('ejecuta una consulta y devuelve resultado', async () => {
    const result = await db.execute(sql`SELECT 1 AS uno`)
    expect(result[0]).toEqual({ uno: 1 })
  })

  it('tiene la extensión pgvector disponible', async () => {
    const result = await db.execute(
      sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
    )
    expect(result).toHaveLength(1)
  })
})
