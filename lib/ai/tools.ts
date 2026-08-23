import { z } from 'zod'
import { tool } from 'ai'
import {
  periodAggregates,
  categoryBreakdown,
  listTransactions,
} from '@/lib/db/queries/transactions'
import { gastoPorDia } from '@/lib/db/queries/charts'
import { periodFor, previousPeriod, type CycleConfig } from '@/lib/domain/cycle'
import { todayIn, toISO, type CivilDate } from '@/lib/domain/civil-date'
import { computeTotals, computeBreakdown, compareWithPrevious } from '@/lib/domain/balance'
import { compararRitmo, ritmoRelativo } from '@/lib/domain/series'
import { formatMoney } from '@/lib/domain/money-format'
import { findCategory, CATEGORIES } from '@/lib/domain/categories'
import { extraerPalabrasClave } from '@/lib/domain/keywords'
import { nombrarPeriodo } from '@/components/etiqueta-periodo'

/**
 * Las consultas que el asistente puede hacer (spec 003, plan §2).
 *
 * **El modelo decide qué preguntar; los números los produce el sistema.** Un
 * modelo de lenguaje no calcula: predice texto. Si se le pidiera sumar gastos
 * devolvería cifras verosímiles y equivocadas, con total aplomo.
 *
 * Por eso este conjunto es cerrado y sus parámetros están validados: el modelo
 * elige cuál llamar y con qué argumentos, pero jamás toca la base directamente
 * (Art. III.3). Y el usuario viene de la sesión del servidor, nunca del modelo.
 */

export type ContextoHerramientas = {
  readonly userId: string
  readonly cycleConfig: CycleConfig
  readonly currency: string
  readonly locale: string
  readonly timeZone: string
}

const periodoSchema = z
  .enum(['actual', 'anterior'])
  .describe('Período sobre el que consultar')

const clavesCategoria = CATEGORIES.map((c) => c.key) as [string, ...string[]]

function resolverPeriodo(contexto: ContextoHerramientas, cual: 'actual' | 'anterior') {
  const hoy: CivilDate = todayIn(contexto.timeZone)
  const actual = periodFor(contexto.cycleConfig, hoy)
  return cual === 'actual' ? actual : previousPeriod(contexto.cycleConfig, actual)
}

/**
 * Construye las herramientas ligadas a un usuario concreto.
 *
 * Se crean por petición y capturan el `userId` en el cierre: así no hay ninguna
 * forma de que el modelo indique sobre qué cuenta consultar.
 */
