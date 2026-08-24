'use client'

import { useEffect, useRef, useState } from 'react'
import { formatMoney } from '@/lib/domain/money-format'

/**
 * Una cifra de dinero que sube hasta su valor.
 *
 * El recuento no es adorno: es lo que hace que el saldo se lea como un
 * resultado y no como un dato que ya estaba ahí. Dura poco más de medio segundo
 * y frena al final, así que la última parte —los dígitos que de verdad importan—
 * se ve casi quieta.
 *
 * **Sobre el Artículo I.** Aquí no hay aritmética de dinero. Se interpola un
 * entero de centavos entre dos enteros de centavos, se redondea en cada
 * fotograma y se formatea con la misma función que el resto de la aplicación.
 * El valor mostrado al terminar es exactamente el que llegó por props, nunca uno
 * reconstruido.
 */
export function CifraAnimada({
  cents,
  currency,
  locale,
  className,
}: {
  readonly cents: number
  readonly currency: string
  readonly locale: string
  readonly className?: string
}) {
  // El primer render —el del servidor y el de la hidratación— muestra ya el
  // valor final: si mostrara cero, quien llega con la conexión lenta vería una
  // cifra falsa durante un instante.
  const [mostrado, setMostrado] = useState(cents)
  const anteriorRef = useRef(cents)
  const montadoRef = useRef(false)

  useEffect(() => {
    const desde = montadoRef.current ? anteriorRef.current : 0
    const hasta = cents
    anteriorRef.current = cents
    montadoRef.current = true

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0

    // Sin salto que mostrar, o sin permiso para moverse, se planta el valor
    // final. Va igualmente por un fotograma: actualizar el estado dentro del
    // cuerpo del efecto encadena renders sin necesidad.
    if (desde === hasta || sinMovimiento) {
      frame = requestAnimationFrame(() => setMostrado(hasta))
      return () => cancelAnimationFrame(frame)
    }

    const DURACION = 620
    const inicio = performance.now()

    function paso(ahora: number) {
      const avance = Math.min(1, (ahora - inicio) / DURACION)
      // La misma salida exponencial que usa el CSS, para que el número frene
      // igual que se mueve todo lo demás.
      const suavizado = 1 - Math.pow(1 - avance, 4)
      setMostrado(Math.round(desde + (hasta - desde) * suavizado))
      if (avance < 1) frame = requestAnimationFrame(paso)
      else setMostrado(hasta)
    }

    frame = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(frame)
  }, [cents])

  return (
    <span className={className}>{formatMoney({ cents: mostrado, currency }, locale)}</span>
  )
}
