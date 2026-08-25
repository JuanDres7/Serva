import { describe, it, expect } from 'vitest'
import {
  saldoDe,
  abonadoDe,
  estaSaldada,
  porcentajePagado,
  puedeAbonar,
  explicarRechazo,
  diasParaVencer,
  estadoDeVencimiento,
  describirVencimiento,
  resumenDeDeudas,
  DIAS_DE_AVISO,
  type Deuda,
  type Abono,
} from '@/lib/domain/deudas'
import { civilDate } from '@/lib/domain/civil-date'
import { formatMoney } from '@/lib/domain/money-format'

/**
 * Deudas: el dominio puro (spec 011, fase 1).
 *
 * Sin base de datos, sin red, sin modelo. Lo que se protege aquí es que el
 * saldo derivado siempre cuadre con los abonos, y que un abono no pueda dejar
 * la cuenta en un estado imposible.
 */

const COP = 'COP'
const HOY = civilDate(2026, 8, 24)

const deuda = (parcial: Partial<Deuda> = {}): Deuda => ({
  direccion: 'owed_by_me',
  originalCents: 50000000, // 500.000
  currency: COP,
  dueOn: null,
  settledAt: null,
  ...parcial,
})

const abono = (cents: number): Abono => ({ amountCents: cents })

describe('T-501 — el saldo se deriva, no se guarda', () => {
  it('sin abonos, el saldo es el original', () => {
    expect(saldoDe(deuda(), []).cents).toBe(50000000)
  })

  it('500.000 con abonos de 200.000 y 100.000 deja 200.000', () => {
    const saldo = saldoDe(deuda(), [abono(20000000), abono(10000000)])
    expect(saldo.cents).toBe(20000000)
  })

  it('nunca baja de cero, aunque los abonos sumen de más', () => {
    // Un saldo negativo no significa nada: nadie te debe por haber pagado de
    // más. Dejarlo aparecer contaminaría los totales.
    expect(saldoDe(deuda(), [abono(60000000)]).cents).toBe(0)
  })

  it('lo abonado sí refleja lo que se pagó de verdad', () => {
    expect(abonadoDe(deuda(), [abono(20000000), abono(10000000)]).cents).toBe(30000000)
  })
})

describe('T-505 — todo son enteros (Art. I)', () => {
  it('ningún cálculo produce coma flotante', () => {
    const casos = [
      [50000000, [33333333]],
      [10000000, [3333333, 3333333]],
      [1, [1]],
    ] as const

    for (const [original, pagos] of casos) {
      const d = deuda({ originalCents: original })
      const abonos = pagos.map(abono)
      expect(Number.isInteger(saldoDe(d, abonos).cents)).toBe(true)
      expect(Number.isInteger(abonadoDe(d, abonos).cents)).toBe(true)
    }
  })

  it('el porcentaje es entero y nunca pasa de 100', () => {
    expect(porcentajePagado(deuda(), [abono(25000000)])).toBe(50)
    expect(porcentajePagado(deuda(), [abono(99000000)])).toBe(100)
    expect(Number.isInteger(porcentajePagado(deuda(), [abono(33333333)]))).toBe(true)
  })
})

describe('T-502 — abonar', () => {
  it('un abono que cabe se acepta y dice qué queda', () => {
    const r = puedeAbonar(deuda(), [], 20000000)
    expect(r.ok).toBe(true)
    expect(r.ok && r.saldoResultante.cents).toBe(30000000)
    expect(r.ok && r.salda).toBe(false)
  })

  it('el abono que cubre el saldo exacto la salda', () => {
    const r = puedeAbonar(deuda(), [abono(30000000)], 20000000)
    expect(r.ok && r.salda).toBe(true)
    expect(r.ok && r.saldoResultante.cents).toBe(0)
  })

  it('FR-004 — un abono de más se rechaza diciendo cuánto queda de verdad', () => {
    const r = puedeAbonar(deuda(), [abono(30000000)], 30000000)

    expect(r.ok).toBe(false)
    expect(!r.ok && r.motivo).toBe('excede-el-saldo')
    expect(!r.ok && r.saldoActual.cents).toBe(20000000)
  })

  it('y lo dice en palabras, no con una excepción', () => {
    const r = puedeAbonar(deuda(), [abono(30000000)], 30000000)
    const mensaje = explicarRechazo(r, (m) => formatMoney(m, 'es-CO'))

    expect(mensaje).toContain('200.000')
    expect(mensaje.length).toBeGreaterThan(0)
  })

  it('cero, negativo y fraccionario se rechazan', () => {
    for (const monto of [0, -100, 1.5, Number.NaN]) {
      const r = puedeAbonar(deuda(), [], monto)
      expect(!r.ok && r.motivo).toBe('monto-invalido')
    }
  })

  it('no se puede abonar a una ya saldada', () => {
    const r = puedeAbonar(deuda(), [abono(50000000)], 100)
    expect(!r.ok && r.motivo).toBe('ya-saldada')
  })

  it('nunca lanza: siempre devuelve un resultado', () => {
    for (const monto of [0, -1, 1e20, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => puedeAbonar(deuda(), [], monto)).not.toThrow()
    }
  })
})

describe('FR-005 — el último abono la salda solo', () => {
  it('sin marca de tiempo, un saldo en cero ya cuenta como saldada', () => {
    expect(estaSaldada(deuda(), [abono(50000000)])).toBe(true)
  })

  it('con marca de tiempo, aunque quede saldo', () => {
    // Se puede dar por saldada una deuda que la otra persona perdonó.
    expect(estaSaldada(deuda({ settledAt: new Date() }), [])).toBe(true)
  })

  it('pendiente mientras quede algo y no se haya marcado', () => {
    expect(estaSaldada(deuda(), [abono(10000000)])).toBe(false)
  })
})

