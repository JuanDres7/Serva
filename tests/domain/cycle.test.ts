import { describe, it, expect } from 'vitest'
import {
  civilDate,
  civilDateClamped,
  fromISO,
  toISO,
  lastDayOfMonth,
  addDays,
  daysBetween,
  weekdayOf,
  todayIn,
  CivilDateError,
} from '@/lib/domain/civil-date'
import {
  type CycleConfig,
  type Period,
  CALENDAR_MONTH,
  periodFor,
  nextPeriod,
  previousPeriod,
  containsDate,
  periodLengthInDays,
  validateCycle,
  CycleError,
} from '@/lib/domain/cycle'

const iso = (p: Period) => [toISO(p.start), toISO(p.end)]

describe('fechas civiles', () => {
  it('conoce la longitud de cada mes, incluidos los bisiestos', () => {
    expect(lastDayOfMonth(2026, 2)).toBe(28)
    expect(lastDayOfMonth(2024, 2)).toBe(29) // bisiesto
    expect(lastDayOfMonth(2026, 4)).toBe(30)
    expect(lastDayOfMonth(2026, 1)).toBe(31)
  })

  it('rechaza días que no existen', () => {
    expect(() => civilDate(2026, 2, 30)).toThrow(CivilDateError)
    expect(() => civilDate(2026, 13, 1)).toThrow(CivilDateError)
  })

  it('ajusta al último día del mes cuando el día no existe', () => {
    expect(toISO(civilDateClamped(2026, 2, 31))).toBe('2026-02-28')
    expect(toISO(civilDateClamped(2024, 2, 30))).toBe('2024-02-29')
    expect(toISO(civilDateClamped(2026, 4, 31))).toBe('2026-04-30')
  })

  it('normaliza meses fuera de rango al cambiar de año', () => {
    expect(toISO(civilDateClamped(2026, 13, 5))).toBe('2027-01-05')
    expect(toISO(civilDateClamped(2026, 0, 5))).toBe('2025-12-05')
  })

  it('suma días cruzando meses y años', () => {
    expect(toISO(addDays(fromISO('2026-08-31'), 1))).toBe('2026-09-01')
    expect(toISO(addDays(fromISO('2026-12-31'), 1))).toBe('2027-01-01')
    expect(toISO(addDays(fromISO('2024-02-28'), 1))).toBe('2024-02-29')
    expect(toISO(addDays(fromISO('2026-01-01'), -1))).toBe('2025-12-31')
  })

  it('cuenta días entre fechas', () => {
    expect(daysBetween(fromISO('2026-01-01'), fromISO('2026-01-31'))).toBe(30)
    expect(daysBetween(fromISO('2026-01-31'), fromISO('2026-01-01'))).toBe(-30)
  })

  it('no se desplaza por horario de verano', () => {
    // En zonas con cambio de hora, un día "dura" 23 o 25 horas. La aritmética en
    // días civiles debe ignorarlo por completo.
    const antes = fromISO('2026-03-28')
    expect(toISO(addDays(antes, 1))).toBe('2026-03-29')
    expect(toISO(addDays(antes, 2))).toBe('2026-03-30')
  })

  it('conoce el día de la semana', () => {
    expect(weekdayOf(fromISO('2026-08-22'))).toBe(6) // sábado
    expect(weekdayOf(fromISO('2026-08-23'))).toBe(0) // domingo
  })

  it('obtiene la fecha de hoy en una zona horaria concreta', () => {
    // Instante en que Bogotá y Tokio están en días distintos.
    const instante = new Date('2026-08-22T23:00:00-05:00')
    expect(toISO(todayIn('America/Bogota', instante))).toBe('2026-08-22')
    expect(toISO(todayIn('Asia/Tokyo', instante))).toBe('2026-08-23')
  })
})

