/**
 * Saludo de bienvenida (spec 004, D-024).
 *
 * Los mensajes son un conjunto escrito de antemano, no generados por el modelo:
 * aparecen en cada apertura, así que deben ser instantáneos y sin costo, y no
 * puede haber riesgo de que el modelo suelte algo inapropiado justo en lo
 * primero que ve el usuario.
 *
 * **Ningún mensaje reprocha ni juzga el gasto.** Un mensaje culpabilizante en
 * una aplicación de finanzas personales consigue que el usuario deje de abrirla,
 * que es exactamente el fracaso del producto.
 */

export type ContextoSaludo = {
  readonly nombre: string
  /** Hora local del usuario, de 0 a 23. */
  readonly hora: number
  /** Días desde el último movimiento registrado. `null` si nunca registró. */
  readonly diasSinRegistrar: number | null
  /** Movimientos registrados en el período en curso. */
  readonly registrosDelPeriodo: number
  /** Cobros recurrentes por confirmar. */
  readonly pendientes: number
  /** Presupuestos que llegaron al umbral de aviso. */
  readonly presupuestosEnAviso: number
}

export type Saludo = {
  readonly titulo: string
  readonly subtitulo: string | null
}

function franja(hora: number): string {
  if (hora < 6) return 'Buenas noches'
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export function construirSaludo(contexto: ContextoSaludo): Saludo {
  const titulo = `${franja(contexto.hora)}, ${contexto.nombre}`

  // Los avisos accionables mandan sobre cualquier otro mensaje: son lo único
  // que el usuario puede resolver ahora mismo (D-035).
  if (contexto.pendientes > 0) {
    return {
      titulo,
      subtitulo:
        contexto.pendientes === 1
          ? 'Tienes un cobro por confirmar'
          : `Tienes ${contexto.pendientes} cobros por confirmar`,
    }
  }

  // Al 80% todavía se puede reaccionar; al 100% ya no queda nada por hacer
  // salvo sentirse mal (D-026).
  if (contexto.presupuestosEnAviso > 0) {
    return {
      titulo,
      subtitulo:
        contexto.presupuestosEnAviso === 1
          ? 'Uno de tus topes se está acercando'
          : `${contexto.presupuestosEnAviso} de tus topes se están acercando`,
    }
  }

  if (contexto.diasSinRegistrar === null) {
    return { titulo, subtitulo: 'Empieza registrando tu primer movimiento' }
  }

  // Invitación neutra, nunca reproche. «Llevas 3 días sin registrar» es de las
  // frases que hacen abandonar una aplicación.
  if (contexto.diasSinRegistrar >= 3) {
    return { titulo, subtitulo: '¿Qué gastos tuviste estos días?' }
  }
  if (contexto.diasSinRegistrar >= 1) {
    return { titulo, subtitulo: '¿Qué gastos tuviste ayer?' }
  }

  if (contexto.registrosDelPeriodo >= 20) {
    return { titulo, subtitulo: 'Llevas el período bien registrado' }
  }

  return { titulo, subtitulo: null }
}
