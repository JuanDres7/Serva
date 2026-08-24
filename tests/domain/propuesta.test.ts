import { describe, it, expect } from 'vitest'
import {
  movimientoPropuestoSchema,
  prepararMovimientos,
  aUnidadMenor,
  type MovimientoPropuesto,
} from '@/lib/ai/propuesta'
import { resolverFecha } from '@/lib/domain/fecha-hablada'
import { civilDate, toISO } from '@/lib/domain/civil-date'

/**
 * La extracción (spec 010, fase 3).
 *
 * Nada de esto necesita un modelo: se le dan propuestas ya formadas y se
 * comprueba en qué se convierten. Lo que aquí se protege es que ninguna forma
 * inesperada acabe escribiendo un dato falso.
 */

const COP = 'COP'
const USD = 'USD'
const HOY = civilDate(2026, 8, 23) // un domingo

const propuesta = (parcial: Partial<MovimientoPropuesto> = {}): MovimientoPropuesto => ({
  tipo: 'expense',
  monto: 18000,
  descripcion: 'cervezas',
  categoria: 'entertainment',
  fecha: 'hoy',
  ...parcial,
})

describe('T-411 — el esquema rechaza lo que no puede escribirse', () => {
  it('una categoría inventada no pasa', () => {
    const r = movimientoPropuestoSchema.safeParse(propuesta({ categoria: 'criptomonedas' }))
    expect(r.success).toBe(false)
  })

  it('un monto cero o negativo no pasa', () => {
    expect(movimientoPropuestoSchema.safeParse(propuesta({ monto: 0 })).success).toBe(false)
    expect(movimientoPropuestoSchema.safeParse(propuesta({ monto: -5 })).success).toBe(false)
  })

  it('un tipo que no es gasto ni ingreso no pasa', () => {
    const r = movimientoPropuestoSchema.safeParse({ ...propuesta(), tipo: 'saving' })
    expect(r.success).toBe(false)
  })

  it('una descripción vacía no pasa', () => {
    expect(movimientoPropuestoSchema.safeParse(propuesta({ descripcion: '   ' })).success).toBe(
      false,
    )
  })

  it('pero sin monto y sin categoría sí pasa: eso se resuelve después', () => {
    const r = movimientoPropuestoSchema.safeParse(
      propuesta({ monto: null, categoria: null, fecha: null }),
    )
    expect(r.success).toBe(true)
  })
})

describe('T-412 — de unidades corrientes a la unidad menor (Art. I)', () => {
  it('dieciocho mil pesos son 1.800.000 centavos', () => {
    expect(aUnidadMenor(18000, COP)).toBe(1800000)
  })

  it('el resultado siempre es entero', () => {
    for (const monto of [1, 999, 18000, 1234567]) {
      const cents = aUnidadMenor(monto, COP)
      expect(Number.isInteger(cents)).toBe(true)
    }
  })

  it('en una moneda con decimales, 18.50 son 1850', () => {
    expect(aUnidadMenor(18.5, USD)).toBe(1850)
  })

  it('rechaza en lugar de redondear lo que no cuadra', () => {
    // 18500.75 en una moneda de dos decimales es válido; el caso malo es una
    // fracción más fina que la unidad menor.
    expect(aUnidadMenor(18.505, USD)).toBeNull()
  })

  it('cero, negativo e infinito se rechazan', () => {
    expect(aUnidadMenor(0, COP)).toBeNull()
    expect(aUnidadMenor(-1, COP)).toBeNull()
    expect(aUnidadMenor(Number.POSITIVE_INFINITY, COP)).toBeNull()
    expect(aUnidadMenor(Number.NaN, COP)).toBeNull()
  })

  it('un monto absurdamente grande se rechaza en vez de perder precisión', () => {
    expect(aUnidadMenor(Number.MAX_SAFE_INTEGER, COP)).toBeNull()
  })
})

describe('T-413 y T-414 — fechas dichas en voz corriente', () => {
  const resolver = (expresion: string | null) => {
    const r = resolverFecha(expresion, HOY)
    return r.ok ? toISO(r.fecha) : null
  }

  it('sin fecha, hoy (FR-004)', () => {
    expect(resolver(null)).toBe('2026-08-23')
    expect(resolver('')).toBe('2026-08-23')
  })

  it('hoy, ayer, anteayer', () => {
    expect(resolver('hoy')).toBe('2026-08-23')
    expect(resolver('ayer')).toBe('2026-08-22')
    expect(resolver('anoche')).toBe('2026-08-22')
    expect(resolver('anteayer')).toBe('2026-08-21')
  })

  it('acentos y mayúsculas dan igual', () => {
    expect(resolver('Anteayer')).toBe('2026-08-21')
    expect(resolver('ANOCHE')).toBe('2026-08-22')
  })

  it('T-414 — «el martes» es el próximo martes, no el pasado', () => {
    // El 23 de agosto de 2026 es domingo; el martes siguiente es el 25.
    expect(resolver('el martes')).toBe('2026-08-25')
  })

  it('dicho el mismo día, apunta a la semana siguiente', () => {
    // Nadie dice «el domingo» un domingo para referirse a hoy.
    expect(resolver('el domingo')).toBe('2026-08-30')
  })

  it('«el martes pasado» sí retrocede', () => {
    expect(resolver('el martes pasado')).toBe('2026-08-18')
  })

  it('fechas escritas, con mes en palabras', () => {
    expect(resolver('7 de septiembre')).toBe('2026-09-07')
    expect(resolver('el 7 de septiembre de 2026')).toBe('2026-09-07')
  })

  it('una fecha ya muy pasada se entiende del año que viene', () => {
    // En agosto, «5 de enero» es el enero que viene, no el que ya pasó.
    expect(resolver('5 de enero')).toBe('2027-01-05')
  })

  it('formato ISO tal cual', () => {
    expect(resolver('2026-09-07')).toBe('2026-09-07')
  })

  it('lo que no se entiende se dice, no se adivina', () => {
    expect(resolver('cuando cobre')).toBeNull()
    expect(resolver('el mes que viene tal vez')).toBeNull()
  })
})

