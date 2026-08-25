import { z } from 'zod'
import { CATEGORIES, isValidFor, fallbackFor, type MovementKind } from '@/lib/domain/categories'
import { currencyDecimals } from '@/lib/domain/money'
import { resolverFecha } from '@/lib/domain/fecha-hablada'
import { compareDates, toISO, type CivilDate } from '@/lib/domain/civil-date'
import { descripcionCorta, enMayuscula } from '@/lib/domain/keywords'
import { MAXIMO_POR_MENSAJE } from '@/lib/domain/puerta'

/**
 * Lo que el modelo propone, y en qué se convierte (spec 010, fase 3).
 *
 * El modelo devuelve una forma deliberadamente tonta: números en unidades
 * corrientes y fechas como las oyó. Todo lo que exige criterio —convertir a la
 * unidad menor, resolver «el martes», decidir la categoría de reserva— lo hace
 * el sistema. Cuanto menos tenga que acertar el modelo, menos hay que confiarle.
 */

const clavesCategoria = CATEGORIES.map((c) => c.key) as [string, ...string[]]

/**
 * El esquema de entrada.
 *
 * `monto` va en unidades corrientes: el modelo dice `18000` para dieciocho mil
 * pesos, nunca centavos. Pedirle centavos sería pedirle que multiplique, y un
 * modelo que multiplica se equivoca en silencio por un factor de cien.
 */
export const movimientoPropuestoSchema = z.object({
  tipo: z.enum(['expense', 'income']),
  monto: z
    .number()
    .positive()
    .finite()
    .nullable()
    .describe('En unidades corrientes, no en centavos. Null si no se dijo.'),
  descripcion: z.string().trim().min(1).max(120),
  categoria: z.enum(clavesCategoria).nullable(),
  fecha: z
    .string()
    .max(40)
    .nullable()
    .describe('Tal como se dijo: «hoy», «ayer», «mañana», «el martes», «7 de septiembre».'),
})

export const propuestaSchema = z.object({
  movimientos: z.array(movimientoPropuestoSchema).max(MAXIMO_POR_MENSAJE * 2),
})

export type MovimientoPropuesto = z.infer<typeof movimientoPropuestoSchema>

/** Un movimiento listo para escribirse: todo resuelto y en enteros. */
export type MovimientoListo = {
  readonly tipo: MovementKind
  readonly amountCents: number
  readonly descripcion: string
  readonly descripcionCorta: string
  readonly categoria: string
  readonly categoriaSegura: boolean
  readonly occurredOn: string
  /** Futuro: no es un movimiento, es un cobro programado (E5). */
  readonly esFuturo: boolean
}

/** Lo que falta para poder escribir algo, en palabras que se le puedan decir. */
export type MovimientoIncompleto = {
  readonly descripcion: string
  readonly falta: 'monto' | 'fecha' | 'descripcion'
}

export type Preparacion = {
  readonly listos: readonly MovimientoListo[]
  readonly incompletos: readonly MovimientoIncompleto[]
}

/**
 * Convierte lo propuesto en lo que se puede escribir.
 *
 * **Cada movimiento se evalúa por separado** (FR-018). Una frase con tres
 * gastos donde el tercero no lleva monto registra los dos primeros y pregunta
 * por el tercero. Tratarlos como un bloque atómico solo conseguiría que una
 * frase incompleta tirara a la basura lo que sí estaba completo, y los
 * movimientos de un mensaje son independientes entre sí: no son una
 * transferencia donde escribir la mitad rompe la contabilidad.
 */
export function prepararMovimientos(
  propuestos: readonly MovimientoPropuesto[],
  contexto: { readonly currency: string; readonly hoy: CivilDate },
): Preparacion {
  const listos: MovimientoListo[] = []
  const incompletos: MovimientoIncompleto[] = []

  for (const propuesto of propuestos) {
    const preparado = prepararUno(propuesto, contexto)
    if ('falta' in preparado) incompletos.push(preparado)
    else listos.push(preparado)
  }

  return { listos, incompletos }
}

function prepararUno(
  propuesto: MovimientoPropuesto,
  contexto: { currency: string; hoy: CivilDate },
): MovimientoListo | MovimientoIncompleto {
  const descripcion = propuesto.descripcion.trim()
  if (descripcion === '') {
    return { descripcion: '(sin descripción)', falta: 'descripcion' }
  }

  // FR-003: sin monto se pregunta. Nunca se inventa, ni se estima, ni se
  // registra cero. Es lo que separa esto de una aplicación que se llena de
  // datos falsos.
  if (propuesto.monto === null) {
    return { descripcion, falta: 'monto' }
  }

  const cents = aUnidadMenor(propuesto.monto, contexto.currency)
  if (cents === null) {
    return { descripcion, falta: 'monto' }
  }

  const resuelta = resolverFecha(propuesto.fecha, contexto.hoy)
  if (!resuelta.ok) {
    return { descripcion, falta: 'fecha' }
  }

  const tipo = propuesto.tipo as MovementKind
  const categoriaValida =
    propuesto.categoria !== null && isValidFor(propuesto.categoria, tipo)

  return {
    tipo,
    amountCents: cents,
    // La tarjeta enseña esto antes de guardarlo, así que la mayúscula del
    // esquema de escritura llegaría tarde: se vería «palomitas cine» al
    // confirmar y «Palomitas cine» en el historial (D-076).
    descripcion: enMayuscula(descripcion),
    descripcionCorta: descripcionCorta(descripcion),
    // FR-005: sin categoría fiable va a «Otros», igual que hace la cascada de
    // la spec 002. No se detiene el registro por no saber clasificarlo.
    categoria: categoriaValida ? propuesto.categoria! : fallbackFor(tipo).key,
    categoriaSegura: categoriaValida,
    occurredOn: toISO(resuelta.fecha),
    esFuturo: compareDates(resuelta.fecha, contexto.hoy) > 0,
  }
}

/**
 * De unidades corrientes a la unidad menor de la moneda (RN-002).
 *
 * Se rechaza en lugar de redondear. Si el modelo devuelve `18500.75` para una
 * moneda sin decimales, eso significa que entendió mal —no que haya que
 * aproximar—, y aproximar convertiría un error de comprensión en un dato con
 * apariencia de correcto.
 *
 * La multiplicación ocurre una sola vez, sobre un número que viene del modelo, y
 * su resultado se comprueba entero antes de salir. Ningún cálculo posterior toca
 * coma flotante (Art. I).
 */
export function aUnidadMenor(monto: number, currency: string): number | null {
  if (!Number.isFinite(monto) || monto <= 0) return null

  const factor = 10 ** currencyDecimals(currency)
  const cents = Math.round(monto * factor)

  // `18500.75 * 100` da 1850075 en una moneda de dos decimales y es correcto;
  // en una de cero decimales daría 18500.75 → 18501, que es inventarse céntimos.
  const exacto = Math.abs(monto * factor - cents) < 1e-6
  if (!exacto) return null

  return cents > 0 && Number.isSafeInteger(cents) ? cents : null
}
