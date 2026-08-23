import { describe, it, expect } from 'vitest'
import {
  proximaFecha,
  primeraFecha,
  estaVencido,
  diasDeRetraso,
  describirPeriodicidad,
  validarPeriodicidad,
  RecurrenceError,
  type Periodicidad,
} from '@/lib/domain/recurrence'
import { fromISO, toISO } from '@/lib/domain/civil-date'

const mensual = (day: number): Periodicidad => ({ kind: 'monthly', day })
const cadaNDias = (n: number): Periodicidad => ({ kind: 'every-n-days', n })

describe('próxima fecha de cobro', () => {
  it('avanza de mes conservando el día', () => {
    expect(toISO(proximaFecha(mensual(5), fromISO('2026-08-05')))).toBe('2026-09-05')
  })

  it('usa el último día del mes cuando el configurado no existe', () => {
    expect(toISO(proximaFecha(mensual(31), fromISO('2026-01-31')))).toBe('2026-02-28')
    expect(toISO(proximaFecha(mensual(30), fromISO('2024-01-30')))).toBe('2024-02-29')
  })

  it('recupera el día configurado después de un mes corto', () => {
    // Lo que distingue avanzar por meses de contar días: tras caer en el 28 de
    // febrero, marzo vuelve al 31.
    const febrero = proximaFecha(mensual(31), fromISO('2026-01-31'))
    expect(toISO(proximaFecha(mensual(31), febrero))).toBe('2026-03-31')
  })

  it('un cobro mensual no se desfasa en un año entero', () => {
    // El error que esta función evita: contar 30 días desplazaría el cobro casi
    // una semana en doce meses, y la aplicación preguntaría el día equivocado.
    let fecha = fromISO('2026-01-05')
    for (let mes = 0; mes < 12; mes += 1) {
      fecha = proximaFecha(mensual(5), fecha)
      expect(fecha.day).toBe(5)
    }
    expect(toISO(fecha)).toBe('2027-01-05')
  })

  it('cruza el cambio de año', () => {
    expect(toISO(proximaFecha(mensual(15), fromISO('2026-12-15')))).toBe('2027-01-15')
  })

  it('cada N días suma exactamente esos días', () => {
    expect(toISO(proximaFecha(cadaNDias(14), fromISO('2026-08-01')))).toBe('2026-08-15')
    expect(toISO(proximaFecha(cadaNDias(7), fromISO('2026-08-28')))).toBe('2026-09-04')
  })

  it('el día configurado manda, no el día en que se confirmó', () => {
    // Si un cobro del 5 se confirma tarde, el siguiente vuelve al 5.
    expect(toISO(proximaFecha(mensual(5), fromISO('2026-08-09')))).toBe('2026-09-05')
  })
})

describe('primera fecha de un recurrente nuevo', () => {
  it('si el día de este mes aún no pasó, cobra este mes', () => {
    expect(toISO(primeraFecha(mensual(20), fromISO('2026-08-10')))).toBe('2026-08-20')
  })

  it('si el día ya pasó, cobra el mes siguiente', () => {
    expect(toISO(primeraFecha(mensual(5), fromISO('2026-08-10')))).toBe('2026-09-05')
  })

  it('si el día es hoy, cobra el mes siguiente', () => {
    // Se asume que el cobro de hoy ya ocurrió: pedir confirmación de algo que se
    // acaba de definir sería confuso.
    expect(toISO(primeraFecha(mensual(10), fromISO('2026-08-10')))).toBe('2026-09-10')
  })

  it('en un mes corto ajusta al último día', () => {
    expect(toISO(primeraFecha(mensual(31), fromISO('2026-02-01')))).toBe('2026-02-28')
  })
})

describe('vencimiento', () => {
  it('un cobro de hoy está vencido', () => {
    expect(estaVencido(fromISO('2026-08-23'), fromISO('2026-08-23'))).toBe(true)
  })

  it('un cobro futuro no lo está', () => {
    expect(estaVencido(fromISO('2026-08-30'), fromISO('2026-08-23'))).toBe(false)
  })

  it('cuenta los días de retraso', () => {
    expect(diasDeRetraso(fromISO('2026-08-20'), fromISO('2026-08-23'))).toBe(3)
    expect(diasDeRetraso(fromISO('2026-08-30'), fromISO('2026-08-23'))).toBe(0)
  })
})

describe('validación y descripción', () => {
  it('rechaza días imposibles', () => {
    expect(() => validarPeriodicidad(mensual(0))).toThrow(RecurrenceError)
    expect(() => validarPeriodicidad(mensual(32))).toThrow(RecurrenceError)
    expect(() => validarPeriodicidad(cadaNDias(0))).toThrow(RecurrenceError)
  })

  it('describe la periodicidad en palabras', () => {
    expect(describirPeriodicidad(mensual(5))).toBe('El 5 de cada mes')
    expect(describirPeriodicidad(cadaNDias(7))).toBe('Cada semana')
    expect(describirPeriodicidad(cadaNDias(14))).toBe('Cada dos semanas')
    expect(describirPeriodicidad(cadaNDias(10))).toBe('Cada 10 días')
  })
})
