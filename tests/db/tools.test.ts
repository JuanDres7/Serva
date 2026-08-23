import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, transactions } from '@/lib/db/schema'
import { crearHerramientas, type ContextoHerramientas } from '@/lib/ai/tools'
import { createTransaction } from '@/lib/db/queries/transactions'
import { todayIn, toISO, addDays } from '@/lib/domain/civil-date'

/**
 * Las herramientas del asistente, probadas **sin modelo**.
 *
 * Es lo que de verdad importa verificar: el modelo solo elige cuál llamar, pero
 * las cifras salen de aquí. Si estas están mal, el asistente responde con
 * seguridad datos incorrectos, que es el peor fallo posible.
 */

const ANA = 'test-tools-ana'
const BRUNO = 'test-tools-bruno'
const ZONA = 'America/Bogota'

const contextoDe = (userId: string): ContextoHerramientas => ({
  userId,
  cycleConfig: { kind: 'calendar-month' },
  currency: 'COP',
  locale: 'es-CO',
  timeZone: ZONA,
})

/** Ejecuta una herramienta como lo haría el SDK. */
async function ejecutar(
  userId: string,
  nombre: keyof ReturnType<typeof crearHerramientas>,
  argumentos: Record<string, unknown> = {},
) {
  const herramientas = crearHerramientas(contextoDe(userId))
  const herramienta = herramientas[nombre] as unknown as {
    execute: (args: unknown, opciones: unknown) => Promise<unknown>
  }
  return herramienta.execute(argumentos, {}) as Promise<Record<string, never>>
}

const hoy = () => todayIn(ZONA)

async function gastar(userId: string, cents: number, categoria: string, descripcion = 'gasto') {
  return createTransaction(userId, {
    type: 'expense',
    amountCents: cents,
    currency: 'COP',
    category: categoria,
    occurredOn: toISO(hoy()),
    description: descripcion,
    categorySource: 'user',
  })
}

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

describe('herramientas del asistente', () => {
  beforeAll(async () => {
    for (const [id, email] of [
      [ANA, 'ana@tools.test'],
      [BRUNO, 'bruno@tools.test'],
    ]) {
      await db
        .insert(user)
        .values({ id: id!, name: id!, email: email!, emailVerified: false })
        .onConflictDoNothing()
    }
  })

  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('los totales coinciden con lo registrado', async () => {
    await gastar(ANA, 5000000, 'groceries')
    await createTransaction(ANA, {
      type: 'income',
      amountCents: 30000000,
      currency: 'COP',
      category: 'salary',
      occurredOn: toISO(hoy()),
      categorySource: 'user',
    })

    const resultado = await ejecutar(ANA, 'totalesDelPeriodo', { periodo: 'actual' })

    expect(resultado.gastos).toContain('50.000')
    expect(resultado.ingresos).toContain('300.000')
    expect(resultado.saldo).toContain('250.000')
    expect(resultado.sinDatos).toBe(false)
  })

  it('un período sin datos se declara vacío, no se devuelve como cero', async () => {
    // Un conjunto vacío no es un cero: el asistente debe poder distinguirlos
    // para no decir «gastaste 0» cuando en realidad no hay nada registrado.
    const resultado = await ejecutar(ANA, 'totalesDelPeriodo', { periodo: 'actual' })
    expect(resultado.sinDatos).toBe(true)
  })

  it('el desglose por categoría viene ordenado y con nombres legibles', async () => {
    await gastar(ANA, 1000000, 'transport')
    await gastar(ANA, 8000000, 'groceries')

    const resultado = await ejecutar(ANA, 'gastoPorCategoria', { periodo: 'actual' })
    const categorias = resultado.categorias as unknown as { categoria: string }[]

    expect(categorias[0]?.categoria).toBe('Mercado')
    expect(categorias[1]?.categoria).toBe('Transporte')
  })

  it('los mayores gastos vienen de mayor a menor y respetan el tope', async () => {
    for (const monto of [100000, 900000, 500000, 300000]) {
      await gastar(ANA, monto, 'shopping')
    }

    const resultado = await ejecutar(ANA, 'mayoresGastos', { periodo: 'actual', cuantos: 2 })
    const gastos = resultado.gastos as unknown as { monto: string }[]

    expect(gastos).toHaveLength(2)
    expect(gastos[0]?.monto).toContain('9.000')
  })

  it('la búsqueda por texto encuentra y suma', async () => {
    await gastar(ANA, 2500000, 'eating_out', 'domicilio de comida')
    await gastar(ANA, 1500000, 'eating_out', 'domicilio del almuerzo')
    await gastar(ANA, 9900000, 'housing', 'arriendo')

    const resultado = await ejecutar(ANA, 'buscarMovimientos', { texto: 'domicilio' })

    expect(resultado.cuantos).toBe(2)
    expect(resultado.total).toContain('40.000')
  })

  it('la búsqueda entiende plurales y singulares', async () => {
    // Encontrado probando el asistente de verdad: se preguntó por «domicilios»
    // y no encontró «domicilio de comida», porque comparaba texto literal. La
    // búsqueda usa las mismas raíces que la categorización, así que ambas
    // coinciden en qué consideran la misma cosa.
    await gastar(ANA, 2500000, 'eating_out', 'domicilio de comida')
    await gastar(ANA, 1500000, 'eating_out', 'domicilio del almuerzo')

    const enPlural = await ejecutar(ANA, 'buscarMovimientos', { texto: 'domicilios' })
    const enSingular = await ejecutar(ANA, 'buscarMovimientos', { texto: 'domicilio' })

    expect(enPlural.cuantos).toBe(2)
    expect(enPlural.total).toBe(enSingular.total)
  })

  it('la búsqueda ignora el relleno de la frase', async () => {
    await gastar(ANA, 3000000, 'transport', 'taxi al aeropuerto')

    // «un taxi» debe encontrar «taxi al aeropuerto»: las palabras vacías no
    // cuentan para buscar.
    const resultado = await ejecutar(ANA, 'buscarMovimientos', { texto: 'un taxi' })
    expect(resultado.cuantos).toBe(1)
  })

  it('la búsqueda sin resultados lo dice', async () => {
    const resultado = await ejecutar(ANA, 'buscarMovimientos', { texto: 'inexistente' })
    expect(resultado.sinDatos).toBe(true)
    expect(resultado.cuantos).toBe(0)
  })

  it('sin período anterior, la comparación no inventa un porcentaje', async () => {
    await gastar(ANA, 1000000, 'groceries')

    const resultado = await ejecutar(ANA, 'compararConPeriodoAnterior')
    expect(resultado.sinReferencia).toBe(true)
  })

  it('el ritmo informa hasta qué día del período va', async () => {
    await gastar(ANA, 1000000, 'groceries')

    const resultado = await ejecutar(ANA, 'ritmoDelPeriodo')
    expect(Number(resultado.diaDelPeriodo)).toBeGreaterThan(0)
    expect(resultado.hasta).toBe(toISO(hoy()))
  })

  it('los movimientos anulados no cuentan', async () => {
    const movimiento = await gastar(ANA, 5000000, 'groceries')
    await db
      .update(transactions)
      .set({ status: 'voided' })
      .where(sql`id = ${movimiento.id}`)

    const resultado = await ejecutar(ANA, 'totalesDelPeriodo', { periodo: 'actual' })
    expect(resultado.sinDatos).toBe(true)
  })

  it('los movimientos fuera del período no entran', async () => {
    await createTransaction(ANA, {
      type: 'expense',
      amountCents: 7000000,
      currency: 'COP',
      category: 'groceries',
      occurredOn: toISO(addDays(hoy(), -45)),
      categorySource: 'user',
    })

    const resultado = await ejecutar(ANA, 'totalesDelPeriodo', { periodo: 'actual' })
    expect(resultado.sinDatos).toBe(true)
  })
})

