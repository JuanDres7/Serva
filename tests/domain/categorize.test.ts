import { describe, it, expect, vi } from 'vitest'
import {
  categorizar,
  UMBRAL_CONFIANZA,
  type BuscarEnHistorial,
} from '@/lib/ai/categorize'
import {
  proveedorInactivo,
  type ProveedorIA,
  type ResultadoProveedor,
} from '@/lib/ai/provider'
import { validarSugerencia } from '@/lib/ai/schema'

/**
 * La cascada, probada sin ningún modelo instalado.
 *
 * Se inyecta un proveedor controlado que devuelve exactamente lo que cada caso
 * necesita: respuestas válidas, inválidas, lentas o inexistentes. Es lo que
 * permite verificar el comportamiento ante fallos, que es donde de verdad se
 * juega esta feature.
 */

function proveedorQueDevuelve(resultado: ResultadoProveedor): ProveedorIA {
  return {
    nombre: 'prueba',
    disponible: true,
    sugerir: vi.fn(async () => resultado),
  }
}

const proveedorConSugerencia = (categoria: string, confianza = 0.9) =>
  proveedorQueDevuelve({
    estado: 'ok',
    sugerencia: { categoria, confianza, descripcionCorta: 'Cartón de leche' },
    latenciaMs: 120,
  })

const sinHistorial: BuscarEnHistorial = async () => null

describe('nivel 1 — lo que el usuario ya categorizó', () => {
  it('resuelve sin invocar al modelo', async () => {
    const proveedor = proveedorConSugerencia('shopping')
    const historial: BuscarEnHistorial = async () => ({
      categoria: 'groceries',
      confianza: 0.95,
    })

    const resultado = await categorizar({
      texto: 'compré leche en la tienda',
      tipo: 'expense',
      buscarEnHistorial: historial,
      proveedor,
    })

    expect(resultado.categoria).toBe('groceries')
    expect(resultado.mecanismo).toBe('keywords')
    // Lo esencial: el modelo no se llamó. Es lo que hace la sugerencia
    // instantánea y lo que permite sostener varios usuarios a la vez.
    expect(proveedor.sugerir).not.toHaveBeenCalled()
  })

  it('pasa al modelo si la coincidencia no alcanza el umbral', async () => {
    const proveedor = proveedorConSugerencia('groceries')
    const historial: BuscarEnHistorial = async () => ({
      categoria: 'shopping',
      confianza: UMBRAL_CONFIANZA - 0.1,
    })

    const resultado = await categorizar({
      texto: 'algo raro que nunca escribí',
      tipo: 'expense',
      buscarEnHistorial: historial,
      proveedor,
    })

    expect(resultado.mecanismo).toBe('model')
    expect(proveedor.sugerir).toHaveBeenCalled()
  })

  it('un fallo consultando el historial no impide intentar con el modelo', async () => {
    const proveedor = proveedorConSugerencia('groceries')
    const historialRoto: BuscarEnHistorial = async () => {
      throw new Error('la base no responde')
    }

    const resultado = await categorizar({
      texto: 'mercado de la semana',
      tipo: 'expense',
      buscarEnHistorial: historialRoto,
      proveedor,
    })

    expect(resultado.categoria).toBe('groceries')
    expect(resultado.mecanismo).toBe('model')
  })
})

describe('nivel 3 — el modelo', () => {
  it('acepta una sugerencia con confianza suficiente', async () => {
    const resultado = await categorizar({
      texto: 'fui a la tienda y compré un cartón de leche',
      tipo: 'expense',
      buscarEnHistorial: sinHistorial,
      proveedor: proveedorConSugerencia('groceries', 0.88),
    })

    expect(resultado.categoria).toBe('groceries')
    expect(resultado.confianza).toBeCloseTo(0.88)
    expect(resultado.descripcionCorta).toBe('Cartón de leche')
  })

  it('descarta una sugerencia con poca confianza', async () => {
    // Mejor ninguna sugerencia que una equivocada: corregir cuesta más que
    // elegir, porque primero hay que advertir el error.
    const resultado = await categorizar({
      texto: 'eso de ayer',
      tipo: 'expense',
      buscarEnHistorial: sinHistorial,
      proveedor: proveedorConSugerencia('shopping', UMBRAL_CONFIANZA - 0.01),
    })

    expect(resultado.categoria).toBeNull()
    expect(resultado.mecanismo).toBe('none')
  })
})

