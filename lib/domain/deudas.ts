import { money, sum, subtract, zero, isZero, type Money } from '@/lib/domain/money'
import { daysBetween, fromISO, type CivilDate } from '@/lib/domain/civil-date'

/**
 * Deudas y préstamos (spec 011).
 *
 * **El saldo no se guarda: se deriva.** Monto original menos la suma de sus
 * abonos, calculado cada vez. Es la misma regla que gobierna los balances del
 * usuario —se derivan del historial— y evita el fallo clásico de un contador
 * que se desincroniza de los hechos que lo alimentan.
 *
 * Puro: sin base de datos, sin red, sin modelo.
 */

/** Quién le debe a quién. */
export type DireccionDeuda = 'owed_by_me' | 'owed_to_me'

/** Lo mínimo que hace falta para calcular. No es la fila entera de la base. */
export type Deuda = {
  readonly direccion: DireccionDeuda
  readonly originalCents: number
  readonly currency: string
  /** Fecha civil en ISO, o `null` si no se pactó ninguna. */
  readonly dueOn: string | null
  readonly settledAt: Date | null
}

export type Abono = {
  readonly amountCents: number
}

/**
 * Cuánto queda por pagar.
 *
 * Nunca baja de cero. Un saldo negativo no significa nada —no te deben por
 * haber pagado de más— y dejarlo aparecer contaminaría los totales del §9.
 */
export function saldoDe(deuda: Deuda, abonos: readonly Abono[]): Money {
  const original = money(deuda.originalCents, deuda.currency)
  const pagado = sum(
    abonos.map((abono) => money(abono.amountCents, deuda.currency)),
    deuda.currency,
  )

  const restante = subtract(original, pagado)
  return restante.cents > 0 ? restante : zero(deuda.currency)
}

/** Cuánto se ha pagado ya. */
export function abonadoDe(deuda: Deuda, abonos: readonly Abono[]): Money {
  return sum(
    abonos.map((abono) => money(abono.amountCents, deuda.currency)),
    deuda.currency,
  )
}

/**
 * Está saldada si lo dice su marca de tiempo o si ya no queda saldo.
 *
 * Las dos condiciones, y no solo la marca: el último abono la salda sin que
 * nadie tenga que acordarse de marcarla (FR-005).
 */
export function estaSaldada(deuda: Deuda, abonos: readonly Abono[]): boolean {
  return deuda.settledAt !== null || isZero(saldoDe(deuda, abonos))
}

/** Cuánto se ha cubierto, de 0 a 100. Para la barra de progreso. */
export function porcentajePagado(deuda: Deuda, abonos: readonly Abono[]): number {
  if (deuda.originalCents <= 0) return 100
  const pagado = abonadoDe(deuda, abonos).cents
  return Math.min(100, Math.round((pagado / deuda.originalCents) * 100))
}

export type ResultadoAbono =
  | { readonly ok: true; readonly saldoResultante: Money; readonly salda: boolean }
  | { readonly ok: false; readonly motivo: MotivoRechazo; readonly saldoActual: Money }

export type MotivoRechazo = 'monto-invalido' | 'excede-el-saldo' | 'ya-saldada'

/**
 * ¿Cabe este abono?
 *
 * Devuelve un resultado en lugar de lanzar. Abonar de más es un caso esperado
 * —la persona no lleva la cuenta exacta— y quien lo intente tiene que poder leer
 * cuánto queda realmente, no encontrarse un error (FR-004).
 */
export function puedeAbonar(
  deuda: Deuda,
  abonos: readonly Abono[],
  montoCents: number,
): ResultadoAbono {
  const saldoActual = saldoDe(deuda, abonos)

  if (!Number.isInteger(montoCents) || montoCents <= 0) {
    return { ok: false, motivo: 'monto-invalido', saldoActual }
  }

  if (estaSaldada(deuda, abonos)) {
    return { ok: false, motivo: 'ya-saldada', saldoActual }
  }

  if (montoCents > saldoActual.cents) {
    return { ok: false, motivo: 'excede-el-saldo', saldoActual }
  }

  const saldoResultante = money(saldoActual.cents - montoCents, deuda.currency)
  return { ok: true, saldoResultante, salda: saldoResultante.cents === 0 }
}

