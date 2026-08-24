'use client'

import { usePathname } from 'next/navigation'

/**
 * Entrada de pantalla.
 *
 * La clave por ruta fuerza a React a montar de nuevo el contenido al navegar, y
 * con ello la animación de entrada vuelve a correr. Sin la clave, ir de una
 * pantalla a otra reutilizaría el mismo nodo y el cambio ocurriría sin que se
 * viera nada moverse.
 *
 * Es entrada y no cruce entre pantallas: para que la saliente se despidiera
 * habría que retenerla montada mientras llega la nueva, y eso significa dejar
 * datos viejos en pantalla —cifras de dinero, en este caso— unas décimas de más.
 */
export function Transicion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="entra-pagina">
      {children}
    </div>
  )
}