describe('T-503 — el vencimiento', () => {
  const conFecha = (iso: string | null, extra: Partial<Deuda> = {}) =>
    deuda({ dueOn: iso, ...extra })

  it('sin fecha pactada no hay cuenta atrás', () => {
    expect(diasParaVencer(conFecha(null), HOY)).toBeNull()
    expect(estadoDeVencimiento(conFecha(null), [], HOY)).toBe('sin-fecha')
  })

  it('cuenta los días que faltan', () => {
    expect(diasParaVencer(conFecha('2026-08-27'), HOY)).toBe(3)
    expect(diasParaVencer(conFecha('2026-08-17'), HOY)).toBe(-7)
  })

  it(`«cerca» son ${DIAS_DE_AVISO} días o menos`, () => {
    expect(estadoDeVencimiento(conFecha('2026-08-27'), [], HOY)).toBe('cerca')
    expect(estadoDeVencimiento(conFecha('2026-08-24'), [], HOY)).toBe('cerca')
    expect(estadoDeVencimiento(conFecha('2026-08-28'), [], HOY)).toBe('al-dia')
  })

  it('vencida cuando la fecha ya pasó', () => {
    expect(estadoDeVencimiento(conFecha('2026-08-17'), [], HOY)).toBe('vencida')
  })

  it('una saldada nunca está vencida, aunque su fecha pasara (D-024)', () => {
    // Pagar tarde sigue siendo pagar. Marcarla en rojo para siempre sería
    // regañar por algo ya resuelto.
    const pagadaTarde = conFecha('2026-08-17')
    expect(estadoDeVencimiento(pagadaTarde, [abono(50000000)], HOY)).toBe('saldada')
  })
})

describe('D-024 — el aviso informa, no regaña', () => {
  const frase = (iso: string | null, abonos: Abono[] = []) =>
    describirVencimiento(deuda({ dueOn: iso }), abonos, HOY)

  it('cuenta los días sin reprochar', () => {
    expect(frase('2026-08-17')).toBe('Lleva 7 días vencida')
    expect(frase('2026-08-23')).toBe('Lleva 1 día vencida')
    expect(frase('2026-08-24')).toBe('Vence hoy')
    expect(frase('2026-08-25')).toBe('Vence mañana')
    expect(frase('2026-08-27')).toBe('Vence en 3 días')
  })

  it('ninguna frase culpa a nadie', () => {
    const frases = [
      frase('2026-08-17'),
      frase('2026-08-24'),
      frase('2026-08-30'),
      frase(null),
      frase('2026-08-17', [abono(50000000)]),
    ]

    for (const f of frases) {
      expect(f).not.toMatch(/retras|debiste|deberías|tarde|olvidaste|incumpl/i)
    }
  })
})

describe('T-504 — el resumen por dirección (FR-009)', () => {
  const con = (deudas: { d: Deuda; a: Abono[] }[]) =>
    resumenDeDeudas(
      deudas.map(({ d, a }) => ({ deuda: d, abonos: a })),
      COP,
    )

  it('separa lo que debo de lo que me deben', () => {
    const r = con([
      { d: deuda({ originalCents: 50000000 }), a: [] },
      { d: deuda({ direccion: 'owed_to_me', originalCents: 8000000 }), a: [] },
    ])

    expect(r.debo.cents).toBe(50000000)
    expect(r.meDeben.cents).toBe(8000000)
    expect(r.cuantasDebo).toBe(1)
    expect(r.cuantasMeDeben).toBe(1)
  })

  it('no los resta entre sí', () => {
    // Deber 500.000 y que te deban 500.000 no es no deber nada: son dos
    // obligaciones distintas con dos personas distintas.
    const r = con([
      { d: deuda({ originalCents: 50000000 }), a: [] },
      { d: deuda({ direccion: 'owed_to_me', originalCents: 50000000 }), a: [] },
    ])

    expect(r.debo.cents).toBe(50000000)
    expect(r.meDeben.cents).toBe(50000000)
  })

  it('descuenta los abonos', () => {
    const r = con([{ d: deuda(), a: [abono(20000000)] }])
    expect(r.debo.cents).toBe(30000000)
  })

  it('las saldadas no cuentan', () => {
    const r = con([
      { d: deuda(), a: [abono(50000000)] },
      { d: deuda({ settledAt: new Date() }), a: [] },
    ])

    expect(r.debo.cents).toBe(0)
    expect(r.cuantasDebo).toBe(0)
  })

  it('sin deudas, dos ceros y no un error', () => {
    const r = con([])
    expect(r.debo.cents).toBe(0)
    expect(r.meDeben.cents).toBe(0)
  })
})

describe('el dominio es puro', () => {
  it('la misma entrada da siempre la misma salida', () => {
    const d = deuda()
    const abonos = [abono(10000000)]
    const primero = saldoDe(d, abonos).cents

    for (let i = 0; i < 50; i++) {
      expect(saldoDe(d, abonos).cents).toBe(primero)
    }
  })

  it('no modifica lo que recibe', () => {
    const abonos = [abono(10000000)]
    const copia = [...abonos]
    saldoDe(deuda(), abonos)
    resumenDeDeudas([{ deuda: deuda(), abonos }], COP)

    expect(abonos).toEqual(copia)
  })
})
