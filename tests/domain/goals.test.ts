import { describe, it, expect } from 'vitest'
import {
  calcularEstado,
  ritmoDiario,
  fechaEstimada,
  aporteNecesario,
  mensajeDeProgreso,
  type Aporte,
} from '@/lib/domain/goals'
import { fromISO, toISO } from '@/lib/domain/civil-date'

const HOY = fromISO('2026-08-23')

describe('progreso de una meta', () => {
  it('calcula porcentaje y lo que falta', () => {
    const estado = calcularEstado(120000000, 600000000)
    expect(estado.porcentaje).toBe(20)
    expect(estado.faltaCents).toBe(480000000)
    expect(estado.alcanzada).toBe(false)
  })

  it('reconoce una meta alcanzada', () => {
    const estado = calcularEstado(600000000, 600000000)
    expect(estado.alcanzada).toBe(true)
    expect(estado.faltaCents).toBe(0)
  })

  it('no pasa del 100% aunque se aporte de más', () => {
    expect(calcularEstado(700000000, 600000000).porcentaje).toBe(100)
  })

  it('una meta sin aportes está en cero', () => {
    const estado = calcularEstado(0, 600000000)
    expect(estado.porcentaje).toBe(0)
    expect(estado.faltaCents).toBe(600000000)
  })
})

describe('ritmo de ahorro', () => {
  it('se mide desde el primer aporte, no desde la creación', () => {
    // Quien creó la meta hace meses y empezó a aportar la semana pasada tiene el
    // ritmo de esta semana, no un promedio diluido que diría que tardará años.
    const aportes: Aporte[] = [
      { fecha: fromISO('2026-08-13'), cents: 50000000 },
      { fecha: fromISO('2026-08-23'), cents: 50000000 },
    ]
    const ritmo = ritmoDiario(aportes, HOY)
    expect(ritmo).toBeCloseTo(100000000 / 10, 0)
  })

  it('un solo aporte hoy no divide por cero', () => {
    const ritmo = ritmoDiario([{ fecha: HOY, cents: 10000000 }], HOY)
    expect(ritmo).toBe(10000000)
    expect(Number.isFinite(ritmo!)).toBe(true)
  })

  it('sin aportes no hay ritmo', () => {
    expect(ritmoDiario([], HOY)).toBeNull()
  })

  it('si se retiró todo, no hay ritmo del que proyectar', () => {
    const aportes: Aporte[] = [
      { fecha: fromISO('2026-08-01'), cents: 10000000 },
      { fecha: fromISO('2026-08-10'), cents: -10000000 },
    ]
    expect(ritmoDiario(aportes, HOY)).toBeNull()
  })
})

describe('estimación de llegada', () => {
  it('proyecta al ritmo actual', () => {
    const estado = calcularEstado(30000000, 60000000)
    // 10.000 pesos al día, faltan 300.000: treinta días.
    const estimada = fechaEstimada(estado, 1000000, HOY)
    expect(toISO(estimada!)).toBe('2026-09-22')
  })

  it('una meta alcanzada es hoy', () => {
    const estado = calcularEstado(60000000, 60000000)
    expect(toISO(fechaEstimada(estado, 1000, HOY)!)).toBe(toISO(HOY))
  })

  it('sin ritmo no se inventa una fecha', () => {
    expect(fechaEstimada(calcularEstado(0, 60000000), null, HOY)).toBeNull()
  })

  it('no proyecta a una distancia que dejaría de significar algo', () => {
    // «La tendrás en 2074» no informa: desanima.
    const estado = calcularEstado(1000, 600000000)
    expect(fechaEstimada(estado, 100, HOY)).toBeNull()
  })
})

describe('aporte necesario para llegar a tiempo', () => {
  it('reparte lo que falta entre los períodos que quedan', () => {
    const estado = calcularEstado(0, 60000000)
    // Sesenta días por delante son dos períodos de treinta.
    const necesario = aporteNecesario(estado, fromISO('2026-10-22'), HOY)
    expect(necesario).toBe(30000000)
  })

  it('una meta alcanzada no necesita más aportes', () => {
    expect(aporteNecesario(calcularEstado(100, 100), fromISO('2026-12-01'), HOY)).toBe(0)
  })

  it('una fecha pasada no permite repartir nada', () => {
    const estado = calcularEstado(0, 60000000)
    expect(aporteNecesario(estado, fromISO('2026-01-01'), HOY)).toBeNull()
  })
})

describe('mensajes de progreso', () => {
  const base = { hoy: HOY, locale: 'es-CO' }

  it('celebra al alcanzarla', () => {
    const mensaje = mensajeDeProgreso({
      ...base,
      estado: calcularEstado(100, 100),
      ritmo: 100,
    })
    expect(mensaje.texto).toContain('alcanzada')
  })

  it('proyecta con datos, no con frases genéricas', () => {
    const mensaje = mensajeDeProgreso({
      ...base,
      estado: calcularEstado(30000000, 60000000),
      ritmo: 1000000,
    })
    expect(mensaje.texto).toMatch(/Al ritmo actual/)
    expect(mensaje.texto).toMatch(/septiembre/)
  })

  it('con fecha objetivo ofrece la palanca, no un reproche', () => {
    // FR-014: «a este ritmo llegarías en 2031» solo desanima.
    const mensaje = mensajeDeProgreso({
      ...base,
      estado: calcularEstado(0, 60000000),
      ritmo: 1,
      fechaObjetivo: fromISO('2026-10-22'),
    })
    expect(mensaje.aporteSugeridoCents).toBe(30000000)
    expect(mensaje.texto).not.toMatch(/tarde|nunca|imposible|deberías|mal/i)
  })

  it('sin aportes invita a empezar', () => {
    const mensaje = mensajeDeProgreso({
      ...base,
      estado: calcularEstado(0, 60000000),
      ritmo: null,
    })
    expect(mensaje.texto).toContain('aporte')
  })

  it('ningún mensaje reprocha ni juzga', () => {
    const casos = [
      { estado: calcularEstado(0, 60000000), ritmo: null },
      { estado: calcularEstado(100, 60000000), ritmo: 1 },
      { estado: calcularEstado(30000000, 60000000), ritmo: 1000000 },
      {
        estado: calcularEstado(0, 60000000),
        ritmo: 1,
        fechaObjetivo: fromISO('2026-01-01'),
      },
    ]

    for (const caso of casos) {
      const { texto } = mensajeDeProgreso({ ...base, ...caso })
      expect(texto).not.toMatch(/tarde|nunca|imposible|deberías|mal|poco|lento/i)
    }
  })
})
