import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { transactions, categorizationLog, recurringMovements, debts, debtPayments } from '@/lib/db/schema'
import { addDays, toISO, type CivilDate } from '@/lib/domain/civil-date'
import { extraerPalabrasClave, normalizar, descripcionCorta } from '@/lib/domain/keywords'
import { primeraFecha } from '@/lib/domain/recurrence'

/**
 * Datos de ejemplo (D-046).
 *
 * Quien crea una cuenta y encuentra formularios en blanco y gráficos vacíos no
 * ve nada de lo que distingue a Serva: ni la categorización, ni las cifras
 * comparadas, ni el desglose. Se marcha con la impresión de un formulario de
 * registro. Todo el proyecto se juega en esos dos minutos.
 *
 * Los movimientos generados se comportan como reales —se editan, se anulan, se
 * consultan— pero quedan marcados para poder eliminarlos todos de una vez.
 */

type Plantilla = {
  readonly descripcion: string
  readonly categoria: string
  /** Rango de monto en unidades enteras de la moneda, no en centavos. */
  readonly desde: number
  readonly hasta: number
  /** Cuántas veces aparece, aproximadamente, por período. */
  readonly veces: number
}

const GASTOS: readonly Plantilla[] = [
  { descripcion: 'mercado de la semana', categoria: 'groceries', desde: 90000, hasta: 180000, veces: 4 },
  { descripcion: 'frutas y verduras', categoria: 'groceries', desde: 15000, hasta: 40000, veces: 3 },
  { descripcion: 'almuerzo', categoria: 'eating_out', desde: 15000, hasta: 28000, veces: 6 },
  { descripcion: 'domicilio de comida', categoria: 'eating_out', desde: 25000, hasta: 55000, veces: 3 },
  { descripcion: 'café', categoria: 'eating_out', desde: 5000, hasta: 12000, veces: 4 },
  { descripcion: 'transporte público', categoria: 'transport', desde: 2900, hasta: 6000, veces: 8 },
  { descripcion: 'taxi', categoria: 'transport', desde: 12000, hasta: 30000, veces: 2 },
  { descripcion: 'arriendo', categoria: 'housing', desde: 1200000, hasta: 1200000, veces: 1 },
  { descripcion: 'recibo de la luz', categoria: 'utilities', desde: 60000, hasta: 110000, veces: 1 },
  { descripcion: 'internet', categoria: 'utilities', desde: 75000, hasta: 75000, veces: 1 },
  { descripcion: 'consulta médica', categoria: 'health', desde: 40000, hasta: 90000, veces: 1 },
  { descripcion: 'medicamentos', categoria: 'health', desde: 18000, hasta: 60000, veces: 1 },
  { descripcion: 'cine con amigos', categoria: 'entertainment', desde: 20000, hasta: 45000, veces: 1 },
  { descripcion: 'suscripción de música', categoria: 'subscriptions', desde: 16900, hasta: 16900, veces: 1 },
  { descripcion: 'suscripción de series', categoria: 'subscriptions', desde: 26900, hasta: 26900, veces: 1 },
  { descripcion: 'ropa', categoria: 'shopping', desde: 60000, hasta: 200000, veces: 1 },
  { descripcion: 'comida para el perro', categoria: 'pets', desde: 45000, hasta: 90000, veces: 1 },
  { descripcion: 'cuota de la tarjeta', categoria: 'debt', desde: 150000, hasta: 300000, veces: 1 },
]

const INGRESOS: readonly Plantilla[] = [
  { descripcion: 'salario', categoria: 'salary', desde: 3200000, hasta: 3200000, veces: 1 },
  { descripcion: 'trabajo independiente', categoria: 'business', desde: 200000, hasta: 700000, veces: 1 },
]

/** Períodos hacia atrás que se generan, contando el actual. */
const PERIODOS = 3

/**
 * Generador con semilla.
 *
 * Los datos deben ser verosímiles, no aleatorios de verdad: con una semilla fija
 * cada usuario recibe siempre el mismo conjunto, lo que hace reproducibles tanto
 * las pruebas como cualquier captura de pantalla.
 */
function generador(semilla: number) {
  let estado = semilla
  return () => {
    estado = (estado * 1103515245 + 12345) % 2147483648
    return estado / 2147483648
  }
}

export type ResultadoEjemplo = {
  readonly movimientos: number
  readonly recurrentes: number
}

/**
 * Recurrentes de ejemplo.
 *
 * Uno de ellos vence hoy, a propósito: sin un cobro pendiente, quien visita el
 * proyecto no vería nunca la parte que da sentido a la funcionalidad —que Serva
 * pregunta en lugar de asumir— porque tendría que esperar a que llegara una
 * fecha.
 */
const RECURRENTES = [
  { descripcion: 'arriendo', categoria: 'housing', unidades: 1200000, dia: 1, venceHoy: true },
  { descripcion: 'suscripción de música', categoria: 'subscriptions', unidades: 16900, dia: 5, venceHoy: false },
  { descripcion: 'internet', categoria: 'utilities', unidades: 75000, dia: 12, venceHoy: false },
  { descripcion: 'salario', categoria: 'salary', unidades: 3200000, dia: 30, venceHoy: false, ingreso: true },
] as const

