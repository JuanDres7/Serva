import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions } from '@/lib/db/schema'
import { toISO } from '@/lib/domain/civil-date'
import { previousPeriod, type CycleConfig, type Period } from '@/lib/domain/cycle'
import type { GastoDiario } from '@/lib/domain/series'

/**
 * Consultas de los gráficos (spec 008).
 *
 * Los agregados se resuelven en SQL, no trayendo los movimientos al servidor
 * (D-041.5). Rellenar huecos y acumular sí ocurre en el dominio, donde se prueba
 * sin base de datos.
 */

/** Gasto por día del período. Solo gasto: el ahorro no es gasto (RN-003). */
export async function gastoPorDia(
  userId: string,
  periodo: Period,
): Promise<GastoDiario[]> {
  const filas = await db
    .select({
      dia: sql<string>`${transactions.occurredOn}::text`,
      total: sql<string>`sum(${transactions.amountCents})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'active'),
        eq(transactions.type, 'expense'),
        gte(transactions.occurredOn, toISO(periodo.start)),
        lte(transactions.occurredOn, toISO(periodo.end)),
      ),
    )
    .groupBy(transactions.occurredOn)
    .orderBy(transactions.occurredOn)

  return filas.map((fila) => ({ dia: fila.dia, cents: Number(fila.total ?? 0) }))
}

export type TotalesDePeriodo = {
  readonly periodo: Period
  readonly ingresos: number
  readonly gastos: number
}

/**
 * Totales de los últimos períodos, del más antiguo al más reciente.
 *
 * Responde «¿voy mejor o peor que antes?», que es imposible de contestar mirando
 * un solo período.
 */
export async function evolucion(
  userId: string,
  ciclo: CycleConfig,
  periodoActual: Period,
  cuantos: number,
): Promise<TotalesDePeriodo[]> {
  const periodos: Period[] = [periodoActual]
  for (let i = 1; i < cuantos; i += 1) {
    periodos.unshift(previousPeriod(ciclo, periodos[0]!))
  }

  const inicio = toISO(periodos[0]!.start)
  const fin = toISO(periodoActual.end)

  // Una sola consulta para todos los períodos: el reparto se hace después, en
  // memoria, sobre unas pocas decenas de filas.
  const filas = await db
    .select({
      dia: sql<string>`${transactions.occurredOn}::text`,
      tipo: transactions.type,
      total: sql<string>`sum(${transactions.amountCents})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, 'active'),
        gte(transactions.occurredOn, inicio),
        lte(transactions.occurredOn, fin),
      ),
    )
    .groupBy(transactions.occurredOn, transactions.type)

  return periodos.map((periodo) => {
    const desde = toISO(periodo.start)
    const hasta = toISO(periodo.end)
    let ingresos = 0
    let gastos = 0

    for (const fila of filas) {
      if (fila.dia < desde || fila.dia > hasta) continue
      const total = Number(fila.total ?? 0)
      if (fila.tipo === 'income') ingresos += total
      else if (fila.tipo === 'expense') gastos += total
    }

    return { periodo, ingresos, gastos }
  })
}