describe('ciclo de mes calendario', () => {
  it('abarca el mes completo', () => {
    expect(iso(periodFor(CALENDAR_MONTH, fromISO('2026-08-15')))).toEqual([
      '2026-08-01',
      '2026-08-31',
    ])
  })

  it('funciona en meses de 28, 29, 30 y 31 días', () => {
    expect(iso(periodFor(CALENDAR_MONTH, fromISO('2026-02-10')))[1]).toBe('2026-02-28')
    expect(iso(periodFor(CALENDAR_MONTH, fromISO('2024-02-10')))[1]).toBe('2024-02-29')
    expect(iso(periodFor(CALENDAR_MONTH, fromISO('2026-04-10')))[1]).toBe('2026-04-30')
    expect(iso(periodFor(CALENDAR_MONTH, fromISO('2026-01-10')))[1]).toBe('2026-01-31')
  })

  it('navega hacia atrás y hacia adelante', () => {
    const agosto = periodFor(CALENDAR_MONTH, fromISO('2026-08-15'))
    expect(iso(nextPeriod(CALENDAR_MONTH, agosto))).toEqual(['2026-09-01', '2026-09-30'])
    expect(iso(previousPeriod(CALENDAR_MONTH, agosto))).toEqual([
      '2026-07-01',
      '2026-07-31',
    ])
  })

  it('cruza el cambio de año', () => {
    const diciembre = periodFor(CALENDAR_MONTH, fromISO('2026-12-15'))
    expect(iso(nextPeriod(CALENDAR_MONTH, diciembre))).toEqual([
      '2027-01-01',
      '2027-01-31',
    ])
  })
})

describe('ciclo mensual por día', () => {
  const dia15: CycleConfig = { kind: 'monthly', day: 15 }
  const dia31: CycleConfig = { kind: 'monthly', day: 31 }

  it('empieza el día configurado', () => {
    expect(iso(periodFor(dia15, fromISO('2026-08-20')))).toEqual([
      '2026-08-15',
      '2026-09-14',
    ])
  })

  it('sitúa en el período anterior las fechas previas al día del ciclo', () => {
    expect(iso(periodFor(dia15, fromISO('2026-08-10')))).toEqual([
      '2026-07-15',
      '2026-08-14',
    ])
  })

  it('usa el último día del mes cuando el configurado no existe', () => {
    // El día 31 en febrero pasa a ser el 28.
    expect(iso(periodFor(dia31, fromISO('2026-03-01')))).toEqual([
      '2026-02-28',
      '2026-03-30',
    ])
  })

  it('recupera el día configurado tras un mes corto', () => {
    const febrero = periodFor(dia31, fromISO('2026-03-01'))
    const siguiente = nextPeriod(dia31, febrero)
    expect(toISO(siguiente.start)).toBe('2026-03-31')
  })
})

describe('ciclo de dos veces al mes', () => {
  const quincenal: CycleConfig = { kind: 'semi-monthly', days: [15, 30] }
  const cincoYVeinte: CycleConfig = { kind: 'semi-monthly', days: [5, 20] }

  it('parte el mes en dos períodos', () => {
    expect(iso(periodFor(quincenal, fromISO('2026-08-18')))).toEqual([
      '2026-08-15',
      '2026-08-29',
    ])
    expect(iso(periodFor(quincenal, fromISO('2026-08-31')))).toEqual([
      '2026-08-30',
      '2026-09-14',
    ])
  })

  it('admite cualquier par de días', () => {
    expect(iso(periodFor(cincoYVeinte, fromISO('2026-08-10')))).toEqual([
      '2026-08-05',
      '2026-08-19',
    ])
  })

  it('sitúa en el mes anterior las fechas previas al primer día', () => {
    expect(iso(periodFor(quincenal, fromISO('2026-08-03')))).toEqual([
      '2026-07-30',
      '2026-08-14',
    ])
  })

  it('ajusta en febrero, donde el día 30 no existe', () => {
    expect(iso(periodFor(quincenal, fromISO('2026-02-27')))).toEqual([
      '2026-02-15',
      '2026-02-27',
    ])
  })

  it('rechaza días iguales o en orden inverso', () => {
    expect(() => validateCycle({ kind: 'semi-monthly', days: [30, 15] })).toThrow(
      CycleError,
    )
    expect(() => validateCycle({ kind: 'semi-monthly', days: [15, 15] })).toThrow(
      CycleError,
    )
  })
})