export async function generarDatosDeEjemplo(
  userId: string,
  opciones: { currency: string; hoy: CivilDate },
): Promise<ResultadoEjemplo> {
  const azar = generador(userId.length * 7919 + 13)
  const filas: (typeof transactions.$inferInsert)[] = []

  for (let periodo = 0; periodo < PERIODOS; periodo += 1) {
    // Se retrocede mes a mes desde hoy.
    const finDelPeriodo = addDays(opciones.hoy, -periodo * 30)

    for (const plantilla of [...GASTOS, ...INGRESOS]) {
      const esIngreso = INGRESOS.includes(plantilla)

      for (let i = 0; i < plantilla.veces; i += 1) {
        const rango = plantilla.hasta - plantilla.desde
        const unidades = Math.round(plantilla.desde + azar() * rango)
        // Días atrás dentro del período, nunca en el futuro.
        const diasAtras = Math.floor(azar() * 28)
        const fecha = addDays(finDelPeriodo, -diasAtras)

        filas.push({
          userId,
          type: esIngreso ? 'income' : 'expense',
          amountCents: unidades * 100,
          currency: opciones.currency,
          category: plantilla.categoria as (typeof transactions.$inferInsert)['category'],
          categorySource: 'user',
          occurredOn: toISO(fecha),
          description: plantilla.descripcion,
          descriptionShort: descripcionCorta(plantilla.descripcion),
          isSample: true,
        })
      }
    }
  }

  const insertadas = await db.insert(transactions).values(filas).returning({
    id: transactions.id,
    description: transactions.description,
    category: transactions.category,
  })

  // El historial de aprendizaje también se puebla: sin él, la categorización
  // automática no tendría de qué aprender y el visitante no vería esa parte
  // funcionar (D-015).
  const aprendizaje = insertadas
    .filter((fila) => fila.description && fila.category)
    .map((fila) => ({
      userId,
      transactionId: fila.id,
      inputText: fila.description!,
      normalizedText: normalizar(fila.description!),
      keywords: extraerPalabrasClave(fila.description!),
      suggestedCategory: null,
      confidence: null,
      mechanism: 'none' as const,
      finalCategory: fila.category,
      wasCorrected: false,
      latencyMs: null,
    }))

  if (aprendizaje.length > 0) {
    await db.insert(categorizationLog).values(aprendizaje)
  }

  const recurrentes = await db
    .insert(recurringMovements)
    .values(
      RECURRENTES.map((plantilla) => ({
        userId,
        type: ('ingreso' in plantilla && plantilla.ingreso ? 'income' : 'expense') as
          | 'income'
          | 'expense',
        amountCents: plantilla.unidades * 100,
        currency: opciones.currency,
        category: plantilla.categoria as (typeof recurringMovements.$inferInsert)['category'],
        description: plantilla.descripcion,
        schedule: { kind: 'monthly' as const, day: plantilla.dia },
        nextDueOn: toISO(
          plantilla.venceHoy
            ? opciones.hoy
            : primeraFecha({ kind: 'monthly', day: plantilla.dia }, opciones.hoy),
        ),
        isSample: true,
      })),
    )
    .returning({ id: recurringMovements.id })

  /*
   * Dos deudas, una en cada dirección (spec 011, T-543).
   *
   * Quien pulsa «ver con datos de ejemplo» tiene que encontrar la pantalla de
   * deudas con algo dentro, o parecerá que no funciona. Una a medio pagar y un
   * préstamo a favor sin cobrar, que son los dos casos que la feature resuelve.
   */
  const [deudaPropia] = await db
    .insert(debts)
    .values({
      userId,
      direction: 'owed_by_me',
      counterparty: 'mi hermana',
      originalCents: 50000000,
      currency: opciones.currency,
      dueOn: toISO(addDays(opciones.hoy, 12)),
      isSample: true,
    })
    .returning({ id: debts.id })

  await db.insert(debtPayments).values({
    debtId: deudaPropia!.id,
    amountCents: 20000000,
    paidOn: toISO(addDays(opciones.hoy, -20)),
  })

  await db.insert(debts).values({
    userId,
    direction: 'owed_to_me',
    counterparty: 'Andrés',
    originalCents: 8000000,
    currency: opciones.currency,
    isSample: true,
  })

  return { movimientos: insertadas.length, recurrentes: recurrentes.length }
}

/** Elimina todos los datos de ejemplo del usuario, sin tocar los suyos. */
export async function eliminarDatosDeEjemplo(userId: string): Promise<number> {
  await db
    .delete(recurringMovements)
    .where(and(eq(recurringMovements.userId, userId), eq(recurringMovements.isSample, true)))

  // Los abonos se van con su deuda por la cascada.
  await db.delete(debts).where(and(eq(debts.userId, userId), eq(debts.isSample, true)))

  const borradas = await db
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isSample, true)))
    .returning({ id: transactions.id })

  // El aprendizaje asociado se va con ellos por la clave foránea en cascada,
  // salvo el que quedó sin movimiento vinculado.
  await db
    .delete(categorizationLog)
    .where(
      and(
        eq(categorizationLog.userId, userId),
        sql`${categorizationLog.transactionId} IS NULL`,
      ),
    )

  return borradas.length
}

export async function tieneDatosDeEjemplo(userId: string): Promise<boolean> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isSample, true)))

  return (fila?.total ?? 0) > 0
}
