'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navegación de la aplicación.
 *
 * Las etiquetas van en mayúsculas pequeñas y muy espaciadas: es el detalle que
 * da carácter editorial y evita que la barra parezca la de cualquier panel de
 * administración. Funciona porque son pocas y cortas.
 */

const SECCIONES = [
  { href: '/', etiqueta: 'Resumen' },
  { href: '/registro', etiqueta: 'Registrar' },
  { href: '/historial', etiqueta: 'Historial' },
  { href: '/presupuestos', etiqueta: 'Presupuestos' },
  { href: '/metas', etiqueta: 'Metas' },
  { href: '/recurrentes', etiqueta: 'Recurrentes' },
]

const AJUSTES = { href: '/ajustes', etiqueta: 'Ajustes' }

function esActiva(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function NavegacionLateral() {
  const pathname = usePathname()

  return (
    <nav className="flex h-full flex-col gap-1" aria-label="Secciones">
      {SECCIONES.map((seccion) => (
        <Enlace
          key={seccion.href}
          {...seccion}
          activa={esActiva(pathname, seccion.href)}
        />
      ))}

      <span className="my-3 h-px bg-sidebar-border" aria-hidden />

      <Enlace {...AJUSTES} activa={esActiva(pathname, AJUSTES.href)} />
    </nav>
  )
}

function Enlace({
  href,
  etiqueta,
  activa,
}: {
  href: string
  etiqueta: string
  activa: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={activa ? 'page' : undefined}
      className={`eyebrow rounded-lg px-3 py-2.5 transition-colors ${
        activa
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      }`}
    >
      {etiqueta}
    </Link>
  )
}

/** Misma navegación en pantalla estrecha: una tira que se desplaza. */
export function NavegacionCompacta() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones"
      className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {[...SECCIONES, AJUSTES].map((seccion) => (
        <Link
          key={seccion.href}
          href={seccion.href}
          aria-current={esActiva(pathname, seccion.href) ? 'page' : undefined}
          className={`eyebrow shrink-0 rounded-lg px-3 py-2 transition-colors ${
            esActiva(pathname, seccion.href)
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-muted-foreground'
          }`}
        >
          {seccion.etiqueta}
        </Link>
      ))}
    </nav>
  )
}

/** Marca. La flor de cuatro pétalos remite a algo que crece, no a un banco. */
export function Marca({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path
            d="M12 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3ZM12 15c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3ZM6 9c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3ZM18 9c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="eyebrow text-[0.8125rem] tracking-[0.18em]">Finzen</span>
    </Link>
  )
}
