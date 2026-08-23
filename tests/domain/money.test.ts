import { describe, it, expect } from 'vitest'
import {
  money,
  zero,
  add,
  subtract,
  sum,
  compare,
  equals,
  currencyDecimals,
  toDatabase,
  fromDatabase,
  MoneyError,
  type Money,
} from '@/lib/domain/money'
import {
  parseAmount,
  formatMoney,
  formatWhileTyping,
  separatorsFor,
  currencySymbol,
} from '@/lib/domain/money-format'

const COP = 'COP'
const CO = 'es-CO'

describe('construcción de montos', () => {
  it('rechaza montos fraccionarios', () => {
    expect(() => money(15.5, COP)).toThrow(MoneyError)
  })

  it('rechaza códigos de moneda inválidos', () => {
    expect(() => money(100, 'pesos')).toThrow(MoneyError)
    expect(() => money(100, 'CO')).toThrow(MoneyError)
  })

  it('rechaza montos fuera del rango exacto', () => {
    expect(() => money(Number.MAX_SAFE_INTEGER + 2, COP)).toThrow(MoneyError)
  })
})

describe('aritmética exacta', () => {
  it('suma sin error de redondeo donde la coma flotante falla', () => {
    // 0.1 + 0.2 !== 0.3 en coma flotante. En centavos es exacto.
    const a = money(10, COP)
    const b = money(20, COP)
    expect(add(a, b).cents).toBe(30)
    expect(0.1 + 0.2).not.toBe(0.3) // así falla el enfoque prohibido
  })

  it('mantiene la exactitud sumando muchas veces', () => {
    let total = zero(COP)
    for (let i = 0; i < 1000; i += 1) {
      total = add(total, money(1, COP))
    }
    expect(total.cents).toBe(1000)
  })

  it('suma una lista de montos', () => {
    const amounts: Money[] = [money(1500000, COP), money(41800, COP), money(50, COP)]
    expect(sum(amounts, COP).cents).toBe(1541850)
  })

  it('suma una lista vacía como cero', () => {
    expect(sum([], COP).cents).toBe(0)
  })

  it('resta correctamente', () => {
    expect(subtract(money(1000, COP), money(250, COP)).cents).toBe(750)
  })

  it('impide operar monedas distintas', () => {
    expect(() => add(money(100, COP), money(100, 'USD'))).toThrow(MoneyError)
    expect(() => compare(money(100, COP), money(100, 'USD'))).toThrow(MoneyError)
  })

  it('compara y equipara', () => {
    expect(compare(money(200, COP), money(100, COP))).toBeGreaterThan(0)
    expect(equals(money(100, COP), money(100, COP))).toBe(true)
    expect(equals(money(100, COP), money(100, 'USD'))).toBe(false)
  })
})

describe('ida y vuelta con la base de datos', () => {
  it('convierte a bigint y de vuelta', () => {
    const original = money(1541850, COP)
    expect(toDatabase(original)).toBe(1541850n)
    expect(fromDatabase(1541850n, COP)).toEqual(original)
  })

  it('acepta el bigint devuelto como texto por el controlador', () => {
    expect(fromDatabase('1541850', COP).cents).toBe(1541850)
  })

  it('rechaza un valor almacenado fuera del rango exacto', () => {
    expect(() => fromDatabase(9_007_199_254_740_993n, COP)).toThrow(MoneyError)
  })
})

describe('decimales de la moneda', () => {
  it('usa el exponente ISO, no la convención local', () => {
    // En Colombia los pesos se muestran sin decimales, pero el COP tiene
    // exponente 2 y la unidad mínima es el centavo.
    expect(currencyDecimals(COP)).toBe(2)
    expect(currencyDecimals('USD')).toBe(2)
    expect(currencyDecimals('JPY')).toBe(0)
  })
})

describe('lectura de lo que escribe el usuario', () => {
  it('interpreta el formato colombiano', () => {
    expect(parseAmount('15.000', COP, CO)?.cents).toBe(1500000)
    expect(parseAmount('15.000,50', COP, CO)?.cents).toBe(1500050)
    expect(parseAmount('1.200.000', COP, CO)?.cents).toBe(120000000)
  })

  it('interpreta el formato estadounidense', () => {
    expect(parseAmount('15,000.50', 'USD', 'en-US')?.cents).toBe(1500050)
  })

  it('ignora símbolos y espacios', () => {
    expect(parseAmount('$ 15.000', COP, CO)?.cents).toBe(1500000)
  })

  it('devuelve nulo mientras el campo está vacío', () => {
    expect(parseAmount('', COP, CO)).toBeNull()
    expect(parseAmount('   ', COP, CO)).toBeNull()
  })

  it('rechaza montos negativos: el signo lo da el tipo de movimiento', () => {
    expect(() => parseAmount('-15.000', COP, CO)).toThrow(MoneyError)
  })

  it('rechaza más decimales de los que admite la moneda, sin redondear', () => {
    expect(() => parseAmount('15,555', COP, CO)).toThrow(MoneyError)
  })

  it('no usa coma flotante: conserva la exactitud en cifras grandes', () => {
    const parsed = parseAmount('99.999.999,99', COP, CO)
    expect(parsed?.cents).toBe(9999999999)
  })

  it('conoce los separadores de cada configuración regional', () => {
    expect(separatorsFor(CO)).toEqual({ group: '.', decimal: ',' })
    expect(separatorsFor('en-US')).toEqual({ group: ',', decimal: '.' })
  })
})

describe('presentación de montos', () => {
  it('formatea con los separadores locales', () => {
    const texto = formatMoney(money(1500000, COP), CO)
    expect(texto).toContain('15.000')
  })

  it('muestra los decimales cuando el monto los tiene', () => {
    const texto = formatMoney(money(1500050, COP), CO)
    expect(texto).toContain('15.000,50')
  })

  it('formatea monedas con separadores invertidos', () => {
    const texto = formatMoney(money(1500050, 'USD'), 'en-US')
    expect(texto).toContain('15,000.50')
  })

  it('agrupa los miles mientras el usuario escribe', () => {
    expect(formatWhileTyping('15000', CO)).toBe('15.000')
    expect(formatWhileTyping('1200000', CO)).toBe('1.200.000')
    expect(formatWhileTyping('15000,5', CO)).toBe('15.000,5')
    expect(formatWhileTyping('', CO)).toBe('')
  })
})

describe('currencySymbol', () => {
  it('devuelve el símbolo sin el número', () => {
    expect(currencySymbol(COP, CO)).toBe('$')
    expect(currencySymbol('EUR', 'es-ES')).toBe('€')
  })

  it('cae en el código cuando la moneda no tiene símbolo propio', () => {
    expect(currencySymbol('XTS', CO)).toBe('XTS')
  })
})
