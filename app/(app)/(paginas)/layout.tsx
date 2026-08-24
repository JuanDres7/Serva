import { Transicion } from '@/components/transicion'

/**
 * Contenedor de las pantallas con contenido.
 *
 * Existe para que Serva AI pueda quedar fuera de él: el chat ocupa el alto
 * completo y trae su propio margen, mientras que todo lo demás vive en una
 * columna centrada con aire alrededor. Un grupo de rutas separa ambos casos sin
 * cambiar ninguna dirección.
 *
 * Aquí vive también la entrada de pantalla, de modo que ocurre una sola vez por
 * navegación y ninguna página tiene que acordarse de pedirla.
 */
export default function PaginasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <Transicion>{children}</Transicion>
    </div>
  )
}
