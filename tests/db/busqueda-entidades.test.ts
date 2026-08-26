import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { crearMeta, buscarMetaPorNombre } from '@/lib/db/queries/goals'
import {
  crearRecurrente,
  buscarRecurrentePorDescripcion,
} from '@/lib/db/queries/recurring'
import {
  guardarPresupuesto,
  buscarPresupuestoPorCategoria,
} from '@/lib/db/queries/budgets'
import { todayIn } from '@/lib/domain/civil-date'

const ANA = 'test-busqueda-ana'
const BRUNO = 'test-busqueda-bruno'
const HOY = todayIn('America/Bogota')

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

describe('buscarMetaPorNombre', () => {
  beforeAll(async () => {
    for (const [id, email] of [
      [ANA, 'ana@busqueda.test'],
      [BRUNO, 'bruno@busqueda.test'],
    ]) {
      await db
        .insert(user)
        .values({ id: id!, name: id!, email: email!, emailVerified: false })
        .onConflictDoNothing()
    }

    await crearMeta(
      ANA,
      { name: 'Viaje a Japón', targetCents: 5000000000 },
      { currency: 'COP' },
    )
    await crearMeta(
      ANA,
      { name: 'Nuevo carro', targetCents: 80000000000 },
      { currency: 'COP' },
    )
  })

  it('encuentra meta por nombre parcial (viaje → Viaje a Japón)', async () => {
    const resultado = await buscarMetaPorNombre(ANA, 'viaje')
    expect(resultado.resultado).toBe('exacta')
    if (resultado.resultado === 'exacta') {
      expect(resultado.meta.name).toBe('Viaje a Japón')
    }
  })

  it('encuentra meta por nombre parcial bidireccional (Japón → Viaje a Japón)', async () => {
    const resultado = await buscarMetaPorNombre(ANA, 'Japón')
    expect(resultado.resultado).toBe('exacta')
  })

  it('devuelve varias cuando hay múltiples coincidencias', async () => {
    // "a" coincide con ambas metas
    const resultado = await buscarMetaPorNombre(ANA, 'a')
    expect(resultado.resultado).toBe('varias')
    if (resultado.resultado === 'varias') {
      expect(resultado.candidatos.length).toBeGreaterThan(1)
    }
  })

  it('devuelve ninguna cuando no hay coincidencias', async () => {
    const resultado = await buscarMetaPorNombre(ANA, 'luz')
    expect(resultado.resultado).toBe('ninguna')
    if (resultado.resultado === 'ninguna') {
      expect(resultado.metasActivas.length).toBeGreaterThan(0)
    }
  })

  it('respeta aislamiento de usuario', async () => {
    const resultado = await buscarMetaPorNombre(BRUNO, 'viaje')
    expect(resultado.resultado).toBe('ninguna')
    if (resultado.resultado === 'ninguna') {
      expect(resultado.metasActivas.length).toBe(0)
    }
  })
})

describe('buscarRecurrentePorDescripcion', () => {
  beforeAll(async () => {
    await crearRecurrente(
      ANA,
      {
        type: 'expense',
        amountCents: 5000000,
        category: 'utilities',
        description: 'Internet mensual',
        schedule: { kind: 'monthly', day: 15 },
      },
      { currency: 'COP', hoy: HOY },
    )
  })

  it('encuentra recurrente por descripción parcial', async () => {
    const resultado = await buscarRecurrentePorDescripcion(ANA, 'internet')
    expect(resultado.resultado).toBe('exacta')
    if (resultado.resultado === 'exacta') {
      expect(resultado.recurrente.description).toContain('Internet')
    }
  })

  it('encuentra recurrente por descripción bidireccional', async () => {
    const resultado = await buscarRecurrentePorDescripcion(ANA, 'mensual')
    expect(resultado.resultado).toBe('exacta')
  })

  it('devuelve ninguna cuando no hay coincidencias', async () => {
    const resultado = await buscarRecurrentePorDescripcion(ANA, 'luz')
    expect(resultado.resultado).toBe('ninguna')
  })

  it('respeta aislamiento de usuario', async () => {
    const resultado = await buscarRecurrentePorDescripcion(BRUNO, 'internet')
    expect(resultado.resultado).toBe('ninguna')
    if (resultado.resultado === 'ninguna') {
      expect(resultado.recurrentes.length).toBe(0)
    }
  })
})

describe('buscarPresupuestoPorCategoria', () => {
  beforeAll(async () => {
    await guardarPresupuesto(
      ANA,
      { category: 'groceries', limitCents: 200000000 },
      { currency: 'COP' },
    )
  })

  it('resuelve nombre de categoría a clave y encuentra presupuesto', async () => {
    const resultado = await buscarPresupuestoPorCategoria(ANA, 'mercado')
    expect(resultado.resultado).toBe('exacta')
    if (resultado.resultado === 'exacta') {
      expect(resultado.presupuesto.category).toBe('groceries')
    }
  })

  it('resuelve nombre en inglés a clave', async () => {
    const resultado = await buscarPresupuestoPorCategoria(ANA, 'groceries')
    expect(resultado.resultado).toBe('exacta')
  })

  it('devuelve ninguna para texto que no es categoría', async () => {
    const resultado = await buscarPresupuestoPorCategoria(ANA, 'viaje')
    expect(resultado.resultado).toBe('ninguna')
  })

  it('devuelve ninguna para categoría sin presupuesto', async () => {
    const resultado = await buscarPresupuestoPorCategoria(ANA, 'transporte')
    expect(resultado.resultado).toBe('ninguna')
    // Devuelve todos los presupuestos del usuario para que el modelo sugiera alternativas
    if (resultado.resultado === 'ninguna') {
      expect(resultado.presupuestos.length).toBe(1) // Tiene el de groceries
    }
  })

  it('respeta aislamiento de usuario', async () => {
    const resultado = await buscarPresupuestoPorCategoria(BRUNO, 'mercado')
    expect(resultado.resultado).toBe('ninguna')
  })
})
