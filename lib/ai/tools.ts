import { z } from 'zod'
import { tool } from 'ai'
import {
  periodAggregates,
  categoryBreakdown,
  listTransactions,
} from '@/lib/db/queries/transactions'
import { gastoPorDia } from '@/lib/db/queries/charts'
import { periodFor, previousPeriod, type CycleConfig } from '@/lib/domain/cycle'
import { todayIn, toISO, daysBetween, type CivilDate } from '@/lib/domain/civil-date'
import { computeTotals, computeBreakdown, compareWithPrevious } from '@/lib/domain/balance'
import { compararRitmo, ritmoRelativo } from '@/lib/domain/series'
import { formatMoney } from '@/lib/domain/money-format'
import { findCategory, CATEGORIES, isValidFor } from '@/lib/domain/categories'
import { extraerPalabrasClave } from '@/lib/domain/keywords'
import { nombrarPeriodo } from '@/components/etiqueta-periodo'
import { currencyDecimals } from '@/lib/domain/money'
import { movimientoPropuestoSchema, prepararMovimientos, aUnidadMenor } from '@/lib/ai/propuesta'
import { decidir, explicar } from '@/lib/domain/puerta'
import {
  guardarPropuesta,
  aplicarCreacion,
  automaticoActivo,
} from '@/lib/db/queries/assistant-writes'
import {
  listarDeudas,
  comoDeuda,
  comoAbonos,
  totalesDeDeuda,
} from '@/lib/db/queries/debts'
import { saldoDe, describirVencimiento } from '@/lib/domain/deudas'
import { resolverFecha } from '@/lib/domain/fecha-hablada'
import { enMayuscula } from '@/lib/domain/keywords'
import { listarMetas, buscarMetaPorNombre } from '@/lib/db/queries/goals'
import {
  listarRecurrentes,
  pendientesDeConfirmar,
  buscarRecurrentePorDescripcion,
} from '@/lib/db/queries/recurring'
import {
  presupuestosConGasto,
  buscarPresupuestoPorCategoria,
  resolverCategoria,
} from '@/lib/db/queries/budgets'
import { calcularEstado, ritmoDiario } from '@/lib/domain/goals'
import { resolverPeriodicidad, describirPeriodicidad } from '@/lib/domain/recurrence'

/**
 * Esquema para propuesta de meta desde el chat (spec 012, §4).
 *
 * `monto` va en unidades corrientes: el modelo dice `2000000` para dos millones,
 * nunca centavos.
 */
export const metaChatSchema = z.object({
  nombre: z.string().trim().min(1).max(60),
  monto: z.number().positive().finite(),
  fecha: z
    .string()
    .max(40)
    .nullable()
    .optional()
    .describe('Tal como se dijo: «el martes», «para diciembre». Null si no se dijo.'),
})

export type MetaChatInput = z.infer<typeof metaChatSchema>

export type MetaPreparada = {
  readonly nombre: string
  readonly targetCents: number
  readonly targetDate: string | null
}

/**
 * Prepara una meta propuesta desde el chat.
 *
 * Convierte el monto a centavos, resuelve la fecha y capitaliza el nombre.
 */
export function prepararMeta(
  input: MetaChatInput,
  contexto: { currency: string; hoy: CivilDate },
): MetaPreparada | { readonly falta: 'monto' | 'nombre' } {
  const cents = aUnidadMenor(input.monto, contexto.currency)
  if (cents === null || cents <= 0) {
    return { falta: 'monto' as const }
  }

  const nombreLimpio = input.nombre.trim()
  if (!nombreLimpio) {
    return { falta: 'nombre' as const }
  }

  let targetDate: string | null = null
  if (input.fecha) {
    const resolved = resolverFecha(input.fecha, contexto.hoy)
    if (resolved.ok) {
      targetDate = toISO(resolved.fecha)
    }
  }

  return {
    nombre: enMayuscula(nombreLimpio),
    targetCents: cents,
    targetDate,
  }
}

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
 *
 * **Cada monto se devuelve dos veces, y es a propósito.** El texto formateado
 * —`"$ 487.599"`— es el que el modelo cita en su respuesta, porque redactar a
 * partir de un entero le haría redondear mal o inventar separadores. El entero
 * en centavos es el que dibuja la interfaz: un gráfico no se traza con cadenas
 * de texto (D-068). Ninguna de las dos formas se calcula a partir de la otra;
 * ambas salen del mismo entero de origen (Art. I).
 */

