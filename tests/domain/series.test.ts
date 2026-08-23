import { describe, it, expect } from 'vitest'
import { acumularPeriodo, compararRitmo, ritmoRelativo } from '@/lib/domain/series'
import { CALENDAR_MONTH, periodFor } from '@/lib/domain/cycle'
import { fromISO } from '@/lib/domain/civil-date'

const AGOSTO = periodFor(CALENDAR_MONTH, fromISO('2026-08-15'))
const JULIO = periodFor(CALENDAR_MONTH, fromISO('2026-07-15'))
const FEBRERO = periodFor(CALENDAR_MONTH, fromISO('2026-02-15'))

describe('curva acumulada del período', () => {
  it('acumula día a día', () => {
    const serie = acumularPeriodo(
      [
        { dia: '2026-08-01', cents: 10000 },
        { dia: '2026-08-02', cents: 5000 },
        { dia: '2026-08-03', cents: 2000 },
      ],
      AGOSTO,
      fromISO('2026-08-03'),
    )

    expect(serie.map((p) => p.cents)).toEqual([10000, 15000, 17000])
  })

  it('incluye los días sin gasto', () => {
    // Omitirlos haría que la curva saltara y pareciera que se gastó en un día lo
    // de tres.
    const serie = acumularPeriodo(
      [
        { dia: '2026-08-01', cents: 10000 },
        { dia: '2026-08-04', cents: 5000 },
      ],
      AGOSTO,
      fromISO('2026-08-04'),
    )

    expect(serie).toHaveLength(4)
    expect(serie.map((p) => p.cents)).toEqual([10000, 10000, 10000, 15000])
  })

  it('corta el período actual en el día de hoy', () => {
    // Dibujar la línea plana hasta fin de mes haría creer que se dejó de gastar.
    const serie = acumularPeriodo(
      [{ dia: '2026-08-01', cents: 10000 }],
      AGOSTO,
      fromISO('2026-08-10'),
    )

    expect(serie).toHaveLength(10)
    expect(serie.at(-1)?.fecha).toBe('2026-08-10')
  })

  it('un período completo llega hasta su último día', () => {
    const serie = acumularPeriodo([], AGOSTO)
    expect(serie).toHaveLength(31)
    expect(serie.at(-1)?.fecha).toBe('2026-08-31')
  })

  it('febrero tiene 28 días, no 31', () => {
    expect(acumularPeriodo([], FEBRERO)).toHaveLength(28)
  })

  it('un período sin gastos da una curva plana en cero', () => {
    const serie = acumularPeriodo([], AGOSTO, fromISO('2026-08-05'))
    expect(serie.every((p) => p.cents === 0)).toBe(true)
  })
})

describe('comparación de ritmo', () => {
  it('superpone el período actual sobre el anterior', () => {
    const puntos = compararRitmo(
      [{ dia: '2026-08-01', cents: 30000 }],
      [{ dia: '2026-07-01', cents: 10000 }],
      { actual: AGOSTO, anterior: JULIO },
      fromISO('2026-08-02'),
    )

    expect(puntos[0]?.actual).toBe(30000)
    expect(puntos[0]?.anterior).toBe(10000)
  })

  it('compara por número de día, no por fecha', () => {
    // Los períodos pueden tener distinta longitud: febrero y marzo no se pueden
    // emparejar por fecha.
    const puntos = compararRitmo([], [], { actual: FEBRERO, anterior: JULIO }, fromISO('2026-02-10'))
    expect(puntos.map((p) => p.dia).slice(0, 3)).toEqual([1, 2, 3])
  })

  it('el período actual deja de tener valores donde aún no ha llegado', () => {
    const puntos = compararRitmo(
      [],
      [],
      { actual: AGOSTO, anterior: JULIO },
      fromISO('2026-08-05'),
    )

    expect(puntos[4]?.actual).not.toBeNull()
    expect(puntos[10]?.actual).toBeNull()
    // El anterior sí está completo, que es con lo que se compara.
    expect(puntos[10]?.anterior).not.toBeNull()
  })

  it('detecta que se va más rápido que el período anterior', () => {
    const puntos = compararRitmo(
      [{ dia: '2026-08-01', cents: 50000 }],
      [{ dia: '2026-07-01', cents: 25000 }],
      { actual: AGOSTO, anterior: JULIO },
      fromISO('2026-08-01'),
    )

    const ritmo = ritmoRelativo(puntos)
    expect(ritmo?.diferencia).toBe(25000)
    expect(ritmo?.porcentaje).toBe(100)
  })

  it('detecta que se va más despacio', () => {
    const puntos = compararRitmo(
      [{ dia: '2026-08-01', cents: 10000 }],
      [{ dia: '2026-07-01', cents: 40000 }],
      { actual: AGOSTO, anterior: JULIO },
      fromISO('2026-08-01'),
    )

    expect(ritmoRelativo(puntos)?.porcentaje).toBe(-75)
  })

  it('no inventa un porcentaje si el período anterior fue cero', () => {
    const puntos = compararRitmo(
      [{ dia: '2026-08-01', cents: 10000 }],
      [],
      { actual: AGOSTO, anterior: JULIO },
      fromISO('2026-08-01'),
    )

    expect(ritmoRelativo(puntos)?.porcentaje).toBeNull()
  })
})
