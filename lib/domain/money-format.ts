/**
 * Entrada y presentación de montos.
 *
 * Aquí vive la frontera entre lo que escribe el usuario —texto, con los
 * separadores de su país— y la representación interna en enteros. Nunca se usa
 * `parseFloat`: convertir "15.000,50" con aritmética de coma flotante es
 * exactamente el error que el Artículo I prohíbe.
 */

import { type Money, money, currencyDecimals, MoneyError } from './money'

/** Espacios que los formateadores insertan y que hay que limpiar de la entrada. */
const SPACES = /[\s   ]/g

export type Separators = {
  readonly group: string
  readonly decimal: string
}

/** Separadores de miles y decimales de una configuración regional. */
export function separatorsFor(locale: string): Separators {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
  return {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  }
}

/**
 * Convierte lo que escribió el usuario en un monto exacto.
 *
 * Devuelve `null` cuando el texto está vacío o incompleto —el usuario todavía
 * está escribiendo— y lanza cuando es inequívocamente inválido.
 */
export function parseAmount(
  input: string,
  currency: string,
  locale: string,
): Money | null {
  const { group, decimal } = separatorsFor(locale)

  let text = input.replace(SPACES, '')
  // Símbolos de moneda y letras sobrantes que la gente escribe o pega.
  text = text.replace(/[^\d\-+.,'’]/g, '')

  if (text === '') return null

  if (text.startsWith('-')) {
    throw new MoneyError(
      'El monto no puede ser negativo: el signo lo determina el tipo de movimiento',
    )
  }
  text = text.replace(/^\+/, '')

  // Los separadores de miles se descartan; solo el decimal es significativo.
  const groupPattern = new RegExp(escapeRegExp(group), 'g')
  text = text.replace(groupPattern, '')
  // Apóstrofo como separador de miles (Suiza) y punto cuando no es el decimal.
  text = text.replace(/['’]/g, '')
  if (decimal !== '.') text = text.replace(/\./g, '')
  if (decimal !== ',') text = text.replace(/,/g, '')

  const [whole = '', fraction = ''] = text.split(decimal)

  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fraction)) {
    throw new MoneyError(`No se pudo interpretar el monto: "${input}"`)
  }
  if (whole === '' && fraction === '') return null

  const decimals = currencyDecimals(currency)

  if (fraction.length > decimals) {
    throw new MoneyError(
      `${currency} admite ${decimals} decimales y se recibieron ${fraction.length}`,
    )
  }

  const padded = fraction.padEnd(decimals, '0')
  const cents = Number((whole || '0') + padded)

  if (!Number.isSafeInteger(cents)) {
    throw new MoneyError(`Monto demasiado grande: "${input}"`)
  }

  return money(cents, currency)
}

/** Formatea un monto para mostrarlo, con el símbolo y los separadores locales. */
export function formatMoney(amount: Money, locale: string): string {
  const decimals = currencyDecimals(amount.currency)
  const factor = 10 ** decimals
  const value = amount.cents / factor

  const localDefault = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: amount.currency,
  }).resolvedOptions().maximumFractionDigits

  // Algunas monedas se muestran sin decimales por convención local —el peso
  // colombiano, entre otras—. Si el monto tiene fracción distinta de cero, se
  // fuerzan los decimales: ocultarlos mostraría una cifra que no es la real.
  const hasFraction = amount.cents % factor !== 0
  const fractionDigits = hasFraction ? decimals : localDefault

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: amount.currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

/**
 * Formatea mientras el usuario escribe: agrupa los miles sin alterar lo que ya
 * tecleó ni añadir decimales que no puso (FR-009).
 */
export function formatWhileTyping(input: string, locale: string): string {
  const { group, decimal } = separatorsFor(locale)
  const text = input.replace(SPACES, '').replace(new RegExp(escapeRegExp(group), 'g'), '')

  const [whole = '', ...rest] = text.split(decimal)
  if (!/^\d*$/.test(whole)) return input

  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group)
  return rest.length > 0 ? grouped + decimal + rest.join('') : grouped
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
