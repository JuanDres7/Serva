import { describe, it, expect } from 'vitest'
import {
  decidir,
  explicar,
  MAXIMO_POR_MENSAJE,
  MAXIMO_SIN_CONFIRMAR,
  type TipoDeAccion,
  type Decision,
} from '@/lib/domain/puerta'

/**
 * La tabla de verdad completa de la puerta (spec 010, T-402).
 *
 * Esta es la prueba que convierte el Artículo II en algo comprobable. Si
 * alguna de estas combinaciones dejara de cumplirse, Serva escribiría sin
 * permiso o anularía sin preguntar, y ninguna prueba de navegador lo detectaría
 * de forma fiable.
 *
 * Ni un modelo, ni una base de datos, ni un navegador: corre en cualquier
 * máquina (Art. IV).
 */

const TIPOS: readonly TipoDeAccion[] = ['crear', 'corregir', 'anular']
const CANTIDADES = [0, 1, 2, 3, 4, 5, 6, 9]
const ACTIVACIONES = [false, true]

/** Lo que debería salir, escrito aparte de la implementación a propósito. */
function esperado(
  tipo: TipoDeAccion,
  cuantos: number,
  automatico: boolean,
): Decision {
  if (cuantos < 1) return { accion: 'rechazar', motivo: 'nada-que-hacer' }
  if (tipo !== 'crear') return { accion: 'confirmar', motivo: 'destructivo' }
  if (cuantos > MAXIMO_POR_MENSAJE) return { accion: 'rechazar', motivo: 'excede-el-maximo' }
  if (!automatico) return { accion: 'confirmar', motivo: 'sin-activar' }
  if (cuantos > MAXIMO_SIN_CONFIRMAR)
    return { accion: 'confirmar', motivo: 'demasiados-de-golpe' }
  return { accion: 'ejecutar' }
}

describe('la puerta — tabla de verdad completa', () => {
  const casos = TIPOS.flatMap((tipo) =>
    CANTIDADES.flatMap((cuantos) =>
      ACTIVACIONES.map((automaticoActivo) => ({ tipo, cuantos, automaticoActivo })),
    ),
  )

  it(`cubre las ${TIPOS.length * CANTIDADES.length * ACTIVACIONES.length} combinaciones`, () => {
    expect(casos).toHaveLength(48)
  })

  for (const caso of casos) {
    const nombre = `${caso.tipo} × ${caso.cuantos} × ${caso.automaticoActivo ? 'automático' : 'manual'}`
    it(nombre, () => {
      expect(decidir(caso)).toEqual(
        esperado(caso.tipo, caso.cuantos, caso.automaticoActivo),
      )
    })
  }
})

describe('T-403 — lo destructivo confirma siempre', () => {
  it('anular con el automático puesto sigue pidiendo confirmación', () => {
    expect(decidir({ tipo: 'anular', cuantos: 1, automaticoActivo: true })).toEqual({
      accion: 'confirmar',
      motivo: 'destructivo',
    })
  })

  it('corregir con el automático puesto sigue pidiendo confirmación', () => {
    expect(decidir({ tipo: 'corregir', cuantos: 1, automaticoActivo: true })).toEqual({
      accion: 'confirmar',
      motivo: 'destructivo',
    })
  })

  it('ninguna combinación destructiva llega nunca a ejecutar', () => {
    // La afirmación que de verdad importa: no existe forma de que corregir o
    // anular se resuelvan solos, venga la petición como venga.
    for (const tipo of ['corregir', 'anular'] as const) {
      for (const cuantos of [1, 2, 3, 4, 5, 6, 100]) {
        for (const automaticoActivo of [false, true]) {
          expect(decidir({ tipo, cuantos, automaticoActivo }).accion).not.toBe('ejecutar')
        }
      }
    }
  })
})

describe('T-404 — los dos límites, por separado', () => {
  it(`más de ${MAXIMO_POR_MENSAJE} se rechaza aunque el automático esté puesto`, () => {
    expect(decidir({ tipo: 'crear', cuantos: 6, automaticoActivo: true })).toEqual({
      accion: 'rechazar',
      motivo: 'excede-el-maximo',
    })
  })

  it(`exactamente ${MAXIMO_POR_MENSAJE} no se rechaza`, () => {
    expect(decidir({ tipo: 'crear', cuantos: 5, automaticoActivo: true }).accion).toBe(
      'confirmar',
    )
  })

  it(`más de ${MAXIMO_SIN_CONFIRMAR} confirma, aunque quepa en el máximo`, () => {
    expect(decidir({ tipo: 'crear', cuantos: 4, automaticoActivo: true })).toEqual({
      accion: 'confirmar',
      motivo: 'demasiados-de-golpe',
    })
  })

  it(`exactamente ${MAXIMO_SIN_CONFIRMAR} se ejecuta con el automático puesto`, () => {
    expect(decidir({ tipo: 'crear', cuantos: 3, automaticoActivo: true })).toEqual({
      accion: 'ejecutar',
    })
  })
})

describe('sin activación no se escribe nada (Art. II.1)', () => {
  it('ninguna cantidad válida se ejecuta con el automático apagado', () => {
    for (const cuantos of [1, 2, 3, 4, 5]) {
      expect(decidir({ tipo: 'crear', cuantos, automaticoActivo: false }).accion).toBe(
        'confirmar',
      )
    }
  })
})

describe('peticiones incoherentes', () => {
  it('cero, negativo o fraccionario se rechazan sin plantear nada más', () => {
    for (const cuantos of [0, -1, 1.5, Number.NaN]) {
      expect(decidir({ tipo: 'crear', cuantos, automaticoActivo: true })).toEqual({
        accion: 'rechazar',
        motivo: 'nada-que-hacer',
      })
    }
  })

  it('y tampoco habilitan una anulación', () => {
    expect(decidir({ tipo: 'anular', cuantos: 0, automaticoActivo: true }).accion).toBe(
      'rechazar',
    )
  })
})

describe('lo que se le dice al usuario', () => {
  it('ejecutar no dice nada: la acción ya habla por sí sola', () => {
    expect(explicar({ accion: 'ejecutar' })).toBe('')
  })

  it('cada motivo tiene su frase, y ninguna está vacía', () => {
    const decisiones: Decision[] = [
      { accion: 'confirmar', motivo: 'destructivo' },
      { accion: 'confirmar', motivo: 'sin-activar' },
      { accion: 'confirmar', motivo: 'demasiados-de-golpe' },
      { accion: 'rechazar', motivo: 'nada-que-hacer' },
      { accion: 'rechazar', motivo: 'excede-el-maximo' },
    ]
    for (const decision of decisiones) {
      expect(explicar(decision).length).toBeGreaterThan(0)
    }
  })
})

describe('la puerta no depende de nada', () => {
  it('es pura: la misma petición da siempre la misma decisión', () => {
    const peticion = { tipo: 'crear' as const, cuantos: 2, automaticoActivo: true }
    const primera = decidir(peticion)
    for (let i = 0; i < 50; i++) expect(decidir(peticion)).toEqual(primera)
  })
})