describe('degradación ante fallos', () => {
  it('sin proveedor configurado, no sugiere pero tampoco falla', async () => {
    const resultado = await categorizar({
      texto: 'almuerzo',
      tipo: 'expense',
      buscarEnHistorial: sinHistorial,
      proveedor: proveedorInactivo,
    })

    expect(resultado.categoria).toBeNull()
    expect(resultado.mecanismo).toBe('none')
    // Aun sin modelo, la etiqueta corta del historial se produce igual.
    expect(resultado.descripcionCorta).toBe('Almuerzo')
  })

  it('si el modelo falla, deja constancia y sigue adelante', async () => {
    const resultado = await categorizar({
      texto: 'almuerzo',
      tipo: 'expense',
      buscarEnHistorial: sinHistorial,
      proveedor: proveedorQueDevuelve({
        estado: 'fallo',
        motivo: 'tiempo de espera agotado',
        latenciaMs: 4000,
      }),
    })

    expect(resultado.categoria).toBeNull()
    expect(resultado.motivoFallo).toContain('tiempo de espera')
  })

  it('un texto vacío no llega al modelo', async () => {
    const proveedor = proveedorConSugerencia('groceries')
    const resultado = await categorizar({
      texto: '   ',
      tipo: 'expense',
      buscarEnHistorial: sinHistorial,
      proveedor,
    })

    expect(resultado.categoria).toBeNull()
    expect(proveedor.sugerir).not.toHaveBeenCalled()
  })

  it('siempre devuelve un resultado utilizable, pase lo que pase', async () => {
    const casos: ResultadoProveedor[] = [
      { estado: 'no-disponible' },
      { estado: 'fallo', motivo: 'red caída', latenciaMs: 10 },
      {
        estado: 'ok',
        sugerencia: { categoria: 'groceries', confianza: 0.1, descripcionCorta: 'x' },
        latenciaMs: 10,
      },
    ]

    for (const caso of casos) {
      const resultado = await categorizar({
        texto: 'mercado',
        tipo: 'expense',
        buscarEnHistorial: sinHistorial,
        proveedor: proveedorQueDevuelve(caso),
      })

      expect(resultado).toHaveProperty('descripcionCorta')
      expect(resultado.palabrasClave).toContain('mercado')
      expect(typeof resultado.latenciaMs).toBe('number')
    }
  })
})

describe('validación de lo que devuelve el modelo', () => {
  it('rechaza una categoría inventada', async () => {
    // Un modelo pequeño inventa categorías con facilidad: «comida»,
    // «restaurante», «Alimentos». El esquema las detiene.
    const resultado = validarSugerencia(
      { categoria: 'comida', confianza: 0.9, descripcionCorta: 'Almuerzo' },
      'expense',
    )
    expect(resultado.ok).toBe(false)
  })

  it('rechaza una categoría de ingreso en un gasto', async () => {
    const resultado = validarSugerencia(
      { categoria: 'salary', confianza: 0.9, descripcionCorta: 'Sueldo' },
      'expense',
    )
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toContain('no corresponde')
  })

  it('rechaza una confianza fuera de rango', async () => {
    expect(
      validarSugerencia(
        { categoria: 'groceries', confianza: 1.5, descripcionCorta: 'x' },
        'expense',
      ).ok,
    ).toBe(false)
  })

  it('rechaza una respuesta incompleta', async () => {
    expect(validarSugerencia({ categoria: 'groceries' }, 'expense').ok).toBe(false)
    expect(validarSugerencia(null, 'expense').ok).toBe(false)
    expect(validarSugerencia('groceries', 'expense').ok).toBe(false)
  })

  it('acepta una respuesta correcta', async () => {
    const resultado = validarSugerencia(
      { categoria: 'groceries', confianza: 0.9, descripcionCorta: 'Cartón de leche' },
      'expense',
    )
    expect(resultado.ok).toBe(true)
  })
})
