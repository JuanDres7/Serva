/**
 * Piezas de espera.
 *
 * Se dibujan con la forma de lo que están reemplazando. Un rectángulo gris del
 * tamaño equivocado provoca que todo salte cuando llegan los datos, y ese salto
 * se nota más que la propia espera.
 */
export function Hueco({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`hueco ${className}`} />
}

/** Encabezado de pantalla: etiqueta pequeña y título. */
export function HuecoEncabezado() {
  return (
    <div className="space-y-2">
      <Hueco className="h-3 w-32" />
      <Hueco className="h-8 w-64 max-w-full" />
    </div>
  )
}

/** La franja de tres cifras del período. */
export function HuecoTotales() {
  return (
    <div className="superficie grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 px-5 py-5">
          <Hueco className="h-3 w-20" />
          <Hueco className="h-7 w-32" />
        </div>
      ))}
    </div>
  )
}

/** Una lista de filas con su barra. */
export function HuecoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div className="superficie space-y-4 p-5">
      <Hueco className="h-4 w-40" />
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between gap-4">
            <Hueco className="h-3.5 w-32" />
            <Hueco className="h-3.5 w-24" />
          </div>
          <Hueco className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}