export type ContextoHerramientas = {
  readonly userId: string
  readonly cycleConfig: CycleConfig
  readonly cycleConfiguredAt: Date | null
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
          ingresosCents: totales.income.cents,
          gastosCents: totales.expense.cents,
          saldoCents: totales.balance.cents,
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
            clave: entrada.category.key,
            montoCents: entrada.amount.cents,
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
          gastoActualCents: totalesActual.expense.cents,
          gastoAnteriorCents: totalesAnterior.expense.cents,
          periodoActual: nombrarPeriodo(actual, contexto.locale),
          periodoAnterior: nombrarPeriodo(anterior, contexto.locale),
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
            clave: m.category ?? null,
            montoCents: m.amountCents,
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
          totalCents: total,
          sinDatos: coinciden.length === 0,
          ejemplos: coinciden.slice(0, 5).map((m) => ({
            descripcion: m.descriptionShort ?? m.description ?? 'Sin descripción',
            monto: dinero(m.amountCents),
            fecha: m.occurredOn,
            montoCents: m.amountCents,
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
          diferenciaCents: ritmo ? ritmo.diferencia : null,
          // La serie completa va aparte de la frase: el modelo no la lee, la
          // dibuja la interfaz (D-068).
          puntos: puntos.map((punto) => ({
            dia: punto.dia,
            fecha: punto.fecha,
            actual: punto.actual,
            anterior: punto.anterior,
          })),
        }
      },
    }),

    /* Escritura (spec 010).
     *
     * Se llaman `proponer*` y no `registrar*` porque eso es lo que hacen: el
     * modelo entrega una propuesta y **la puerta decide**. Si la salvaguarda
     * viviera en el prompt sería algo que le pedimos que recuerde, y un modelo
     * olvida y obedece a texto que venga dentro de los datos del usuario. */

    proponerMovimientos: tool({
      description:
        'Registra uno o varios gastos o ingresos que la persona acaba de contar. ' +
        'Usala cuando describa algo que gasto o recibio. Si no dice el monto de ' +
        'alguno, mandalo igual con monto null: se le preguntara. Nunca inventes un monto.',
      inputSchema: z.object({
        movimientos: z.array(movimientoPropuestoSchema).min(1).max(10),
      }),
      execute: async ({ movimientos }) => {
        const hoy = todayIn(contexto.timeZone)
        const { listos, incompletos } = prepararMovimientos(movimientos, {
          currency: contexto.currency,
          hoy,
        })

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({
          tipo: 'crear',
          cuantos: listos.length,
          automaticoActivo: automatico,
        })

        if (decision.accion === 'rechazar') {
          return {
            resultado: 'rechazado' as const,
            motivo: explicar(decision),
            faltan: incompletos,
          }
        }

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: movimientos.map((m) => m.descripcion).join(' - '),
          proposal: { movimientos: listos },
        })

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy,
          })

          return {
            resultado: 'registrado' as const,
            propuestaId,
            movimientos: paraMostrar(listos, dinero),
            faltan: incompletos,
            // Se puede deshacer de un toque, y por eso pudo escribirse sola.
            revertible: true,
          }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.motivo,
          explicacion: explicar(decision),
          movimientos: paraMostrar(listos, dinero),
          faltan: incompletos,
          primeraVez: !automatico,
        }
      },
    }),

    proponerCorreccion: tool({
      description:
        'Corrige el monto o la categoria de un movimiento ya registrado. Usala ' +
        'cuando la persona diga que algo quedo mal, por ejemplo "no, fueron 20 mil".',
      inputSchema: z.object({
        descripcion: z.string().max(80).describe('Como se refiere al movimiento'),
        montoNuevo: z.number().positive().nullable(),
        categoriaNueva: z.enum(clavesCategoria).nullable(),
      }),
      execute: async ({ descripcion, montoNuevo, categoriaNueva }) =>
        proponerSobreExistente(contexto, dinero, 'corregir', descripcion, {
          montoNuevo,
          categoriaNueva,
        }),
    }),

    proponerAnulacion: tool({
      description:
        'Anula un movimiento ya registrado. Usala cuando la persona diga que algo ' +
        'no fue, se lo devolvieron, o lo pago otra persona.',
      inputSchema: z.object({
        descripcion: z.string().max(80).describe('Como se refiere al movimiento'),
      }),
      execute: async ({ descripcion }) =>
        proponerSobreExistente(contexto, dinero, 'anular', descripcion, {}),
    }),
    /* Deudas (spec 011). */

    misDeudas: tool({
      description:
        'Cuanto debo y quien me debe, con sus saldos. Usala para "cuanto debo", ' +
        '"a quien le debo" o "quien me debe plata".',
      inputSchema: z.object({}),
      execute: async () => {
        const hoy = todayIn(contexto.timeZone)
        const vivas = await listarDeudas(contexto.userId)
        const totales = await totalesDeDeuda(contexto.userId)

        const detalle = vivas.map(({ fila, abonos }) => ({
          contraparte: fila.counterparty,
          direccion: fila.direction === 'owed_by_me' ? 'la debo' : 'me la deben',
          saldo: dinero(saldoDe(comoDeuda(fila), comoAbonos(abonos)).cents),
          saldoCents: saldoDe(comoDeuda(fila), comoAbonos(abonos)).cents,
          vencimiento: describirVencimiento(comoDeuda(fila), comoAbonos(abonos), hoy),
        }))

        return {
          sinDatos: vivas.length === 0,
          debo: dinero(totales.debo),
          meDeben: dinero(totales.meDeben),
          deboCents: totales.debo,
          meDebenCents: totales.meDeben,
          deudas: detalle,
        }
      },
    }),

    proponerDeuda: tool({
      description:
        'Registra una deuda nueva. Usala cuando digan que les prestaron dinero, ' +
        'que prestaron, o que deben algo a alguien. Manda la fecha de vencimiento ' +
        'tal como la oigas —«mañana», «el martes», «el 7 de septiembre»— sin ' +
        'convertirla a ninguna otra forma.',
      inputSchema: z.object({
        direccion: z
          .enum(['owed_by_me', 'owed_to_me'])
          .describe('owed_by_me si la persona debe; owed_to_me si le deben'),
        contraparte: z.string().min(1).max(80).describe('A quien, o quien'),
        monto: z.number().positive().describe('En unidades corrientes, no centavos'),
        vence: z.string().max(40).nullable().describe('Tal como se dijo, o null'),
      }),
      execute: async ({ direccion, contraparte, monto, vence }) => {
        const hoy = todayIn(contexto.timeZone)
        const cents = aUnidadMenor(monto, contexto.currency)

        if (cents === null) {
          return { resultado: 'rechazado' as const, motivo: 'Ese monto no lo entendi.' }
        }

        const fecha = resolverFecha(vence, hoy)
        if (!fecha.ok) {
          return {
            resultado: 'falta-fecha' as const,
            motivo: 'No entendi para cuando. Dime la fecha y lo dejo listo.',
          }
        }

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: automatico })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `deuda con ${contraparte}`,
          proposal: {
            deuda: {
              direction: direccion,
              counterparty: contraparte,
              originalCents: cents,
              dueOn: vence ? toISO(fecha.fecha) : null,
            },
          },
        })

        const resumen = {
          // Igual que con las descripciones: la tarjeta va por delante de la
          // escritura, y `crearDeuda` capitaliza después (D-076).
          contraparte: enMayuscula(contraparte),
          direccion: direccion === 'owed_by_me' ? 'la debo' : 'me la deben',
          monto: dinero(cents),
          montoCents: cents,
          vence: vence ? toISO(fecha.fecha) : null,
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy,
          })
          return { resultado: 'registrado' as const, propuestaId, deuda: resumen, revertible: true }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.accion === 'confirmar' ? decision.motivo : 'sin-activar',
          explicacion: explicar(decision),
          deuda: resumen,
          primeraVez: !automatico,
        }
      },
    }),

    proponerAbono: tool({
      description:
        'Abona a una deuda existente. Usala cuando digan que pagaron parte de lo ' +
        'que deben, o que les devolvieron parte de lo que prestaron.',
      inputSchema: z.object({
        contraparte: z.string().min(1).max(80),
        monto: z.number().positive().describe('En unidades corrientes'),
      }),
      execute: async ({ contraparte, monto }) => {
        const hoy = todayIn(contexto.timeZone)
        const cents = aUnidadMenor(monto, contexto.currency)
        if (cents === null) {
          return { resultado: 'rechazado' as const, motivo: 'Ese monto no lo entendi.' }
        }

        const encontrada = await buscarDeudaPorContraparte(contexto.userId, contraparte)
        if (encontrada.resultado !== 'una') return encontrada.salida

        const { fila, abonos } = encontrada.deuda
        const saldo = saldoDe(comoDeuda(fila), comoAbonos(abonos))

        if (cents > saldo.cents) {
          return {
            resultado: 'rechazado' as const,
            motivo: `Solo quedan ${dinero(saldo.cents)} por pagar.`,
          }
        }

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: automatico })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `abono a ${contraparte}`,
          proposal: { abono: { debtId: fila.id, amountCents: cents, paidOn: toISO(hoy) } },
        })

        const resumen = {
          contraparte: fila.counterparty,
          monto: dinero(cents),
          montoCents: cents,
          saldoAntes: dinero(saldo.cents),
          saldoDespues: dinero(saldo.cents - cents),
          salda: saldo.cents - cents === 0,
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy,
          })
          return { resultado: 'registrado' as const, propuestaId, abono: resumen, revertible: true }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: 'sin-activar' as const,
          explicacion: explicar(decision),
          abono: resumen,
          primeraVez: !automatico,
        }
      },
    }),

    proponerSaldarDeuda: tool({
      description:
        'Da una deuda por saldada entera. Usala cuando digan que ya pagaron todo ' +
        'lo que debian a alguien, o que ya les devolvieron todo.',
      inputSchema: z.object({
        contraparte: z.string().min(1).max(80),
      }),
      execute: async ({ contraparte }) => {
        const encontrada = await buscarDeudaPorContraparte(contexto.userId, contraparte)
        if (encontrada.resultado !== 'una') return encontrada.salida

        const { fila, abonos } = encontrada.deuda
        const saldo = saldoDe(comoDeuda(fila), comoAbonos(abonos))

        // Saldar modifica algo que ya existe, asi que entra por la puerta como
        // `corregir`: confirma siempre, con automatico o sin el (FR-010 de la
        // spec 010). No hizo falta ninguna regla nueva.
        const decision = decidir({ tipo: 'corregir', cuantos: 1, automaticoActivo: true })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'corregir',
          inputText: `saldar deuda con ${contraparte}`,
          proposal: { saldar: { debtId: fila.id } },
        })

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: 'destructivo' as const,
          explicacion: explicar(decision),
          deuda: {
            contraparte: fila.counterparty,
            direccion: fila.direction === 'owed_by_me' ? 'la debo' : 'me la deben',
            saldo: dinero(saldo.cents),
            saldoCents: saldo.cents,
          },
        }
      },
    }),

    /* Lectura: metas, presupuestos y recurrentes (spec 012). */

    misMetas: tool({
      description:
        'Metas de ahorro con su progreso. Usala para «¿cómo voy con las metas?» ' +
        'o «¿cuánto falta para el viaje?».',
      inputSchema: z.object({}),
      execute: async () => {
        const metas = await listarMetas(contexto.userId)
        const hoy = todayIn(contexto.timeZone)
        return {
          sinDatos: metas.length === 0,
          metas: metas.map((m) => {
            const estado = calcularEstado(m.aportadoCents, m.targetCents)
            const ritmo = ritmoDiario(m.aportes, hoy)
            const falta = m.targetCents - m.aportadoCents
            const diasEstimados =
              ritmo !== null && ritmo > 0 && falta > 0 ? Math.ceil(falta / ritmo) : null
            return {
              nombre: m.name,
              objetivo: dinero(m.targetCents),
              objetivoCents: m.targetCents,
              aportado: dinero(m.aportadoCents),
              aportadoCents: m.aportadoCents,
              porcentaje: estado.porcentaje,
              falta: dinero(falta),
              faltaCents: falta,
              estado: estado.alcanzada ? 'alcanzada' : 'en-progreso',
              fechaEstimada: diasEstimados,
            }
          }),
        }
      },
    }),

    misPresupuestos: tool({
      description:
        'Presupuestos del período con lo gastado. Usala para «¿cómo van los ' +
        'presupuestos?» o «¿cuánto me falta para comida?».',
      inputSchema: z.object({}),
      execute: async () => {
        if (!contexto.cycleConfiguredAt) {
          return {
            sinCiclo: true,
            mensaje:
              'Primero configura tu ciclo de facturación en Ajustes para usar presupuestos.',
          }
        }
        const hoy = todayIn(contexto.timeZone)
        const periodo = periodFor(contexto.cycleConfig, hoy)
        const conGasto = await presupuestosConGasto(contexto.userId, periodo)
        const diasRestantes = daysBetween(hoy, periodo.end)

        return {
          sinDatos: conGasto.length === 0,
          periodo: nombrarPeriodo(periodo, contexto.locale),
          diasRestantes,
          presupuestos: conGasto.map((p) => {
            const gastado = p.gastadoCents
            const restante = p.limitCents - gastado
            const porcentaje = Math.round((gastado / p.limitCents) * 100)
            const nivel =
              porcentaje >= 100 ? 'excedido' : porcentaje >= 80 ? 'alerta' : 'ok'
            const categoria = findCategory(p.category)
            return {
              categoria: categoria?.name ?? p.category,
              clave: p.category,
              tope: dinero(p.limitCents),
              topeCents: p.limitCents,
              gastado: dinero(gastado),
              gastadoCents: gastado,
              restante: dinero(restante),
              restanteCents: restante,
              porcentaje,
              nivel,
            }
          }),
        }
      },
    }),

    misRecurrentes: tool({
      description:
        'Cobros recurrentes: pendientes y programados. Usala para «¿qué cobros ' +
        'tengo pendientes?» o «¿qué se me viene?».',
      inputSchema: z.object({}),
      execute: async () => {
        const hoy = todayIn(contexto.timeZone)
        const [todos, pendientes] = await Promise.all([
          listarRecurrentes(contexto.userId),
          pendientesDeConfirmar(contexto.userId, hoy),
        ])
        const pendientesIds = new Set(pendientes.map((p) => p.id))

        return {
          sinDatos: todos.length === 0,
          pendientes: pendientes.map((r) => ({
            descripcion: r.description,
            monto: dinero(r.amountCents),
            montoCents: r.amountCents,
            tipo: r.type === 'expense' ? 'gasto' : 'ingreso',
            categoria: findCategory(r.category)?.name ?? r.category,
            clave: r.category,
            fecha: r.nextDueOn,
          })),
          programados: todos
            .filter((r) => !pendientesIds.has(r.id))
            .map((r) => ({
              descripcion: r.description,
              monto: dinero(r.amountCents),
              montoCents: r.amountCents,
              tipo: r.type === 'expense' ? 'gasto' : 'ingreso',
              categoria: findCategory(r.category)?.name ?? r.category,
              clave: r.category,
              proximaFecha: r.nextDueOn,
            })),
        }
      },
    }),

    /* Escritura: metas (spec 012). */

    proponerMeta: tool({
      description:
        'Crea una meta de ahorro nueva. Usala cuando digan que quieren ahorrar ' +
        'para algo, o que quieren crear una meta. Si no dicen la fecha, mandala ' +
        'null.',
      inputSchema: metaChatSchema,
      execute: async (input) => {
        const hoy = todayIn(contexto.timeZone)
        const preparada = prepararMeta(input, { currency: contexto.currency, hoy })

        if ('falta' in preparada) {
          return {
            resultado: 'rechazado' as const,
            motivo: `Falta el ${preparada.falta}. Dime cuánto quieres ahorrar y para qué.`,
          }
        }

        // Verificar si ya existe una meta con ese nombre
        const existente = await buscarMetaPorNombre(contexto.userId, preparada.nombre)
        if (existente.resultado === 'exacta') {
          return {
            resultado: 'meta-existente' as const,
            meta: {
              nombre: existente.meta.name,
              objetivo: dinero(existente.meta.targetCents),
              aportado: dinero(existente.meta.aportadoCents),
              porcentaje: calcularEstado(
                existente.meta.aportadoCents,
                existente.meta.targetCents,
              ).porcentaje,
            },
          }
        }

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: automatico })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `meta ${preparada.nombre}`,
          proposal: {
            meta: {
              name: preparada.nombre,
              targetCents: preparada.targetCents,
              targetDate: preparada.targetDate,
            },
          },
        })

        const resumen = {
          nombre: preparada.nombre,
          objetivo: dinero(preparada.targetCents),
          objetivoCents: preparada.targetCents,
          fechaObjetivo: preparada.targetDate,
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy,
          })
          return {
            resultado: 'registrado' as const,
            propuestaId,
            meta: resumen,
            revertible: true,
          }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.motivo,
          explicacion: explicar(decision),
          meta: resumen,
          primeraVez: !automatico,
        }
      },
    }),

    proponerAporteMeta: tool({
      description:
        'Aporta o retira dinero de una meta de ahorro existente. Usala cuando ' +
        'digan que van a ahorrar para una meta, o que quieren sacar dinero de ' +
        'una meta. Si el monto es negativo, es un retiro.',
      inputSchema: z.object({
        meta: z.string().min(1).max(60).describe('Nombre de la meta'),
        monto: z.number().positive().finite().describe('En unidades corrientes'),
        esRetiro: z.boolean().default(false),
      }),
      execute: async ({ meta, monto, esRetiro }) => {
        const hoy = todayIn(contexto.timeZone)
        const cents = aUnidadMenor(monto, contexto.currency)
        if (cents === null || cents <= 0) {
          return { resultado: 'rechazado' as const, motivo: 'Ese monto no lo entendí.' }
        }

        const encontrada = await buscarMetaPorNombre(contexto.userId, meta)
        if (encontrada.resultado === 'ninguna') {
          return {
            resultado: 'no-encontrado' as const,
            buscado: meta,
            opciones: encontrada.metasActivas.map((m) => m.name),
          }
        }
        if (encontrada.resultado === 'varias') {
          return {
            resultado: 'varias-coincidencias' as const,
            candidatos: encontrada.candidatos.map((m) => ({
              nombre: m.name,
              aportado: dinero(m.aportadoCents),
            })),
          }
        }

        const metaEncontrada = encontrada.meta
        const direccion = esRetiro ? 'withdrawal' : 'contribution'

        // Validar que no se retire más de lo aportado
        if (esRetiro && cents > metaEncontrada.aportadoCents) {
          return {
            resultado: 'rechazado' as const,
            motivo: `Solo tienes ${dinero(metaEncontrada.aportadoCents)} aportados en "${metaEncontrada.name}".`,
          }
        }

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: automatico })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `${esRetiro ? 'retiro' : 'aporte'} meta ${metaEncontrada.name}`,
          proposal: {
            aporteMeta: {
              goalId: metaEncontrada.id,
              amountCents: cents,
              direction: direccion,
              fecha: toISO(hoy),
            },
          },
        })

        const resumen = {
          nombre: metaEncontrada.name,
          monto: dinero(cents),
          montoCents: cents,
          tipo: esRetiro ? 'retiro' : 'aporte',
          metaObjetivo: dinero(metaEncontrada.targetCents),
          metaAportado: dinero(metaEncontrada.aportadoCents),
          metaAportadoCents: metaEncontrada.aportadoCents,
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy,
          })
          return {
            resultado: 'registrado' as const,
            propuestaId,
            aporte: resumen,
            revertible: true,
          }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.motivo,
          explicacion: explicar(decision),
          aporte: resumen,
          primeraVez: !automatico,
        }
      },
    }),

    /* Escritura: presupuestos (spec 012). */

    proponerPresupuesto: tool({
      description:
        'Crea o actualiza un presupuesto para una categoría de gasto. Usala cuando ' +
        'digan que quieren poner un tope a algo. La categoría debe ser de gasto.',
      inputSchema: z.object({
        categoria: z.string().min(1).max(40).describe('Nombre de la categoría'),
        tope: z.number().positive().finite().describe('En unidades corrientes'),
      }),
      execute: async ({ categoria, tope }) => {
        if (!contexto.cycleConfiguredAt) {
          return {
            resultado: 'rechazado' as const,
            motivo:
              'Primero configura tu ciclo de facturación en Ajustes para usar presupuestos.',
          }
        }

        const clave = resolverCategoria(categoria)
        if (!clave) {
          return {
            resultado: 'rechazado' as const,
            motivo: `No reconozco la categoría "${categoria}". Prueba con otra.`,
          }
        }

        if (!isValidFor(clave, 'expense')) {
          return {
            resultado: 'rechazado' as const,
            motivo: 'Los presupuestos solo aplican a categorías de gasto.',
          }
        }

        const cents = aUnidadMenor(tope, contexto.currency)
        if (cents === null || cents <= 0) {
          return { resultado: 'rechazado' as const, motivo: 'Ese tope no lo entendí.' }
        }

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: automatico })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `presupuesto ${categoria}`,
          proposal: {
            presupuesto: {
              category: clave,
              limitCents: cents,
            },
          },
        })

        const categoriaInfo = findCategory(clave)
        const resumen = {
          categoria: categoriaInfo?.name ?? clave,
          clave,
          tope: dinero(cents),
          topeCents: cents,
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy: todayIn(contexto.timeZone),
          })
          return {
            resultado: 'registrado' as const,
            propuestaId,
            presupuesto: resumen,
            revertible: true,
          }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.motivo,
          explicacion: explicar(decision),
          presupuesto: resumen,
          primeraVez: !automatico,
        }
      },
    }),

    proponerEliminarPresupuesto: tool({
      description:
        'Elimina un presupuesto existente. Usala cuando digan que ya no quieren ' +
        'seguir con un presupuesto.',
      inputSchema: z.object({
        categoria: z.string().min(1).max(40).describe('Nombre de la categoría'),
      }),
      execute: async ({ categoria }) => {
        if (!contexto.cycleConfiguredAt) {
          return {
            resultado: 'rechazado' as const,
            motivo:
              'Primero configura tu ciclo de facturación en Ajustes para usar presupuestos.',
          }
        }

        const clave = resolverCategoria(categoria)
        if (!clave) {
          return {
            resultado: 'rechazado' as const,
            motivo: `No reconozco la categoría "${categoria}". Prueba con otra.`,
          }
        }

        const encontrada = await buscarPresupuestoPorCategoria(contexto.userId, clave)
        if (encontrada.resultado === 'ninguna') {
          return {
            resultado: 'no-encontrado' as const,
            buscado: categoria,
            opciones: encontrada.presupuestos.map((p) => {
              const info = findCategory(p.category)
              return info?.name ?? p.category
            }),
          }
        }

        const presupuesto = encontrada.presupuesto
        const decision = decidir({ tipo: 'corregir', cuantos: 1, automaticoActivo: true })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'corregir',
          inputText: `eliminar presupuesto ${categoria}`,
          proposal: {
            eliminarPresupuesto: {
              budgetId: presupuesto.id,
              category: presupuesto.category,
            },
          },
        })

        const categoriaInfo = findCategory(presupuesto.category)
        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: 'destructivo' as const,
          explicacion: explicar(decision),
          presupuesto: {
            categoria: categoriaInfo?.name ?? presupuesto.category,
            clave: presupuesto.category,
            tope: dinero(presupuesto.limitCents),
            topeCents: presupuesto.limitCents,
          },
        }
      },
    }),

    /* Escritura: recurrentes (spec 012). */

    proponerRecurrente: tool({
      description:
        'Crea un cobro recurrente nuevo. Usala cuando digan que tienen un gasto ' +
        'o ingreso que se repite. Necesita periodicidad («cada mes», «semanal») ' +
        'y si es «cada mes» sin día, pide el día.',
      inputSchema: z.object({
        tipo: z.enum(['expense', 'income']),
        monto: z.number().positive().finite().describe('En unidades corrientes'),
        categoria: z.string().min(1).max(40),
        descripcion: z.string().min(1).max(120),
        periodicidad: z.string().min(1).max(40).describe('Tal como la dijo el usuario'),
      }),
      execute: async ({ tipo, monto, categoria, descripcion, periodicidad }) => {
        const clave = resolverCategoria(categoria)
        if (!clave) {
          return {
            resultado: 'rechazado' as const,
            motivo: `No reconozco la categoría "${categoria}". Prueba con otra.`,
          }
        }

        if (!isValidFor(clave, tipo as 'expense' | 'income')) {
          return {
            resultado: 'rechazado' as const,
            motivo: `La categoría "${categoria}" no corresponde a un ${tipo === 'expense' ? 'gasto' : 'ingreso'}.`,
          }
        }

        const cents = aUnidadMenor(monto, contexto.currency)
        if (cents === null || cents <= 0) {
          return { resultado: 'rechazado' as const, motivo: 'Ese monto no lo entendí.' }
        }

        const res = resolverPeriodicidad(periodicidad)
        if (!res.ok) {
          if (res.necesitaDia) {
            return {
              resultado: 'falta-dia' as const,
              motivo: '¿Qué día del mes? Por ejemplo: «el 5» o «el 15».',
            }
          }
          return {
            resultado: 'rechazado' as const,
            motivo: `No entendí la periodicidad "${periodicidad}". Prueba con «cada mes el 5», «semanal» o «quincenal».`,
          }
        }

        const automatico = await automaticoActivo(contexto.userId)
        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: automatico })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `recurrente ${descripcion}`,
          proposal: {
            recurrente: {
              type: tipo,
              amountCents: cents,
              category: clave,
              description: enMayuscula(descripcion),
              schedule: res.periodicidad,
            },
          },
        })

        const categoriaInfo = findCategory(clave)
        const resumen = {
          descripcion: enMayuscula(descripcion),
          monto: dinero(cents),
          montoCents: cents,
          tipo: tipo === 'expense' ? 'gasto' : 'ingreso',
          categoria: categoriaInfo?.name ?? clave,
          clave,
          periodicidad: describirPeriodicidad(res.periodicidad),
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy: todayIn(contexto.timeZone),
          })
          return {
            resultado: 'registrado' as const,
            propuestaId,
            recurrente: resumen,
            revertible: true,
          }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.motivo,
          explicacion: explicar(decision),
          recurrente: resumen,
          primeraVez: !automatico,
        }
      },
    }),

    confirmarRecurrente: tool({
      description:
        'Confirma un cobro recurrente pendiente. Usala cuando digan que ya les ' +
        'cobraron algo que tenían pendiente. Si el monto fue diferente, dile cuánto.',
      inputSchema: z.object({
        descripcion: z.string().min(1).max(80).describe('Cómo se refiere al cobro'),
        monto: z
          .number()
          .positive()
          .finite()
          .nullable()
          .describe('Si fue diferente al de siempre'),
        permanente: z
          .boolean()
          .default(false)
          .describe('Si el monto nuevo es para siempre'),
      }),
      execute: async ({ descripcion, monto, permanente }) => {
        const hoy = todayIn(contexto.timeZone)
        const encontrados = await buscarRecurrentePorDescripcion(contexto.userId, descripcion)

        if (encontrados.resultado === 'ninguna') {
          return {
            resultado: 'no-encontrado' as const,
            buscado: descripcion,
            opciones: encontrados.recurrentes.map((r) => ({
              descripcion: r.description,
              monto: dinero(r.amountCents),
              fecha: r.nextDueOn,
            })),
          }
        }

        if (encontrados.resultado === 'varias') {
          return {
            resultado: 'varias-coincidencias' as const,
            candidatos: encontrados.candidatos.map((r) => ({
              descripcion: r.description,
              monto: dinero(r.amountCents),
              fecha: r.nextDueOn,
            })),
          }
        }

        const recurrente = encontrados.recurrente
        const cents = monto != null ? aUnidadMenor(monto, contexto.currency) : null
        if (monto != null && cents === null) {
          return { resultado: 'rechazado' as const, motivo: 'Ese monto no lo entendí.' }
        }

        const decision = decidir({ tipo: 'crear', cuantos: 1, automaticoActivo: true })

        const propuestaId = await guardarPropuesta({
          userId: contexto.userId,
          kind: 'crear',
          inputText: `confirmar ${recurrente.description}`,
          proposal: {
            confirmarRecurrente: {
              recurringId: recurrente.id,
              amountCents: cents,
              permanente,
              fecha: toISO(hoy),
            },
          },
        })

        const resumen = {
          descripcion: recurrente.description,
          monto: dinero(cents ?? recurrente.amountCents),
          montoCents: cents ?? recurrente.amountCents,
          montoOriginal: dinero(recurrente.amountCents),
          montoOriginalCents: recurrente.amountCents,
          cambioMonto: cents !== null && cents !== recurrente.amountCents,
          permanente,
        }

        if (decision.accion === 'ejecutar') {
          await aplicarCreacion({
            userId: contexto.userId,
            id: propuestaId,
            currency: contexto.currency,
            hoy,
          })
          return {
            resultado: 'registrado' as const,
            propuestaId,
            confirmacion: resumen,
            revertible: true,
          }
        }

        return {
          resultado: 'por-confirmar' as const,
          propuestaId,
          motivo: decision.motivo,
          explicacion: explicar(decision),
          confirmacion: resumen,
        }
      },
    }),
  }
}

