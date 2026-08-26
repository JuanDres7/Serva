import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { budgets, type BudgetRow } from '@/lib/db/schema'
import { categoryBreakdown } from '@/lib/db/queries/transactions'
import { isValidFor, CATEGORIES } from '@/lib/domain/categories'
import { previousPeriod, type CycleConfig, type Period } from '@/lib/domain/cycle'
import { promedioPorPeriodo, sugerirTope } from '@/lib/domain/budgets'

/**
 * Presupuestos (spec 005).
 *
 * Como el resto del proyecto, ninguna función existe sin recibir el usuario.
 */

export const presupuestoSchema = z
  .object({
    category: z.string(),
    limitCents: z.number().int().positive(),
  })
  .superRefine((valor, ctx) => {
    // RN-001: un presupuesto es un tope de gasto. No aplica a ingresos.
    if (!isValidFor(valor.category, 'expense')) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: 'Solo se puede poner tope a categorías de gasto',
      })
    }
  })

export type EntradaPresupuesto = z.infer<typeof presupuestoSchema>

export async function guardarPresupuesto(
  userId: string,
  entrada: EntradaPresupuesto,
  contexto: { currency: string },
): Promise<BudgetRow> {
  const datos = presupuestoSchema.parse(entrada)

  const [fila] = await db
    .insert(budgets)
    .values({
      userId,
      category: datos.category as BudgetRow['category'],
      limitCents: datos.limitCents,
      currency: contexto.currency,
    })
    // Un solo presupuesto por categoría: volver a definirlo lo actualiza.
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.category],
      set: { limitCents: datos.limitCents, updatedAt: new Date() },
    })
    .returning()

  return fila!
}

export async function listarPresupuestos(userId: string): Promise<BudgetRow[]> {
  return db.select().from(budgets).where(eq(budgets.userId, userId))
}

export async function eliminarPresupuesto(userId: string, id: string): Promise<boolean> {
  const [fila] = await db
    .delete(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
    .returning({ id: budgets.id })

  return Boolean(fila)
}

export type PresupuestoConGasto = {
  readonly id: string
  readonly category: string
  readonly limitCents: number
  readonly gastadoCents: number
}

/** Presupuestos con lo gastado en el período. */
export async function presupuestosConGasto(
  userId: string,
  periodo: Period,
): Promise<PresupuestoConGasto[]> {
  const [definidos, gasto] = await Promise.all([
    listarPresupuestos(userId),
    categoryBreakdown(userId, periodo),
  ])

  const porCategoria = new Map(gasto.map((g) => [g.categoryKey, g.amountCents]))

  return definidos.map((presupuesto) => ({
    id: presupuesto.id,
    category: presupuesto.category,
    limitCents: presupuesto.limitCents,
    gastadoCents: porCategoria.get(presupuesto.category) ?? 0,
  }))
}

export type SugerenciaCategoria = {
  readonly category: string
  readonly promedioCents: number
  readonly sugeridoCents: number | null
}

/**
 * Promedio y tope sugerido por categoría, a partir del historial (FR-002).
 *
 * Sin esto el usuario tendría que inventarse un número, que es exactamente por
 * lo que los presupuestos se abandonan en la segunda semana.
 */
export async function sugerenciasDeTope(
  userId: string,
  ciclo: CycleConfig,
  periodoActual: Period,
  periodosAtras = 3,
): Promise<SugerenciaCategoria[]> {
  const periodos: Period[] = []
  let periodo = periodoActual
  for (let i = 0; i < periodosAtras; i += 1) {
    periodo = previousPeriod(ciclo, periodo)
    periodos.push(periodo)
  }

  const desgloses = await Promise.all(
    periodos.map((p) => categoryBreakdown(userId, p)),
  )

  const porCategoria = new Map<string, number[]>()
  for (const desglose of desgloses) {
    for (const entrada of desglose) {
      const previos = porCategoria.get(entrada.categoryKey) ?? []
      previos.push(entrada.amountCents)
      porCategoria.set(entrada.categoryKey, previos)
    }
  }

  return [...porCategoria.entries()]
    .map(([category, gastos]) => {
      const promedioCents = promedioPorPeriodo(gastos)
      return { category, promedioCents, sugeridoCents: sugerirTope(promedioCents) }
    })
    .sort((a, b) => b.promedioCents - a.promedioCents)
}

/** Cuántos presupuestos están al 80% o por encima, para el aviso del saludo. */
export async function contarEnAviso(
  userId: string,
  periodo: Period,
): Promise<number> {
  const conGasto = await presupuestosConGasto(userId, periodo)
  return conGasto.filter((p) => p.gastadoCents >= p.limitCents * 0.8).length
}

export async function contarPresupuestos(userId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(budgets)
    .where(eq(budgets.userId, userId))

  return fila?.total ?? 0
}

export type ResultadoBusquedaPresupuesto =
  | { readonly resultado: 'exacta'; readonly presupuesto: BudgetRow }
  | { readonly resultado: 'ninguna'; readonly presupuestos: readonly BudgetRow[] }

/**
 * Busca un presupuesto por categoría, resolviendo el texto a una clave (spec 012, §4).
 *
 * El modelo envía un texto como "comida" o "mercado", y el sistema lo resuelve
 * a una clave de categoría usando el catálogo fijo.
 */
export async function buscarPresupuestoPorCategoria(
  userId: string,
  texto: string,
): Promise<ResultadoBusquedaPresupuesto> {
  const clave = resolverCategoria(texto)
  if (!clave) {
    const presupuestos = await listarPresupuestos(userId)
    return { resultado: 'ninguna', presupuestos }
  }

  const presupuestos = await listarPresupuestos(userId)
  const encontrado = presupuestos.find((p) => p.category === clave)

  if (encontrado) {
    return { resultado: 'exacta', presupuesto: encontrado }
  }
  return { resultado: 'ninguna', presupuestos }
}

export function resolverCategoria(texto: string): string | null {
  const buscado = texto.toLowerCase().trim()

  // Primero intenta coincidencia exacta con clave
  const porClave = CATEGORIES.find((c) => c.key === buscado)
  if (porClave) return porClave.key

  // Luego busca por nombre (parcial, bidireccional)
  const porNombre = CATEGORIES.find((c) => {
    const nombre = c.name.toLowerCase()
    return nombre.includes(buscado) || buscado.includes(nombre)
  })
  return porNombre?.key ?? null
}
