import { describe, it, expect } from 'vitest'
import {
  normalizar,
  quitarTildes,
  singularizar,
  extraerPalabrasClave,
  similitud,
  descripcionCorta,
} from '@/lib/domain/keywords'

describe('normalización', () => {
  it('quita tildes pero conserva la eñe', () => {
    expect(quitarTildes('cartón')).toBe('carton')
    expect(quitarTildes('mañana')).toBe('mañana')
    expect(quitarTildes('ÁÉÍÓÚ')).toBe('AEIOU')
  })

  it('pasa a minúsculas y descarta la puntuación', () => {
    expect(normalizar('¡Almuerzo!')).toBe('almuerzo')
    expect(normalizar('Café  con   leche.')).toBe('cafe con leche')
  })

  it('hace equivalentes escrituras distintas del mismo texto', () => {
    expect(normalizar('Almuerzo')).toBe(normalizar('almuerzo!'))
    expect(normalizar('CAFÉ')).toBe(normalizar('cafe'))
  })
})

describe('singularización', () => {
  it('reduce plurales simples', () => {
    expect(singularizar('tomates')).toBe('tomat')
    expect(singularizar('tacos')).toBe('taco')
    expect(singularizar('leche')).toBe('leche')
  })

  it('no destruye palabras cortas', () => {
    expect(singularizar('mes')).toBe('mes')
    expect(singularizar('gas')).toBe('gas')
  })

  it('es consistente: la misma entrada da siempre lo mismo', () => {
    // No pretende ser gramaticalmente correcta; basta con que se aplique igual
    // al guardar y al buscar.
    expect(singularizar('tomates')).toBe(singularizar('tomates'))
  })
})

describe('extracción de términos con contenido', () => {
  it('conserva lo que informa y descarta el relleno', () => {
    const terminos = extraerPalabrasClave('Fui a la tienda y me compré un cartón de leche')
    expect(terminos).toContain('leche')
    expect(terminos).toContain('tienda')
    expect(terminos).toContain('carton')
    expect(terminos).not.toContain('fui')
    expect(terminos).not.toContain('compre')
    expect(terminos).not.toContain('de')
  })

  it('reconoce lo esencial en dos formas distintas de decir lo mismo', () => {
    // El caso que motiva toda esta pieza: una frase natural nunca se repite
    // igual, pero comparte lo que importa.
    const a = extraerPalabrasClave('Fui a la tienda y compré un cartón de leche')
    const b = extraerPalabrasClave('compré leche en la tienda')
    expect(similitud(a, b)).toBeGreaterThan(0.5)
  })

  it('descarta los verbos de gasto, que aparecen en todo', () => {
    expect(extraerPalabrasClave('pagué el arriendo')).toEqual(['arriendo'])
    expect(extraerPalabrasClave('gasté en gasolina')).toEqual(['gasolina'])
  })

  it('no repite términos', () => {
    expect(extraerPalabrasClave('leche leche leche')).toEqual(['leche'])
  })

  it('una etiqueta corta se conserva tal cual', () => {
    expect(extraerPalabrasClave('almuerzo')).toEqual(['almuerzo'])
  })

  it('un texto sin contenido informativo devuelve lista vacía', () => {
    expect(extraerPalabrasClave('lo compré')).toEqual([])
    expect(extraerPalabrasClave('')).toEqual([])
  })
})

describe('similitud entre descripciones', () => {
  it('reconoce descripciones equivalentes', () => {
    expect(similitud(['leche', 'tienda'], ['leche', 'tienda'])).toBe(1)
  })

  it('una descripción corta contenida en una larga es coincidencia fuerte', () => {
    expect(similitud(['leche'], ['leche', 'tienda', 'carton'])).toBe(1)
  })

  it('descripciones sin nada en común no se parecen', () => {
    expect(similitud(['leche'], ['gasolina'])).toBe(0)
  })

  it('una lista vacía no se parece a nada', () => {
    expect(similitud([], ['leche'])).toBe(0)
  })
})

describe('descripción corta para el historial', () => {
  it('deja intacto lo que ya es corto, capitalizado', () => {
    expect(descripcionCorta('almuerzo')).toBe('Almuerzo')
    expect(descripcionCorta('mercado de la semana')).toBe('Mercado de la semana')
  })

  it('recorta lo largo por palabras completas', () => {
    const corta = descripcionCorta(
      'Fui a la tienda de la esquina y compré un cartón de leche deslactosada',
    )
    const original =
      'Fui a la tienda de la esquina y compré un cartón de leche deslactosada'

    expect(corta.length).toBeLessThanOrEqual(46)
    expect(corta).toMatch(/…$/)

    // No parte palabras: lo mostrado es un prefijo del original que termina
    // justo donde había un espacio.
    const sinPuntos = corta.replace('…', '')
    expect(original.startsWith(sinPuntos)).toBe(true)
    expect(original.charAt(sinPuntos.length)).toBe(' ')
  })

  it('no deja signos de puntuación colgando antes de los puntos suspensivos', () => {
    const corta = descripcionCorta(
      'Compré leche, pan, huevos, arroz y algunas otras cosas más del mercado',
    )
    expect(corta).not.toMatch(/[.,;:]…$/)
  })

  it('un texto vacío produce texto vacío', () => {
    expect(descripcionCorta('   ')).toBe('')
  })
})