/** Lo que se le dice al usuario cuando el abono no cabe. */
export function explicarRechazo(resultado: ResultadoAbono, formatear: (m: Money) => string): string {
  if (resultado.ok) return ''

  switch (resultado.motivo) {
    case 'monto-invalido':
      return 'El abono tiene que ser mayor que cero.'
    case 'ya-saldada':
      return 'Esta deuda ya está saldada.'
    case 'excede-el-saldo':
      return `Solo quedan ${formatear(resultado.saldoActual)} por pagar.`
  }
}

/**
 * Días que faltan para el vencimiento. Negativo si ya pasó, `null` si no hay
 * fecha pactada.
 */
export function diasParaVencer(deuda: Deuda, hoy: CivilDate): number | null {
  if (!deuda.dueOn) return null
  return daysBetween(hoy, fromISO(deuda.dueOn))
}

export type EstadoDeVencimiento = 'saldada' | 'sin-fecha' | 'al-dia' | 'cerca' | 'vencida'

/** A partir de cuántos días se considera que el vencimiento «se acerca». */
export const DIAS_DE_AVISO = 3

/**
 * En qué situación está una deuda.
 *
 * Una saldada nunca está vencida, aunque su fecha pasara: pagarla tarde sigue
 * siendo pagarla, y marcarla en rojo para siempre sería regañar por algo ya
 * resuelto (D-024).
 */
export function estadoDeVencimiento(
  deuda: Deuda,
  abonos: readonly Abono[],
  hoy: CivilDate,
): EstadoDeVencimiento {
  if (estaSaldada(deuda, abonos)) return 'saldada'

  const dias = diasParaVencer(deuda, hoy)
  if (dias === null) return 'sin-fecha'
  if (dias < 0) return 'vencida'
  if (dias <= DIAS_DE_AVISO) return 'cerca'
  return 'al-dia'
}

/**
 * Cómo se cuenta el vencimiento, en palabras.
 *
 * Informa, no regaña (D-024). «Lleva 7 días vencida» dice lo mismo que «te
 * retrasaste una semana» sin convertir un dato en un reproche.
 */
export function describirVencimiento(
  deuda: Deuda,
  abonos: readonly Abono[],
  hoy: CivilDate,
): string {
  const estado = estadoDeVencimiento(deuda, abonos, hoy)
  const dias = diasParaVencer(deuda, hoy)

  switch (estado) {
    case 'saldada':
      return 'Saldada'
    case 'sin-fecha':
      return 'Sin fecha pactada'
    case 'vencida': {
      const pasados = Math.abs(dias!)
      return pasados === 1 ? 'Lleva 1 día vencida' : `Lleva ${pasados} días vencida`
    }
    case 'cerca':
      if (dias === 0) return 'Vence hoy'
      return dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`
    case 'al-dia':
      return `Vence en ${dias} días`
  }
}

export type ResumenDeDeudas = {
  readonly debo: Money
  readonly meDeben: Money
  readonly cuantasDebo: number
  readonly cuantasMeDeben: number
}

/**
 * Lo que se muestra arriba de la pantalla (FR-009).
 *
 * Los dos totales no se restan entre sí. Deber 500.000 y que te deban 500.000 no
 * es lo mismo que no deber nada: son dos obligaciones distintas con dos personas
 * distintas, y compensarlas escondería las dos.
 */
export function resumenDeDeudas(
  deudas: readonly { deuda: Deuda; abonos: readonly Abono[] }[],
  currency: string,
): ResumenDeDeudas {
  const pendientes = deudas.filter(({ deuda, abonos }) => !estaSaldada(deuda, abonos))

  const porDireccion = (direccion: DireccionDeuda) =>
    pendientes.filter(({ deuda }) => deuda.direccion === direccion)

  const totalDe = (grupo: typeof pendientes) =>
    sum(
      grupo.map(({ deuda, abonos }) => saldoDe(deuda, abonos)),
      currency,
    )

  const mias = porDireccion('owed_by_me')
  const ajenas = porDireccion('owed_to_me')

  return {
    debo: totalDe(mias),
    meDeben: totalDe(ajenas),
    cuantasDebo: mias.length,
    cuantasMeDeben: ajenas.length,
  }
}
