import { describe, it, expect } from 'vitest'
import { instruccionesDelAsistente } from '@/lib/ai/chat-prompt'
import { movimientoPropuestoSchema, propuestaSchema } from '@/lib/ai/propuesta'
import { MAXIMO_POR_MENSAJE } from '@/lib/domain/puerta'

/**
 * Los límites del asistente que no dependen de la base ni del modelo
 * (spec 010, T-438 y T-439).
 */

describe('T-439 — al modelo no se le manda el historial (Art. VI.2)', () => {
  const prompt = instruccionesDelAsistente('Juan Andrés')

  it('no lleva movimientos, cifras ni identificadores dentro', () => {
    // Lo que va en las instrucciones es cómo comportarse, no qué tiene la
    // persona. Los datos llegan solo cuando una herramienta los consulta, y
    // solo los que esa herramienta devuelve.
    expect(prompt).not.toMatch(/\d{4,}/) // ningún monto ni identificador largo
    expect(prompt).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i) // ningún UUID
  })

  it('lleva el nombre porque se le habla a alguien, y nada más suyo', () => {
    expect(prompt).toContain('Juan Andrés')
    expect(prompt).not.toMatch(/@/) // ningún correo
  })

  it('declara que no inventa montos', () => {
    expect(prompt.toLowerCase()).toContain('no lo inventes')
  })

  it('ya no declara que solo consulta: eso dejó de ser cierto (D-066)', () => {
    expect(prompt).not.toContain('Solo consultas')
  })

  it('sigue declarando que no aconseja inversiones (Art. II.4)', () => {
    expect(prompt.toLowerCase()).toContain('inversion')
  })
})

describe('T-438 — una salida mal formada no escribe nada (Art. III.2)', () => {
  const malas: unknown[] = [
    null,
    'no soy un objeto',
    { movimientos: 'tampoco' },
    { movimientos: [{ tipo: 'gasto', monto: 100 }] }, // tipo inventado
    { movimientos: [{ tipo: 'expense', monto: -1, descripcion: 'x', categoria: null, fecha: null }] },
    { movimientos: [{ tipo: 'expense', monto: 1, descripcion: '', categoria: null, fecha: null }] },
  ]

  it('ninguna forma inesperada pasa el esquema', () => {
    for (const mala of malas) {
      expect(propuestaSchema.safeParse(mala).success).toBe(false)
    }
  })

  it('el fallo es un caso esperado, no una excepción que rompa el chat', () => {
    // `safeParse` y no `parse`: la validación devuelve un resultado, no lanza.
    // Es lo que permite que el turno siga y Serva diga que no entendió.
    expect(() => propuestaSchema.safeParse(null)).not.toThrow()
  })

  it('una lista larguísima no llega siquiera a la puerta', () => {
    const muchos = Array.from({ length: 40 }, () => ({
      tipo: 'expense' as const,
      monto: 1000,
      descripcion: 'algo',
      categoria: null,
      fecha: null,
    }))

    expect(propuestaSchema.safeParse({ movimientos: muchos }).success).toBe(false)
  })

  it(`pero ${MAXIMO_POR_MENSAJE} sí pasan: el límite lo aplica la puerta, no el esquema`, () => {
    const justos = Array.from({ length: MAXIMO_POR_MENSAJE }, () => ({
      tipo: 'expense' as const,
      monto: 1000,
      descripcion: 'algo',
      categoria: null,
      fecha: null,
    }))

    expect(propuestaSchema.safeParse({ movimientos: justos }).success).toBe(true)
  })
})

describe('el esquema no acepta lo que la base rechazaría', () => {
  it('una categoría que no existe se para aquí, no en la base', () => {
    const r = movimientoPropuestoSchema.safeParse({
      tipo: 'expense',
      monto: 100,
      descripcion: 'algo',
      categoria: 'lo_que_sea',
      fecha: null,
    })
    expect(r.success).toBe(false)
  })
})