export function crearHerramientas(contexto: ContextoHerramientas) {
  const dinero = (cents: number) =>
    formatMoney({ cents, currency: contexto.currency }, contexto.locale)

  return {
    totalesDelPeriodo: tool({
      description:
        'Ingresos, gastos y saldo de un período. Úsala para «¿cuánto llevo gastado?» o «¿cuánto me entró?».',
      inputSchema: z.object({ periodo: periodoSchema }),
      execute: async ({ periodo }) => {
        const rango = resolverPeriodo(contexto, periodo)
        const totales = computeTotals(
          await periodAggregates(contexto.userId, rango, contexto.currency),
        )

        return {
          periodo: nombrarPeriodo(rango, contexto.locale),
          ingresos: dinero(totales.income.cents),
          gastos: dinero(totales.expense.cents),
          saldo: dinero(totales.balance.cents),
          ahorrado: dinero(totales.savedNet.cents),
          sinDatos: totales.income.cents === 0 && totales.expense.cents === 0,
        }
      },
    }),

    gastoPorCategoria: tool({
      description:
        'Gasto agrupado por categoría, de mayor a menor. Úsala para «¿en qué se me fue la plata?».',
      inputSchema: z.object({ periodo: periodoSchema }),
      execute: async ({ periodo }) => {
        const rango = resolverPeriodo(contexto, periodo)
        const desglose = computeBreakdown(
          await categoryBreakdown(contexto.userId, rango),
          contexto.currency,
        )

        return {
          periodo: nombrarPeriodo(rango, contexto.locale),
          sinDatos: desglose.length === 0,
          categorias: desglose.map((entrada) => ({
            categoria: entrada.category.name,
            monto: dinero(entrada.amount.cents),
            porcentaje: entrada.percentage,
          })),
        }
      },
    }),

    compararConPeriodoAnterior: tool({
      description:
        'Compara el gasto del período actual con el anterior. Úsala para «¿gasté más que el mes pasado?».',
      inputSchema: z.object({}),
      execute: async () => {
        const actual = resolverPeriodo(contexto, 'actual')
        const anterior = resolverPeriodo(contexto, 'anterior')

        const [aActual, aAnterior] = await Promise.all([
          periodAggregates(contexto.userId, actual, contexto.currency),
          periodAggregates(contexto.userId, anterior, contexto.currency),
        ])

        const totalesActual = computeTotals(aActual)
        const totalesAnterior = computeTotals(aAnterior)
        const comparacion = compareWithPrevious(
          totalesActual.expense,
          totalesAnterior.expense,
        )

        return {
          gastoActual: dinero(totalesActual.expense.cents),
          gastoAnterior: dinero(totalesAnterior.expense.cents),
          diferencia: dinero(Math.abs(comparacion.difference.cents)),
          direccion: comparacion.difference.cents > 0 ? 'más' : 'menos',
          porcentaje: comparacion.percentageChange,
          // Sin período anterior no hay comparación posible: decirlo es mejor
          // que devolver un porcentaje inventado.
          sinReferencia: totalesAnterior.expense.cents === 0,
        }
      },
    }),

    mayoresGastos: tool({
      description:
        'Los gastos más grandes de un período. Úsala para «¿cuáles fueron mis gastos más altos?».',
      inputSchema: z.object({
        periodo: periodoSchema,
        cuantos: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ periodo, cuantos }) => {
        const rango = resolverPeriodo(contexto, periodo)
        const movimientos = await listTransactions(contexto.userId, {
          period: rango,
          type: 'expense',
          limit: 200,
        })

        const mayores = [...movimientos]
          .sort((a, b) => b.amountCents - a.amountCents)
          .slice(0, cuantos)

        return {
          periodo: nombrarPeriodo(rango, contexto.locale),
          sinDatos: mayores.length === 0,
          gastos: mayores.map((m) => ({
            descripcion: m.descriptionShort ?? m.description ?? 'Sin descripción',
            categoria: m.category ? (findCategory(m.category)?.name ?? '') : '',
            monto: dinero(m.amountCents),
            fecha: m.occurredOn,
          })),
        }
      },
    }),

    buscarMovimientos: tool({
      description:
        'Busca movimientos por texto o por categoría y devuelve su total. Úsala para «¿cuánto he gastado en domicilios?».',
      inputSchema: z.object({
        texto: z.string().max(60).optional().describe('Palabra a buscar en la descripción'),
        categoria: z.enum(clavesCategoria).optional(),
        periodo: periodoSchema.optional(),
      }),
      execute: async ({ texto, categoria, periodo }) => {
        const rango = periodo ? resolverPeriodo(contexto, periodo) : undefined
        const movimientos = await listTransactions(contexto.userId, {
          period: rango,
          category: categoria,
          limit: 500,
        })

        // Se busca por raíces y no por texto literal: quien pregunta por
        // «domicilios» espera encontrar «domicilio de comida». Es la misma
        // reducción que usa la categorización, así que ambas coinciden en qué
        // consideran la misma cosa.
        const buscadas = texto ? extraerPalabrasClave(texto) : []
        const coinciden =
          buscadas.length > 0
            ? movimientos.filter((m) => {
                const propias = extraerPalabrasClave(
                  `${m.description ?? ''} ${m.descriptionShort ?? ''}`,
                )
                return buscadas.some((palabra) => propias.includes(palabra))
              })
            : movimientos

        const total = coinciden
          .filter((m) => m.type === 'expense')
          .reduce((suma, m) => suma + m.amountCents, 0)

        return {
          periodo: rango ? nombrarPeriodo(rango, contexto.locale) : 'todo el historial',
          cuantos: coinciden.length,
          total: dinero(total),
          sinDatos: coinciden.length === 0,
          ejemplos: coinciden.slice(0, 5).map((m) => ({
            descripcion: m.descriptionShort ?? m.description ?? 'Sin descripción',
            monto: dinero(m.amountCents),
            fecha: m.occurredOn,
          })),
        }
      },
    }),

    ritmoDelPeriodo: tool({
      description:
        'Compara el gasto acumulado del período actual con el mismo día del anterior. Úsala para «¿voy muy rápido este mes?».',
      inputSchema: z.object({}),
      execute: async () => {
        const hoy = todayIn(contexto.timeZone)
        const actual = periodFor(contexto.cycleConfig, hoy)
        const anterior = previousPeriod(contexto.cycleConfig, actual)

        const [diasActual, diasAnterior] = await Promise.all([
          gastoPorDia(contexto.userId, actual),
          gastoPorDia(contexto.userId, anterior),
        ])

        const puntos = compararRitmo(diasActual, diasAnterior, { actual, anterior }, hoy)
        const ritmo = ritmoRelativo(puntos)

        return {
          periodo: nombrarPeriodo(actual, contexto.locale),
          diaDelPeriodo: puntos.filter((p) => p.actual !== null).length,
          sinReferencia: ritmo === null,
          diferencia: ritmo ? dinero(Math.abs(ritmo.diferencia)) : null,
          direccion: ritmo ? (ritmo.diferencia > 0 ? 'más' : 'menos') : null,
          porcentaje: ritmo?.porcentaje ?? null,
          hasta: toISO(hoy),
        }
      },
    }),
  }
}

export type Herramientas = ReturnType<typeof crearHerramientas>
