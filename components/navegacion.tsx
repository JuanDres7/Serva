'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navegación de la aplicación.
 *
 * Las etiquetas van en mayúsculas pequeñas y muy espaciadas: es el detalle que
 * da carácter editorial y evita que la barra parezca la de cualquier panel de
 * administración. Funciona porque son pocas y cortas.
 */

/*
 * Registrar no va en la lista: no es un lugar al que se navega, es una acción
 * que se hace desde el resumen. La única entrada es su botón, para que anotar
 * un movimiento sea siempre un gesto que empieza donde se lee el dinero.
 */

const SECCIONES = [
  { href: '/', etiqueta: 'Resumen' },
  { href: '/historial', etiqueta: 'Historial' },
  { href: '/presupuestos', etiqueta: 'Presupuestos' },
  { href: '/metas', etiqueta: 'Metas' },
  // Vecina de Metas: las dos son cosas que duran y tienen saldo.
  { href: '/deudas', etiqueta: 'Deudas' },
  { href: '/recurrentes', etiqueta: 'Recurrentes' },
]

/* Serva AI va aparte, no en la lista de secciones: no es una pantalla más del
   mismo tipo, es a quien se le pregunta por todas las demás. */
const ASISTENTE = { href: '/asistente', etiqueta: 'Serva AI' }

const AJUSTES = { href: '/ajustes', etiqueta: 'Ajustes' }

function seccionesDe(conAsistente: boolean) {
  return conAsistente ? [...SECCIONES, ASISTENTE] : SECCIONES
}

function esActiva(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function NavegacionLateral({ conAsistente }: { conAsistente: boolean }) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const marcador = useMarcador(navRef, pathname)

  return (
    <nav ref={navRef} className="relative flex h-full flex-col gap-1" aria-label="Secciones">
      {/*
        Una sola pastilla que se desplaza hasta la sección activa, en vez de una
        que se apaga y otra que se enciende. El recorrido es lo que dice de dónde
        vienes: encender y apagar deja al ojo buscando dónde quedó.
      */}
      <span
        aria-hidden
        className="absolute inset-x-0 rounded-lg bg-sidebar-accent"
        style={{
          top: marcador.top,
          height: marcador.height,
          opacity: marcador.visible ? 1 : 0,
          transition: marcador.animar
            ? 'top var(--mov-medio) var(--ease-salida), height var(--mov-medio) var(--ease-salida), opacity var(--mov-rapido) linear'
            : 'none',
        }}
      />
      {SECCIONES.map((seccion) => (
        <Enlace
          key={seccion.href}
          {...seccion}
          activa={esActiva(pathname, seccion.href)}
        />
      ))}

      {conAsistente && (
        <>
          <span className="my-3 h-px bg-sidebar-border" aria-hidden />
          <Enlace {...ASISTENTE} activa={esActiva(pathname, ASISTENTE.href)} />
        </>
      )}

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
      data-activa={activa || undefined}
      className={`eyebrow relative rounded-lg px-3 py-2.5 transition-colors duration-200 ${
        activa
          ? 'text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      }`}
    >
      {etiqueta}
    </Link>
  )
}

/** Misma navegación en pantalla estrecha: una tira que se desplaza. */
export function NavegacionCompacta({ conAsistente }: { conAsistente: boolean }) {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const marcador = useMarcador(navRef, pathname)

  return (
    <nav
      ref={navRef}
      aria-label="Secciones"
      className="relative flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* La misma pastilla de la navegación lateral, aquí en horizontal. Que el
          gesto sea el mismo en los dos tamaños es lo que hace que se lean como
          una sola aplicación y no como dos diseños. */}
      <span
        aria-hidden
        className="absolute inset-y-0 rounded-lg bg-sidebar-accent"
        style={{
          left: marcador.left,
          width: marcador.width,
          opacity: marcador.visible ? 1 : 0,
          transition: marcador.animar
            ? 'left var(--mov-medio) var(--ease-salida), width var(--mov-medio) var(--ease-salida), opacity var(--mov-rapido) linear'
            : 'none',
        }}
      />
      {[...seccionesDe(conAsistente), AJUSTES].map((seccion) => (
        <Link
          key={seccion.href}
          href={seccion.href}
          aria-current={esActiva(pathname, seccion.href) ? 'page' : undefined}
          data-activa={esActiva(pathname, seccion.href) || undefined}
          className={`eyebrow relative shrink-0 rounded-lg px-3 py-2 transition-colors duration-200 ${
            esActiva(pathname, seccion.href)
              ? 'text-sidebar-accent-foreground'
              : 'text-muted-foreground hover:text-sidebar-accent-foreground'
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
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-45"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path
            d="M12 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3ZM12 15c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3ZM6 9c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3ZM18 9c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className="eyebrow text-[0.8125rem] tracking-[0.18em]">Serva</span>
    </Link>
  )
}

/**
 * Posición y tamaño de la pastilla, medidos del enlace activo.
 *
 * Se mide después de pintar y no en el render: el alto de un enlace depende de
 * la tipografía ya cargada, y calcularlo antes daría un valor que se corrige
 * solo a la vista. El primer pase aparece sin transición —si no, la pastilla
 * entraría deslizándose desde arriba en cada carga—; del segundo en adelante,
 * se desplaza.
 *
 * Mide los cuatro lados y cada navegación usa los suyos: la lateral se mueve en
 * vertical, la compacta en horizontal.
 */
type Marcador = {
  top: number
  left: number
  width: number
  height: number
  visible: boolean
  animar: boolean
}

const MARCADOR_QUIETO: Marcador = {
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  visible: false,
  animar: false,
}

function useMarcador(
  navRef: React.RefObject<HTMLElement | null>,
  pathname: string,
): Marcador {
  const [marcador, setMarcador] = useState<Marcador>(MARCADOR_QUIETO)

  useLayoutEffect(() => {
    const nav = navRef.current
    const activa = nav?.querySelector<HTMLElement>('[data-activa]')

    if (!nav || !activa) {
      setMarcador((previo) => ({ ...previo, visible: false }))
      return
    }

    setMarcador((previo) => ({
      top: activa.offsetTop,
      left: activa.offsetLeft,
      width: activa.offsetWidth,
      height: activa.offsetHeight,
      visible: true,
      // Ya estaba colocada: este cambio de sitio sí se ve moverse.
      animar: previo.visible,
    }))
  }, [navRef, pathname])

  return marcador
}
