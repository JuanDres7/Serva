import { describe, it, expect } from 'vitest'
import { propuestasEn, conEstados } from '@/lib/ai/rehidratar'

/**
 * Que una conversación guardada se pinte como quedó, no como nació (D-076).
 *
 * El fallo que esto cierra no rompía nada: confirmar dos veces nunca escribió
 * dos veces, porque eso lo impide `reservar` en la base de datos. Lo que hacía
 * era peor de ver que de sufrir —la tarjeta volvía a pedir confirmación y el
 * botón no respondía— y por eso conviene tenerlo sujeto por pruebas: es de los
 * defectos que no se notan salvo usando la aplicación.
 */

const mensaje = (parts: unknown) => ({ role: 'assistant', parts })

const tarjeta = (nombre: string, output: unknown) => ({
  type: `tool-${nombre}`,
  state: 'output-available',
  output,
})

describe('propuestasEn', () => {
  it('recoge los identificadores de todas las tarjetas', () => {
    const mensajes = [
      mensaje([{ type: 'text', text: 'Ya lo anoté.' }]),
      mensaje([tarjeta('proponerMovimientos', { resultado: 'propuesta', propuestaId: 'a' })]),
      mensaje([tarjeta('proponerDeuda', { resultado: 'propuesta', propuestaId: 'b' })]),
    ]

    expect(propuestasEn(mensajes).sort()).toEqual(['a', 'b'])
  })

  it('sin repetidos', () => {
    const mensajes = [
      mensaje([tarjeta('proponerAbono', { propuestaId: 'a' })]),
      mensaje([tarjeta('proponerAbono', { propuestaId: 'a' })]),
    ]

    expect(propuestasEn(mensajes)).toEqual(['a'])
  })

  it('las herramientas de consulta no tienen propuesta, y no estorban', () => {
    const mensajes = [mensaje([tarjeta('gastoPorCategoria', { categorias: [] })])]
    expect(propuestasEn(mensajes)).toEqual([])
  })

  /*
   * Lo que se guarda es JSON de hace días, escrito por una versión anterior del
   * SDK. Nada garantiza su forma, así que leerlo no puede reventar.
   */
  it('nada de lo que venga malformado revienta', () => {
    expect(propuestasEn([mensaje(null)])).toEqual([])
    expect(propuestasEn([mensaje('texto suelto')])).toEqual([])
    expect(propuestasEn([mensaje([null, 42, { type: 'tool-x' }])])).toEqual([])
    expect(propuestasEn([mensaje([tarjeta('x', { propuestaId: 7 })])])).toEqual([])
  })
})

describe('conEstados', () => {
  const estados = new Map([
    ['a', 'aplicada'],
    ['b', 'revertida'],
    ['c', 'caducada'],
  ])

  const salidaDe = (mensajes: { parts: unknown }[], i = 0) => {
    const parts = mensajes[i]!.parts as { output?: Record<string, unknown> }[]
    return parts[0]!.output!
  }

  it('añade el estado sin tocar lo que la herramienta contestó', () => {
    const salida = salidaDe(
      conEstados([mensaje([tarjeta('proponerDeuda', { resultado: 'propuesta', propuestaId: 'a' })])], estados),
    )

    expect(salida.estadoGuardado).toBe('aplicada')
    // `resultado` es el registro de lo que pasó aquel día; no se reescribe.
    expect(salida.resultado).toBe('propuesta')
  })

  it('cada tarjeta lleva el suyo', () => {
    const mensajes = conEstados(
      [
        mensaje([tarjeta('proponerMovimientos', { propuestaId: 'a' })]),
        mensaje([tarjeta('proponerMovimientos', { propuestaId: 'b' })]),
        mensaje([tarjeta('proponerMovimientos', { propuestaId: 'c' })]),
      ],
      estados,
    )

    expect(salidaDe(mensajes, 0).estadoGuardado).toBe('aplicada')
    expect(salidaDe(mensajes, 1).estadoGuardado).toBe('revertida')
    expect(salidaDe(mensajes, 2).estadoGuardado).toBe('caducada')
  })

  it('una propuesta de este mismo turno se deja como está', () => {
    const salida = salidaDe(
      conEstados([mensaje([tarjeta('proponerDeuda', { propuestaId: 'recién-nacida' })])], estados),
    )

    expect(salida.estadoGuardado).toBeUndefined()
  })

  it('los mensajes sin tarjeta salen intactos, sin copiarse', () => {
    const original = [mensaje([{ type: 'text', text: 'Hola' }])]
    expect(conEstados(original, estados)[0]).toBe(original[0])
  })

  it('lo malformado se devuelve tal cual', () => {
    expect(() => conEstados([mensaje(null), mensaje([null])], estados)).not.toThrow()
  })
})