/**
 * Encuentra la deuda de la que habla la persona.
 *
 * **El modelo no envia un identificador**: envia el nombre de la contraparte y
 * el sistema busca, igual que en `proponerAnulacion`. Dejarle inventar un UUID
 * seria darle una forma de apuntar a una fila que no vio.
 */
async function buscarDeudaPorContraparte(userId: string, contraparte: string) {
  const vivas = await listarDeudas(userId)
  const buscado = contraparte.toLowerCase().trim()

  const coinciden = vivas.filter(({ fila }) => {
    const nombre = fila.counterparty.toLowerCase()
    return nombre.includes(buscado) || buscado.includes(nombre)
  })

  if (coinciden.length === 0) {
    return {
      resultado: 'ninguna' as const,
      salida: { resultado: 'no-encontrado' as const, buscado: contraparte },
    }
  }

  if (coinciden.length > 1) {
    return {
      resultado: 'varias' as const,
      salida: {
        resultado: 'varias-coincidencias' as const,
        candidatos: coinciden.slice(0, 5).map(({ fila }) => ({
          descripcion: fila.counterparty,
          monto: '',
          fecha: fila.dueOn ?? '',
        })),
      },
    }
  }

  return { resultado: 'una' as const, deuda: coinciden[0]! }
}

/** Lo minimo que la tarjeta necesita para contar que paso. */
function paraMostrar(
  movimientos: readonly {
    descripcion: string
    amountCents: number
    categoria: string
    occurredOn: string
    tipo: string
    esFuturo: boolean
  }[],
  dinero: (cents: number) => string,
) {
  return movimientos.map((m) => ({
    descripcion: m.descripcion,
    monto: dinero(m.amountCents),
    montoCents: m.amountCents,
    categoria: findCategory(m.categoria)?.name ?? 'Otros',
    clave: m.categoria,
    fecha: m.occurredOn,
    tipo: m.tipo,
    programado: m.esFuturo,
  }))
}

