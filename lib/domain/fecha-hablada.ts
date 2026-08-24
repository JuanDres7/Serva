import {
  addDays,
  civilDateClamped,
  compareDates,
  fromISO,
  weekdayOf,
  type CivilDate,
} from '@/lib/domain/civil-date'

/**
 * Fechas dichas en voz corriente (spec 010, FR-006).
 *
 * **El modelo no resuelve fechas.** Devuelve lo que oyó —«ayer», «el martes»,
 * «2026-09-07»— y esta función lo resuelve contra el día civil del usuario.
 *
 * No es desconfianza gratuita: es el defecto que ya apareció en este proyecto.
 * La prueba FR-008 calculaba «hoy» en UTC mientras la aplicación lo calculaba en
 * la zona del usuario, y entre las 19:00 de Bogotá y la medianoche son días
 * distintos. Pasaba diecinueve horas al día y fallaba las cinco restantes. Un
 * modelo que resuelva fechas por su cuenta comete ese error de forma silenciosa
 * y permanente, porque no sabe ni qué hora es ni dónde está quien le habla.
 */

export type FechaResuelta =
  | { readonly ok: true; readonly fecha: CivilDate }
  | { readonly ok: false; readonly motivo: 'no-entendida' }

const RELATIVAS: Record<string, number> = {
  hoy: 0,
  ahora: 0,
  'esta noche': 0,
  anoche: -1,
  ayer: -1,
  anteayer: -2,
  'antier': -2,
}

/** Lunes es 1, domingo es 7, como en ISO. */
const DIAS_SEMANA: Record<string, number> = {
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  domingo: 7,
}

const MESES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Lunes = 1, domingo = 7. `weekdayOf` del dominio usa domingo = 0; aquí conviene
 * la convención ISO porque hace que «el próximo martes» sea una resta simple.
 */
function diaIso(fecha: CivilDate): number {
  const dia = weekdayOf(fecha)
  return dia === 0 ? 7 : dia
}

/**
 * Resuelve una expresión de fecha contra el día del usuario.
 *
 * Sin expresión, hoy (FR-004). Lo que no se entienda se dice, no se adivina:
 * inventar una fecha es tan dañino como inventar un monto.
 */
export function resolverFecha(expresion: string | null | undefined, hoy: CivilDate): FechaResuelta {
  if (expresion === null || expresion === undefined || expresion.trim() === '') {
    return { ok: true, fecha: hoy }
  }

  const texto = normalizar(expresion)

  if (texto in RELATIVAS) {
    return { ok: true, fecha: addDays(hoy, RELATIVAS[texto]!) }
  }

  if (ISO.test(texto)) {
    try {
      return { ok: true, fecha: fromISO(texto) }
    } catch {
      return { ok: false, motivo: 'no-entendida' }
    }
  }

  const porDiaDeSemana = resolverDiaDeSemana(texto, hoy)
  if (porDiaDeSemana) return { ok: true, fecha: porDiaDeSemana }

  const porFechaEscrita = resolverFechaEscrita(texto, hoy)
  if (porFechaEscrita) return { ok: true, fecha: porFechaEscrita }

  return { ok: false, motivo: 'no-entendida' }
}

/**
 * «El martes», «el próximo martes», «el martes pasado».
 *
 * Sin más pistas, un día de la semana apunta al **futuro**: quien dice «tengo
 * que pagar el martes» habla de un pago pendiente, no de uno que ya hizo. Para
 * el pasado hay que decirlo —«el martes pasado»—, y entonces se retrocede.
 */
function resolverDiaDeSemana(texto: string, hoy: CivilDate): CivilDate | null {
  const pasado = /\b(pasado|anterior)\b/.test(texto)

  const nombre = Object.keys(DIAS_SEMANA).find((dia) =>
    new RegExp(`\\b${dia}\\b`).test(texto),
  )
  if (!nombre) return null

  const objetivo = DIAS_SEMANA[nombre]!
  const actual = diaIso(hoy)

  if (pasado) {
    // El más reciente que ya pasó. Si hoy es ese día, el de la semana anterior.
    const atras = actual > objetivo ? actual - objetivo : actual - objetivo + 7
    return addDays(hoy, -atras)
  }

  // El próximo que viene. Si hoy es ese día, el de la semana siguiente: nadie
  // dice «el martes» un martes para referirse a hoy.
  const adelante = objetivo > actual ? objetivo - actual : objetivo - actual + 7
  return addDays(hoy, adelante)
}

/**
 * «7 de septiembre», «el 7 de septiembre de 2026», «7/9».
 *
 * Sin año, se elige el que hace la fecha más cercana sin quedar en el pasado
 * lejano: si estamos en diciembre y alguien dice «5 de enero», habla del enero
 * que viene.
 */
function resolverFechaEscrita(texto: string, hoy: CivilDate): CivilDate | null {
  const conMes = texto.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/)
  if (conMes) {
    const dia = Number(conMes[1])
    const mes = MESES[conMes[2]!]
    if (!mes) return null
    const anio = conMes[3] ? Number(conMes[3]) : anioMasProbable(mes, dia, hoy)
    return civilDateClamped(anio, mes, dia)
  }

  const numerica = texto.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/)
  if (numerica) {
    const dia = Number(numerica[1])
    const mes = Number(numerica[2])
    if (mes < 1 || mes > 12) return null
    const anio = numerica[3] ? Number(numerica[3]) : anioMasProbable(mes, dia, hoy)
    return civilDateClamped(anio, mes, dia)
  }

  return null
}

/**
 * Sin año dicho, se toma el de este año salvo que eso deje la fecha más de seis
 * meses atrás: entonces se entiende que hablaba del año que viene.
 */
function anioMasProbable(mes: number, dia: number, hoy: CivilDate): number {
  const esteAnio = civilDateClamped(hoy.year, mes, dia)
  const seisMesesAtras = addDays(hoy, -183)

  return compareDates(esteAnio, seisMesesAtras) < 0 ? hoy.year + 1 : hoy.year
}
