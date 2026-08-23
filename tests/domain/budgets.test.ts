import { describe, it, expect } from 'vitest'
import {
  estadoDePresupuesto,
  sugerirTope,
  redondearSugerencia,
  promedioPorPeriodo,
  mensajeDePresupuesto,
  UMBRAL_AVISO,
} from '@/lib/domain/budgets'

describe('estado de un presupuesto', () => {
  it('calcula lo gastado, lo que queda y el porcentaje', () => {
    const estado = estadoDePresupuesto(31000000, 35000000)
    expect(estado.restanteCents).toBe(4000000)
    expect(estado.porcentaje).toBeCloseTo(88.6, 1)
  })

  it('avisa al acercarse, no al superarlo', () => {
    // Al 100% ya no queda nada por hacer salvo sentirse mal; al 80% todavía hay
    // margen de reaccionar (RN-003).
    expect(estadoDePresupuesto(30000000, 100000000).nivel).toBe('holgado')
    expect(estadoDePresupuesto(80000000, 100000000).nivel).toBe('cerca')
    expect(estadoDePresupuesto(99000000, 100000000).nivel).toBe('cerca')
  })

  it('el umbral de aviso es el 80%', () => {
    expect(UMBRAL_AVISO).toBe(0.8)
  })

  it('reconoce cuando se pasó', () => {
    const estado = estadoDePresupuesto(120000000, 100000000)
    expect(estado.nivel).toBe('excedido')
    expect(estado.restanteCents).toBeLessThan(0)
  })

  it('al excederse muestra la cifra real, no un tope de 100%', () => {
    // Saber que se va en el 140% informa más que ver una barra llena.
    expect(estadoDePresupuesto(140000000, 100000000).porcentaje).toBe(140)
  })

  it('un presupuesto sin gasto está en cero', () => {
    const estado = estadoDePresupuesto(0, 50000000)
    expect(estado.porcentaje).toBe(0)
    expect(estado.nivel).toBe('holgado')
  })
})

describe('sugerencia de tope', () => {
  it('propone algo por debajo del promedio, pero alcanzable', () => {
    // Un recorte del diez por ciento cambia el comportamiento sin condenar al
    // usuario a fallar en la segunda semana.
    const sugerido = sugerirTope(41800000)
    expect(sugerido).toBeLessThan(41800000)
    expect(sugerido).toBeGreaterThan(41800000 * 0.7)
  })

  it('redondea a una cifra que una persona escribiría', () => {
    // «$347.283» delata un cálculo e invita a discutirlo; «$350.000» se acepta o
    // se cambia, que es lo que se busca.
    expect(redondearSugerencia(34728300) % 1000000).toBe(0)
    expect(redondearSugerencia(1234500) % 10000).toBe(0)
  })

  it('sin historial no inventa una cifra', () => {
    expect(sugerirTope(0)).toBeNull()
    expect(sugerirTope(-100)).toBeNull()
  })

  it('nunca sugiere cero', () => {
    expect(sugerirTope(500)).toBeGreaterThan(0)
  })
})

describe('promedio por período', () => {
  it('promedia lo gastado', () => {
    expect(promedioPorPeriodo([30000000, 40000000, 50000000])).toBe(40000000)
  })

  it('ignora los períodos sin gasto en esa categoría', () => {
    // Quien empezó a pedir domicilios el mes pasado no tiene un promedio de «la
    // mitad»: tiene el de un mes.
    expect(promedioPorPeriodo([0, 0, 40000000])).toBe(40000000)
  })

  it('sin datos devuelve cero', () => {
    expect(promedioPorPeriodo([])).toBe(0)
    expect(promedioPorPeriodo([0, 0])).toBe(0)
  })
})

describe('mensajes', () => {
  it('informa de los días que quedan', () => {
    const mensaje = mensajeDePresupuesto(estadoDePresupuesto(10, 100), 9)
    expect(mensaje.texto).toContain('9 días')
  })

  it('concuerda en singular', () => {
    expect(mensajeDePresupuesto(estadoDePresupuesto(10, 100), 1).texto).toContain(
      'Queda 1 día',
    )
  })

  it('avisa de que se acerca sin regañar', () => {
    const mensaje = mensajeDePresupuesto(estadoDePresupuesto(85, 100), 5)
    expect(mensaje.nivel).toBe('cerca')
    expect(mensaje.texto).toMatch(/acercando/)
  })

  it('ningún mensaje reprocha ni juzga', () => {
    // Un usuario que se siente juzgado deja de abrir la aplicación, que es el
    // fracaso del producto (D-024).
    const casos = [
      estadoDePresupuesto(0, 100),
      estadoDePresupuesto(85, 100),
      estadoDePresupuesto(200, 100),
    ]

    for (const estado of casos) {
      for (const dias of [0, 1, 10]) {
        const { texto } = mensajeDePresupuesto(estado, dias)
        expect(texto).not.toMatch(
          /demasiado|excediste|mal|cuidado|alerta|deberías|controla|exceso/i,
        )
      }
    }
  })
})