/**
 * Corregir y anular comparten casi todo: encontrar de que movimiento habla la
 * persona y dejar la propuesta pendiente. **Nunca se ejecutan solas** (FR-010),
 * asi que aqui no hace falta consultar la activacion: la puerta ya lo decide.
 *
 * El modelo no envia un identificador. Envia una descripcion, y **el sistema**
 * busca la coincidencia: dejarle inventar un UUID seria darle una forma de
 * apuntar a una fila que no vio.
 */
async function proponerSobreExistente(
  contexto: ContextoHerramientas,
  dinero: (cents: number) => string,
  tipo: 'corregir' | 'anular',
  descripcion: string,
  cambios: { montoNuevo?: number | null; categoriaNueva?: string | null },
) {
  const movimientos = await listTransactions(contexto.userId, { limit: 200 })
  const buscadas = extraerPalabrasClave(descripcion)

  const candidatos = movimientos.filter((m) => {
    const propias = extraerPalabrasClave(`${m.description ?? ''} ${m.descriptionShort ?? ''}`)
    return buscadas.some((palabra) => propias.includes(palabra))
  })

  if (candidatos.length === 0) {
    return { resultado: 'no-encontrado' as const, buscado: descripcion }
  }

  // Con varias coincidencias no se elige por el usuario: se le muestran y elige.
  if (candidatos.length > 1) {
    return {
      resultado: 'varias-coincidencias' as const,
      candidatos: candidatos.slice(0, 5).map((m) => ({
        descripcion: m.descriptionShort ?? m.description ?? 'Sin descripcion',
        monto: dinero(m.amountCents),
        fecha: m.occurredOn,
      })),
    }
  }

  const elegido = candidatos[0]!
  const montoCents =
    cambios.montoNuevo != null
      ? Math.round(cambios.montoNuevo * 10 ** currencyDecimals(contexto.currency))
      : null

  const propuestaId = await guardarPropuesta({
    userId: contexto.userId,
    kind: tipo,
    inputText: descripcion,
    proposal: {
      transactionId: elegido.id,
      ...(montoCents ? { amountCents: montoCents } : {}),
      ...(cambios.categoriaNueva ? { category: cambios.categoriaNueva } : {}),
    },
  })

  return {
    resultado: 'por-confirmar' as const,
    propuestaId,
    motivo: 'destructivo' as const,
    explicacion: explicar({ accion: 'confirmar', motivo: 'destructivo' }),
    afectado: {
      descripcion: elegido.descriptionShort ?? elegido.description ?? 'Sin descripcion',
      montoAntes: dinero(elegido.amountCents),
      montoDespues: montoCents ? dinero(montoCents) : null,
      fecha: elegido.occurredOn,
    },
  }
}

export type Herramientas = ReturnType<typeof crearHerramientas>