describe('ciclo semanal', () => {
  const lunes: CycleConfig = { kind: 'weekly', weekday: 1 }

  it('dura siete días y empieza el día indicado', () => {
    const periodo = periodFor(lunes, fromISO('2026-08-22')) // sábado
    expect(iso(periodo)).toEqual(['2026-08-17', '2026-08-23'])
    expect(periodLengthInDays(periodo)).toBe(7)
  })

  it('el propio día de inicio pertenece a su período', () => {
    expect(iso(periodFor(lunes, fromISO('2026-08-17')))).toEqual([
      '2026-08-17',
      '2026-08-23',
    ])
  })
})

describe('ciclo de cada N días', () => {
  const cada14: CycleConfig = {
    kind: 'every-n-days',
    n: 14,
    anchor: civilDate(2026, 1, 1),
  }

  it('cuenta desde la fecha de referencia', () => {
    expect(iso(periodFor(cada14, fromISO('2026-01-01')))).toEqual([
      '2026-01-01',
      '2026-01-14',
    ])
    expect(iso(periodFor(cada14, fromISO('2026-01-20')))).toEqual([
      '2026-01-15',
      '2026-01-28',
    ])
  })

  it('funciona con fechas anteriores a la referencia', () => {
    expect(iso(periodFor(cada14, fromISO('2025-12-25')))).toEqual([
      '2025-12-18',
      '2025-12-31',
    ])
  })

  it('no se desfasa: catorce días son siempre catorce días', () => {
    let periodo = periodFor(cada14, fromISO('2026-01-01'))
    for (let i = 0; i < 26; i += 1) {
      expect(periodLengthInDays(periodo)).toBe(14)
      periodo = nextPeriod(cada14, periodo)
    }
  })
})

describe('propiedades que todo ciclo debe cumplir', () => {
  const ciclos: readonly [string, CycleConfig][] = [
    ['mes calendario', CALENDAR_MONTH],
    ['mensual día 15', { kind: 'monthly', day: 15 }],
    ['mensual día 31', { kind: 'monthly', day: 31 }],
    ['dos veces al mes 15 y 30', { kind: 'semi-monthly', days: [15, 30] }],
    ['dos veces al mes 5 y 20', { kind: 'semi-monthly', days: [5, 20] }],
    ['dos veces al mes 10 y 25', { kind: 'semi-monthly', days: [10, 25] }],
    ['semanal', { kind: 'weekly', weekday: 1 }],
    ['cada 14 días', { kind: 'every-n-days', n: 14, anchor: civilDate(2026, 1, 1) }],
  ]

  it.each(ciclos)('%s: períodos contiguos, sin solapes ni huecos', (_nombre, config) => {
    let periodo = periodFor(config, fromISO('2026-01-10'))
    for (let i = 0; i < 30; i += 1) {
      const siguiente = nextPeriod(config, periodo)
      // El siguiente empieza justo al día siguiente del anterior: ni antes
      // (solape) ni después (hueco).
      expect(daysBetween(periodo.end, siguiente.start)).toBe(1)
      periodo = siguiente
    }
  })

  it.each(ciclos)('%s: el fin nunca precede al inicio', (_nombre, config) => {
    let periodo = periodFor(config, fromISO('2026-01-10'))
    for (let i = 0; i < 30; i += 1) {
      expect(periodLengthInDays(periodo)).toBeGreaterThan(0)
      periodo = nextPeriod(config, periodo)
    }
  })

  it.each(ciclos)('%s: cada fecha cae en su propio período', (_nombre, config) => {
    for (const fecha of ['2026-01-01', '2026-02-28', '2026-06-15', '2026-12-31']) {
      const date = fromISO(fecha)
      expect(containsDate(periodFor(config, date), date)).toBe(true)
    }
  })

  it.each(ciclos)('%s: ir y volver devuelve al mismo período', (_nombre, config) => {
    const periodo = periodFor(config, fromISO('2026-06-15'))
    const ida = nextPeriod(config, periodo)
    const vuelta = previousPeriod(config, ida)
    expect(iso(vuelta)).toEqual(iso(periodo))
  })
})
