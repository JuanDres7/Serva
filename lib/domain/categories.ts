/**
 * Catálogo fijo de categorías.
 *
 * El usuario no puede crear, renombrar ni eliminar categorías (D-021). Con un
 * conjunto cerrado, la IA categoriza contra un blanco estable, se puede medir
 * objetivamente cuánto acierta y las correcciones del usuario se acumulan sobre
 * categorías que no cambian.
 *
 * Contrapartida asumida: no hay válvula de escape. Si más del 10% de los
 * movimientos acaban en «Otros», esta lista está incompleta y hay que ampliarla
 * (spec 002, métricas de éxito).
 *
 * El color es parte de la identidad de la categoría y debe ser el mismo en los
 * gráficos, el historial y el chat (FR-029).
 *
 * Los tonos son desaturados a propósito: una paleta saturada convierte una lista
 * de gastos en un semáforo, y en una aplicación de dinero eso se lee como
 * juicio. Aquí el color distingue, no alarma.
 */

export type MovementKind = 'expense' | 'income'

export type Category = {
  readonly key: string
  readonly name: string
  readonly kind: MovementKind
  readonly color: string
  readonly order: number
}

export const CATEGORIES: readonly Category[] = [
  // Gasto
  { key: 'groceries', name: 'Mercado', kind: 'expense', color: '#6f9c6b', order: 1 },
  { key: 'eating_out', name: 'Comidas fuera', kind: 'expense', color: '#d98b62', order: 2 },
  { key: 'transport', name: 'Transporte', kind: 'expense', color: '#6d92c4', order: 3 },
  { key: 'housing', name: 'Vivienda', kind: 'expense', color: '#8b86c8', order: 4 },
  { key: 'utilities', name: 'Servicios', kind: 'expense', color: '#5fa3ad', order: 5 },
  { key: 'health', name: 'Salud', kind: 'expense', color: '#cf7f86', order: 6 },
  { key: 'education', name: 'Educación', kind: 'expense', color: '#9b7fc0', order: 7 },
  { key: 'entertainment', name: 'Entretenimiento', kind: 'expense', color: '#d081a8', order: 8 },
  { key: 'subscriptions', name: 'Suscripciones', kind: 'expense', color: '#a985c9', order: 9 },
  { key: 'shopping', name: 'Compras', kind: 'expense', color: '#c9a05c', order: 10 },
  { key: 'pets', name: 'Mascotas', kind: 'expense', color: '#8fa85e', order: 11 },
  { key: 'debt', name: 'Deudas y créditos', kind: 'expense', color: '#b8706b', order: 12 },
  { key: 'other_expense', name: 'Otros', kind: 'expense', color: '#96968c', order: 13 },

  // Ingreso
  { key: 'salary', name: 'Salario', kind: 'income', color: '#5f9e7d', order: 14 },
  { key: 'business', name: 'Ventas o negocio', kind: 'income', color: '#5c9c99', order: 15 },
  { key: 'gifts', name: 'Regalos y ayudas', kind: 'income', color: '#cd7f9b', order: 16 },
  { key: 'refunds', name: 'Reembolsos', kind: 'income', color: '#6b96b8', order: 17 },
  { key: 'other_income', name: 'Otros ingresos', kind: 'income', color: '#96968c', order: 18 },
]

const BY_KEY = new Map(CATEGORIES.map((c) => [c.key, c]))

export class CategoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CategoryError'
  }
}

/** Categorías disponibles para un tipo de movimiento. */
export function categoriesFor(kind: MovementKind): readonly Category[] {
  return CATEGORIES.filter((c) => c.kind === kind)
}

export function findCategory(key: string): Category | undefined {
  return BY_KEY.get(key)
}

export function requireCategory(key: string): Category {
  const category = BY_KEY.get(key)
  if (!category) {
    throw new CategoryError(`Categoría desconocida: "${key}"`)
  }
  return category
}

/** Comprueba que la categoría corresponde al tipo de movimiento. */
export function isValidFor(key: string, kind: MovementKind): boolean {
  return BY_KEY.get(key)?.kind === kind
}

/** Categoría de destino cuando no se logra determinar otra. */
export function fallbackFor(kind: MovementKind): Category {
  return requireCategory(kind === 'expense' ? 'other_expense' : 'other_income')
}
