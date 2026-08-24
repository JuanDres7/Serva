import { describe, it, expect } from 'vitest'

/**
 * Prueba de humo del andamiaje (T-005).
 *
 * No verifica lógica de Serva: verifica que el oráculo funciona. Si esta prueba
 * pasa, `npm run verify` es capaz de detectar fallos, que es la condición sin la
 * cual no hay ciclo de trabajo (Art. IV.1).
 *
 * Se elimina cuando existan pruebas reales de dominio (T-010 en adelante).
 */
describe('andamiaje de pruebas', () => {
  it('ejecuta pruebas y distingue lo verdadero de lo falso', () => {
    expect(1 + 1).toBe(2)
    expect(1 + 1).not.toBe(3)
  })

  it('reconoce un fallo cuando lo hay', () => {
    expect(() => {
      throw new Error('fallo deliberado')
    }).toThrow('fallo deliberado')
  })
})