describe('aislamiento del asistente', () => {
  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id in (${ANA}, ${BRUNO})`)
  })

  it('ninguna herramienta devuelve datos de otro usuario', async () => {
    // El modelo elige qué consultar, pero nunca sobre quién: el usuario viene
    // de la sesión del servidor y queda capturado al construir la herramienta.
    await gastar(BRUNO, 9900000, 'debt', 'cuota del préstamo')

    const totales = await ejecutar(ANA, 'totalesDelPeriodo', { periodo: 'actual' })
    expect(totales.sinDatos).toBe(true)

    const desglose = await ejecutar(ANA, 'gastoPorCategoria', { periodo: 'actual' })
    expect(desglose.categorias).toHaveLength(0)

    const busqueda = await ejecutar(ANA, 'buscarMovimientos', { texto: 'préstamo' })
    expect(busqueda.cuantos).toBe(0)

    const mayores = await ejecutar(ANA, 'mayoresGastos', { periodo: 'actual', cuantos: 5 })
    expect(mayores.gastos).toHaveLength(0)
  })

  it('cada usuario ve lo suyo', async () => {
    await gastar(ANA, 1000000, 'groceries')
    await gastar(BRUNO, 5000000, 'groceries')

    const deAna = await ejecutar(ANA, 'totalesDelPeriodo', { periodo: 'actual' })
    const deBruno = await ejecutar(BRUNO, 'totalesDelPeriodo', { periodo: 'actual' })

    expect(deAna.gastos).toContain('10.000')
    expect(deBruno.gastos).toContain('50.000')
  })
})

describe('límites del asistente', () => {
  it('no existe ninguna herramienta que modifique datos', () => {
    // El límite no se confía a las instrucciones: si no hay herramienta de
    // escritura, el asistente no puede escribir aunque se lo pidan (Art. II).
    const nombres = Object.keys(crearHerramientas(contextoDe(ANA)))

    for (const nombre of nombres) {
      expect(nombre).not.toMatch(
        /registrar|crear|guardar|modificar|actualizar|borrar|eliminar|anular/i,
      )
    }
  })

  it('el conjunto de herramientas es corto y cerrado', () => {
    // Cada herramienta añadida es una decisión más que el modelo puede
    // equivocar (plan 003, §2).
    expect(Object.keys(crearHerramientas(contextoDe(ANA)))).toHaveLength(6)
  })
})
