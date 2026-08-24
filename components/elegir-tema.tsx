'use client'

import { useEffect, useState } from 'react'
import { CLAVE_TEMA, TEMAS, esTema, type Tema } from '@/lib/domain/tema'

/**
 * El selector de tema (spec 004, FR-010 a FR-012).
 *
 * **La preferencia vive en el navegador, no en la cuenta.** Es a propósito: el
 * tema es del dispositivo y del momento, no de la persona. Quien trabaja de día
 * en el portátil y consulta el saldo de noche en el teléfono quiere cosas
 * distintas en cada uno, y guardarlo en la cuenta le impondría la misma en los
 * dos. Además evita el destello: el servidor no sabe qué tema toca hasta que el
 * navegador se lo dice.
 */
export function ElegirTema() {
  // Se arranca en `null` y no en «automático»: hasta leer el navegador no se
  // sabe cuál está puesto, y pintar un botón activo equivocado durante un
  // instante es peor que no pintar ninguno.
  const [tema, setTema] = useState<Tema | null>(null)

  useEffect(() => {
    // El estado se fija en un fotograma y no en el cuerpo del efecto: leer
    // `localStorage` es sincrónico, pero actualizar el estado ahí encadena
    // renders sin necesidad.
    const frame = requestAnimationFrame(() => {
      const guardado = localStorage.getItem(CLAVE_TEMA)
      setTema(esTema(guardado) ? guardado : 'automatico')
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  function elegir(nuevo: Tema) {
    setTema(nuevo)
    localStorage.setItem(CLAVE_TEMA, nuevo)
    aplicar(nuevo)
  }

  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
      role="group"
      aria-label="Tema de la interfaz"
    >
      {TEMAS.map(({ valor, etiqueta }) => (
        <button
          key={valor}
          type="button"
          aria-pressed={tema === valor}
          onClick={() => elegir(valor)}
          className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            tema === valor
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  )
}

/**
 * Aplica el tema al documento.
 *
 * Con «automático» se pregunta al sistema en ese momento, y además se deja de
 * ignorar sus cambios: si el teléfono se oscurece a las siete de la tarde, la
 * aplicación va con él sin recargar.
 */
function aplicar(tema: Tema) {
  const oscuro =
    tema === 'oscuro' ||
    (tema === 'automatico' && matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.classList.toggle('dark', oscuro)
}

/**
 * Escucha los cambios del sistema mientras el tema es «automático».
 *
 * Se monta una sola vez, en el contenedor de la aplicación. Sin esto,
 * «automático» significaría «lo que el sistema tenía puesto cuando cargué la
 * página», que no es lo mismo.
 */
export function SeguirAlSistema() {
  useEffect(() => {
    const consulta = matchMedia('(prefers-color-scheme: dark)')

    const alCambiar = () => {
      const guardado = localStorage.getItem(CLAVE_TEMA)
      if (guardado && guardado !== 'automatico') return
      document.documentElement.classList.toggle('dark', consulta.matches)
    }

    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  return null
}
