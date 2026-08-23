import { describe, it, expect } from 'vitest'
import {
  CATEGORIES,
  categoriesFor,
  findCategory,
  requireCategory,
  isValidFor,
  fallbackFor,
  CategoryError,
} from '@/lib/domain/categories'

describe('catálogo de categorías', () => {
  it('contiene las categorías definidas en la spec', () => {
    expect(categoriesFor('expense')).toHaveLength(13)
    expect(categoriesFor('income')).toHaveLength(5)
  })

  it('separa gasto de ingreso: ninguna sirve para ambos', () => {
    for (const categoria of categoriesFor('expense')) {
      expect(isValidFor(categoria.key, 'income')).toBe(false)
    }
    for (const categoria of categoriesFor('income')) {
      expect(isValidFor(categoria.key, 'expense')).toBe(false)
    }
  })

  it('separa mercado de comidas fuera', () => {
    // Es la distinción más útil del catálogo: mercado es gasto necesario y comer
    // fuera es donde está el ahorro accionable. Juntas, el análisis no sirve.
    expect(findCategory('groceries')?.name).toBe('Mercado')
    expect(findCategory('eating_out')?.name).toBe('Comidas fuera')
  })

  it('no tiene claves repetidas', () => {
    const claves = CATEGORIES.map((c) => c.key)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('no tiene nombres repetidos dentro del mismo tipo', () => {
    for (const kind of ['expense', 'income'] as const) {
      const nombres = categoriesFor(kind).map((c) => c.name)
      expect(new Set(nombres).size).toBe(nombres.length)
    }
  })

  it('asigna a cada categoría un color válido', () => {
    for (const categoria of CATEGORIES) {
      expect(categoria.color).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('distingue por color las categorías del mismo tipo', () => {
    // Dos categorías de gasto con el mismo color serían indistinguibles en los
    // gráficos, que es donde el color hace todo el trabajo.
    const colores = categoriesFor('expense')
      .filter((c) => c.key !== 'other_expense')
      .map((c) => c.color)
    expect(new Set(colores).size).toBe(colores.length)
  })

  it('mantiene un orden estable y sin repeticiones', () => {
    const ordenes = CATEGORIES.map((c) => c.order)
    expect(new Set(ordenes).size).toBe(ordenes.length)
    expect([...ordenes].sort((a, b) => a - b)).toEqual(ordenes)
  })

  it('falla ruidosamente ante una categoría inexistente', () => {
    expect(findCategory('inventada')).toBeUndefined()
    expect(() => requireCategory('inventada')).toThrow(CategoryError)
  })

  it('ofrece una categoría de destino por tipo', () => {
    expect(fallbackFor('expense').key).toBe('other_expense')
    expect(fallbackFor('income').key).toBe('other_income')
  })
})
