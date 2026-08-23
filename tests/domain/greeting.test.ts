import { describe, it, expect } from 'vitest'
import { construirSaludo, type ContextoSaludo } from '@/lib/domain/greeting'
import { PAISES, buscarPais } from '@/lib/domain/countries'

const base = (extra: Partial<ContextoSaludo> = {}): ContextoSaludo => ({
  nombre: 'Juan',
  hora: 10,
  diasSinRegistrar: 0,
  registrosDelPeriodo: 5,
  pendientes: 0,
  presupuestosEnAviso: 0,
  ...extra,
})

describe('saludo de bienvenida', () => {
  it('llama a la persona por su nombre', () => {
    expect(construirSaludo(base()).titulo).toContain('Juan')
  })

  it('cambia según la franja horaria', () => {
    expect(construirSaludo(base({ hora: 8 })).titulo).toContain('Buenos días')
    expect(construirSaludo(base({ hora: 15 })).titulo).toContain('Buenas tardes')
    expect(construirSaludo(base({ hora: 21 })).titulo).toContain('Buenas noches')
    expect(construirSaludo(base({ hora: 3 })).titulo).toContain('Buenas noches')
  })

  it('invita a empezar a quien nunca ha registrado nada', () => {
    const saludo = construirSaludo(base({ diasSinRegistrar: null }))
    expect(saludo.subtitulo).toContain('primer movimiento')
  })

  it('nunca reprocha al que lleva días sin registrar', () => {
    // «Llevas 3 días sin registrar» es de las frases que hacen abandonar una
    // aplicación: a nadie le gusta que le recuerden que está fallando (D-024).
    const saludo = construirSaludo(base({ diasSinRegistrar: 5 }))

    expect(saludo.subtitulo).toBe('¿Qué gastos tuviste estos días?')
    expect(saludo.subtitulo).not.toMatch(/sin registrar|llevas \d|olvidaste|deberías/i)
  })

  it('ningún mensaje juzga el gasto', () => {
    const casos: ContextoSaludo[] = [
      base({ diasSinRegistrar: null }),
      base({ diasSinRegistrar: 1 }),
      base({ diasSinRegistrar: 10 }),
      base({ registrosDelPeriodo: 40 }),
      base({ pendientes: 3 }),
    ]

    for (const caso of casos) {
      const texto = `${construirSaludo(caso).titulo} ${construirSaludo(caso).subtitulo ?? ''}`
      expect(texto).not.toMatch(/gastaste demasiado|mucho|mal|cuidado|exceso|alerta/i)
    }
  })

  it('avisa cuando un tope se acerca, no cuando ya se pasó', () => {
    // Al 100% ya no queda nada por hacer salvo sentirse mal (D-026).
    const saludo = construirSaludo(base({ presupuestosEnAviso: 1 }))
    expect(saludo.subtitulo).toContain('se está acercando')
    expect(saludo.subtitulo).not.toMatch(/excediste|pasaste|demasiado/i)
  })

  it('concuerda en plural con varios topes', () => {
    expect(construirSaludo(base({ presupuestosEnAviso: 3 })).subtitulo).toContain(
      '3 de tus topes',
    )
  })

  it('los cobros por confirmar mandan sobre los topes', () => {
    // Confirmar un cobro es algo que se resuelve ahora mismo; un tope acercándose
    // es información.
    const saludo = construirSaludo(base({ pendientes: 2, presupuestosEnAviso: 3 }))
    expect(saludo.subtitulo).toContain('cobros por confirmar')
  })

  it('los avisos accionables mandan sobre cualquier otro mensaje', () => {
    // Es lo único que el usuario puede resolver ahora mismo (D-035).
    const saludo = construirSaludo(base({ pendientes: 3, diasSinRegistrar: 9 }))
    expect(saludo.subtitulo).toContain('3 cobros por confirmar')
  })

  it('concuerda en singular con un solo pendiente', () => {
    expect(construirSaludo(base({ pendientes: 1 })).subtitulo).toBe(
      'Tienes un cobro por confirmar',
    )
  })

  it('reconoce a quien lleva el período al día', () => {
    expect(construirSaludo(base({ registrosDelPeriodo: 25 })).subtitulo).toContain(
      'bien registrado',
    )
  })

  it('no siempre hay algo que decir', () => {
    expect(construirSaludo(base()).subtitulo).toBeNull()
  })
})

describe('países disponibles', () => {
  it('cada país trae moneda, configuración regional y zona horaria', () => {
    for (const pais of PAISES) {
      expect(pais.currency).toMatch(/^[A-Z]{3}$/)
      expect(pais.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/)
      expect(pais.timeZone).toContain('/')
    }
  })

  it('no hay códigos repetidos', () => {
    const codigos = PAISES.map((p) => p.codigo)
    expect(new Set(codigos).size).toBe(codigos.length)
  })

  it('las zonas horarias son válidas', () => {
    for (const pais of PAISES) {
      expect(() =>
        new Intl.DateTimeFormat('en', { timeZone: pais.timeZone }).format(new Date()),
      ).not.toThrow()
    }
  })

  it('busca por código y no inventa nada', () => {
    expect(buscarPais('CO')?.currency).toBe('COP')
    expect(buscarPais('XX')).toBeUndefined()
  })
})