describe('T-415 — sin monto no hay propuesta (FR-003)', () => {
  it('«me tomé unas cervezas» no produce ninguna fila ni ningún cero', () => {
    const { listos, incompletos } = prepararMovimientos(
      [propuesta({ monto: null, descripcion: 'unas cervezas' })],
      { currency: COP, hoy: HOY },
    )

    expect(listos).toHaveLength(0)
    expect(incompletos).toEqual([{ descripcion: 'unas cervezas', falta: 'monto' }])
  })

  it('una fecha que no se entiende tampoco escribe', () => {
    const { listos, incompletos } = prepararMovimientos(
      [propuesta({ fecha: 'cuando me paguen' })],
      { currency: COP, hoy: HOY },
    )

    expect(listos).toHaveLength(0)
    expect(incompletos[0]?.falta).toBe('fecha')
  })
})

describe('FR-018 — cada movimiento se evalúa por separado (E11)', () => {
  it('lo completo se registra y por lo que falta se pregunta', () => {
    const { listos, incompletos } = prepararMovimientos(
      [
        propuesta({ monto: 20000, descripcion: 'almuerzo', categoria: 'eating_out' }),
        propuesta({ monto: 5000, descripcion: 'bus', categoria: 'transport' }),
        propuesta({ monto: null, descripcion: 'unas cervezas' }),
      ],
      { currency: COP, hoy: HOY },
    )

    expect(listos.map((m) => m.descripcion)).toEqual(['almuerzo', 'bus'])
    expect(incompletos.map((m) => m.descripcion)).toEqual(['unas cervezas'])
  })
})

describe('E1 — la frase de la fiesta', () => {
  it('produce dos movimientos, cada uno en su categoría', () => {
    const { listos } = prepararMovimientos(
      [
        propuesta({ monto: 18000, descripcion: 'tres cervezas', categoria: 'entertainment' }),
        propuesta({ monto: 50000, descripcion: 'carro hasta la casa', categoria: 'transport' }),
      ],
      { currency: COP, hoy: HOY },
    )

    expect(listos).toHaveLength(2)
    expect(listos[0]).toMatchObject({
      amountCents: 1800000,
      categoria: 'entertainment',
      occurredOn: '2026-08-23',
      esFuturo: false,
    })
    expect(listos[1]).toMatchObject({ amountCents: 5000000, categoria: 'transport' })
  })
})

describe('FR-005 — sin categoría fiable, «Otros» y marcado', () => {
  it('una categoría nula va a Otros y se dice que no es segura', () => {
    const { listos } = prepararMovimientos([propuesta({ categoria: null })], {
      currency: COP,
      hoy: HOY,
    })

    expect(listos[0]?.categoria).toBe('other_expense')
    expect(listos[0]?.categoriaSegura).toBe(false)
  })

  it('una categoría de gasto en un ingreso no se acepta: cae a Otros ingresos', () => {
    const { listos } = prepararMovimientos(
      [propuesta({ tipo: 'income', categoria: 'groceries' })],
      { currency: COP, hoy: HOY },
    )

    expect(listos[0]?.categoria).toBe('other_income')
    expect(listos[0]?.categoriaSegura).toBe(false)
  })
})

describe('E5 — lo que cae en el futuro se marca como tal', () => {
  it('«el 7 de septiembre» queda señalado como futuro, no como movimiento', () => {
    const { listos } = prepararMovimientos(
      [propuesta({ monto: 200000, descripcion: 'pago del préstamo', fecha: '7 de septiembre' })],
      { currency: COP, hoy: HOY },
    )

    expect(listos[0]?.esFuturo).toBe(true)
    expect(listos[0]?.occurredOn).toBe('2026-09-07')
  })

  it('lo de hoy no es futuro', () => {
    const { listos } = prepararMovimientos([propuesta({ fecha: 'hoy' })], {
      currency: COP,
      hoy: HOY,
    })
    expect(listos[0]?.esFuturo).toBe(false)
  })
})
