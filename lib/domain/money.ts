/**
 * Representación y aritmética de dinero.
 *
 * Artículo I de la constitución: ningún monto se representa jamás con punto
 * flotante. Todo se guarda y se opera como enteros en la unidad mínima de la
 * moneda, y el formateo ocurre solo al mostrar.
 *
 * `Money` es un objeto y no un número: eso hace que `total + 5` no compile, en
 * lugar de producir un resultado incorrecto en silencio.
 */

export type Money = {
  /** Entero en la unidad mínima de la moneda. Nunca fraccionario. */
  readonly cents: number
  /** Código ISO 4217, en mayúsculas. */
  readonly currency: string
}

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/** Máximo entero que JavaScript representa con exactitud. */
const MAX_SAFE = Number.MAX_SAFE_INTEGER

/**
 * Monedas cuyo exponente ISO 4217 no es 2.
 *
 * No se consulta a `Intl`: sus datos reflejan la convención de presentación de
 * cada país, no el exponente oficial. Para el peso colombiano `Intl` responde
 * cero decimales —porque los centavos no circulan—, pero el COP tiene exponente 2
 * y su unidad mínima sigue siendo el centavo. Confiar en `Intl` haría que
 * "15.000,50" fuese un monto inválido.
 */
const EXPONENT_OVERRIDES: Readonly<Record<string, number>> = {
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, ISK: 0, JPY: 0, KMF: 0, KRW: 0,
  PYG: 0, RWF: 0, UGX: 0, UYI: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3,
}

/** Decimales de una moneda según ISO 4217. Por defecto, 2. */
export function currencyDecimals(currency: string): number {
  return EXPONENT_OVERRIDES[currency] ?? 2
}

export function money(cents: number, currency: string): Money {
  if (!Number.isInteger(cents)) {
    throw new MoneyError(
      `Un monto debe ser un entero en la unidad mínima de la moneda; se recibió ${cents}`,
    )
  }
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyError(
      `Monto fuera del rango representable con exactitud: ${cents}`,
    )
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new MoneyError(`Código de moneda inválido: "${currency}"`)
  }
  return { cents, currency }
}

export function zero(currency: string): Money {
  return money(0, currency)
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new MoneyError(
      `No se pueden operar montos de monedas distintas: ${a.currency} y ${b.currency}`,
    )
  }
}

function guardOverflow(cents: number): number {
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyError(
      'El resultado excede el rango de enteros representables con exactitud',
    )
  }
  return cents
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(guardOverflow(a.cents + b.cents), a.currency)
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return money(guardOverflow(a.cents - b.cents), a.currency)
}

export function negate(a: Money): Money {
  return money(-a.cents, a.currency)
}

/** Suma una lista de montos. Requiere la moneda para poder sumar lista vacía. */
export function sum(amounts: readonly Money[], currency: string): Money {
  return amounts.reduce((acc, m) => add(acc, m), zero(currency))
}

/** Devuelve un número negativo, cero o positivo, como todo comparador. */
export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b)
  return a.cents - b.cents
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.cents === b.cents
}

export function isZero(a: Money): boolean {
  return a.cents === 0
}

export function isPositive(a: Money): boolean {
  return a.cents > 0
}

/**
 * Convierte a `bigint` para escribir en la base de datos, donde la columna es
 * `bigint` y no un tipo decimal de coma flotante.
 */
export function toDatabase(a: Money): bigint {
  return BigInt(a.cents)
}

/**
 * Lee un `bigint` de la base de datos y valida que quepa en el rango exacto de
 * JavaScript antes de convertirlo. Sin esta comprobación, un valor corrupto o
 * desmesurado se convertiría en un número aproximado sin aviso.
 */
export function fromDatabase(cents: bigint | string, currency: string): Money {
  const value = typeof cents === 'string' ? BigInt(cents) : cents
  if (value > BigInt(MAX_SAFE) || value < BigInt(-MAX_SAFE)) {
    throw new MoneyError(
      `Monto almacenado fuera del rango representable con exactitud: ${value}`,
    )
  }
  return money(Number(value), currency)
}
