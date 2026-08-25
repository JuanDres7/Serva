/**
 * Totales y desglose de un período.
 *
 * Lógica pura: recibe cifras ya agregadas y aplica las reglas de negocio. No
 * conoce la base de datos, así que se prueba en milisegundos (Art. IV.3).
 *
 * Regla central (RN-002 de la spec 001):
 *
 *   saldo = ingresos − gastos − aportes de ahorro + retiros de ahorro
 *
 * Los movimientos de ahorro descuentan del disponible pero **no son gasto**
 * (D-028): quedan fuera de todo total y agregado de gasto, y se presentan aparte.
 * Contarlos como gasto haría que la aplicación dijera «gastaste mucho este mes»
 * justo cuando el usuario ahorró.
 */

import { type Money, add, subtract, zero, money } from './money'
import { type Category, requireCategory } from './categories'

/** Cifras agregadas de un período, tal como llegan de la consulta. */
export type PeriodAggregates = {
  readonly currency: string
  readonly incomeCents: number
  readonly expenseCents: number
  readonly savingContributionCents: number
  readonly savingWithdrawalCents: number
  /**
   * Dinero de préstamos que entró o salió en el período (spec 011).
   *
   * Se agrega para poder mostrarlo, **no para meterlo en el balance**. Un
   * préstamo recibido no es ingreso y prestar no es gasto: es un traslado entre
   * tu bolsillo y una obligación (RN-002). Lo que sí cuenta es el abono, que
   * entra como gasto normal en «Deudas y créditos».
   */
  readonly debtReceivedCents: number
  readonly debtLentCents: number
  readonly debtCollectedCents: number
}

export type PeriodTotals = {
  readonly income: Money
  readonly expense: Money
  /** Movimiento de préstamos del período. No entra en `balance` (spec 011). */
  readonly prestado?: Money
  readonly recibido?: Money
  readonly cobrado?: Money
  /** Neto ahorrado: aportes menos retiros. Puede ser negativo. */
  readonly savedNet: Money
  /** Saldo del período según RN-002. */
  readonly balance: Money
}

export function computeTotals(aggregates: PeriodAggregates): PeriodTotals {
  const { currency } = aggregates
  const income = money(aggregates.incomeCents, currency)
  const expense = money(aggregates.expenseCents, currency)
  const contributions = money(aggregates.savingContributionCents, currency)
  const withdrawals = money(aggregates.savingWithdrawalCents, currency)

  const savedNet = subtract(contributions, withdrawals)

  // Los préstamos quedan deliberadamente fuera del balance. Si entraran, un mes
  // en que pediste prestado se vería como un mes bueno, que es lo contrario de
  // la verdad (RN-002 de la spec 011).
  const balance = subtract(subtract(income, expense), savedNet)

  const prestado = money(aggregates.debtLentCents, currency)
  const recibido = money(aggregates.debtReceivedCents, currency)
  const cobrado = money(aggregates.debtCollectedCents, currency)

  return { income, expense, savedNet, balance, prestado, recibido, cobrado }
}

export type CategoryAmount = {
  readonly categoryKey: string
  readonly amountCents: number
}

export type BreakdownEntry = {
  readonly category: Category
  readonly amount: Money
  /** Porcentaje sobre el total del desglose, redondeado a un decimal. */
  readonly percentage: number
}

/**
 * Desglose de gasto por categoría, de mayor a menor.
 *
 * El orden no es estético: responde «¿en qué se me fue la plata?» de un vistazo,
 * que es la pregunta que justifica el gráfico (D-034).
 */
export function computeBreakdown(
  amounts: readonly CategoryAmount[],
  currency: string,
): readonly BreakdownEntry[] {
  const total = amounts.reduce((acc, a) => acc + a.amountCents, 0)

  return amounts
    .map((a) => ({
      category: requireCategory(a.categoryKey),
      amount: money(a.amountCents, currency),
      percentage: total === 0 ? 0 : Math.round((a.amountCents / total) * 1000) / 10,
    }))
    .sort((a, b) => b.amount.cents - a.amount.cents)
}

export type Comparison = {
  readonly current: Money
  readonly previous: Money
  readonly difference: Money
  /** Variación porcentual, o `null` si el período anterior fue cero. */
  readonly percentageChange: number | null
}

/**
 * Compara una cifra con la del período anterior.
 *
 * Ninguna cifra destacada se muestra sin comparación: «$890.000» no informa,
 * «$890.000, un 12% más que el período anterior» sí (RN-003 de la spec 008).
 */
export function compareWithPrevious(current: Money, previous: Money): Comparison {
  const difference = subtract(current, previous)
  const percentageChange =
    previous.cents === 0
      ? null
      : Math.round((difference.cents / Math.abs(previous.cents)) * 1000) / 10

  return { current, previous, difference, percentageChange }
}

/** Suma de un desglose, útil para comprobar que los totales cuadran. */
export function sumBreakdown(
  entries: readonly BreakdownEntry[],
  currency: string,
): Money {
  return entries.reduce((acc, e) => add(acc, e.amount), zero(currency))
}
