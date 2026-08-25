'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu } from '@base-ui/react/menu'
import { signOut } from '@/lib/auth-client'

/**
 * La cuenta, en el pie de la barra lateral.
 *
 * Antes el nombre era texto muerto y debajo colgaba un botón «Salir» siempre a
 * la vista. Dos problemas: el nombre parecía pulsable sin serlo, y cerrar sesión
 * —lo que menos se hace en toda la aplicación— ocupaba sitio permanente al lado
 * de lo que más.
 *
 * Ahora el nombre **es** el botón, y lo poco frecuente vive dentro. Que se note
 * que se puede pulsar no se deja al azar: hay fondo al pasar por encima, la
 * chevron gira al abrir, y el botón se hunde un punto al presionar. Tres señales
 * en tres momentos distintos —antes, durante y después— porque una sola se
 * pierde en una barra donde todo lo demás también reacciona al ratón.
 *
 * El correo va arriba del todo por una razón práctica: se puede tener más de una
 * cuenta, y el nombre para mostrar no basta para saber en cuál se está.
 */

export function MenuDeCuenta({
  nombre,
  correo,
  compacto = false,
}: {
  readonly nombre: string
  readonly correo: string
  /** En la cabecera estrecha no cabe el nombre: solo la inicial. */
  readonly compacto?: boolean
}) {
  const router = useRouter()

  async function salir() {
    await signOut()
    router.push('/entrar')
    router.refresh()
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        /*
         * En la cabecera estrecha el nombre no se pinta y la inicial es
         * decorativa, así que sin esto el botón se queda mudo: un lector de
         * pantalla anunciaría «botón» y nada más. Se pone en las dos variantes
         * para que la aplicación se describa igual en los dos tamaños.
         */
        aria-label={`Cuenta de ${nombre}`}
        className={
          compacto
            ? 'group flex items-center gap-1.5 rounded-lg p-1 text-sidebar-foreground transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none active:scale-[0.97]'
            : 'group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sidebar-foreground transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none active:scale-[0.98]'
        }
      >
        <Inicial nombre={nombre} />

        {!compacto && (
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{nombre}</span>
        )}

        <Chevron />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side={compacto ? 'bottom' : 'top'}
          align="end"
          sideOffset={8}
          className="isolate z-50"
        >
          {/*
            La animación sale del botón, no de un borde de la pantalla: crece
            desde `--transform-origin`, que el posicionador calcula según por
            dónde acabó cabiendo. Un menú que entra deslizándose desde arriba
            cuando su botón está abajo se lee como otra cosa que pasó por ahí.
          */}
          <Menu.Popup className="menu-cuenta superficie w-60 origin-(--transform-origin) p-1.5 shadow-lg shadow-foreground/[0.06]">
            <div className="escalonado">
              {/* Solo el correo: el nombre ya está en el botón que abrió esto, y
                  repetirlo a dos centímetros no dice nada nuevo. El correo sí,
                  porque es lo único que distingue dos cuentas. */}
              <p className="truncate px-2.5 pt-1.5 pb-2 text-xs text-muted-foreground">
                {correo}
              </p>

              <Separador />

              <Menu.LinkItem
                closeOnClick
                render={<Link href="/ajustes" />}
                className={CLASE_ITEM}
              >
                <IconoAjustes />
                Ajustes
              </Menu.LinkItem>

              <Separador />

              {/*
                Cerrar sesión no es destructivo —no se pierde nada— pero sí es
                lo único de aquí que te saca de la aplicación. Va separado y en
                el color de aviso para que no se pulse por inercia al buscar
                Ajustes.
              */}
              <Menu.Item
                onClick={salir}
                className={`${CLASE_ITEM} text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive`}
              >
                <IconoSalir />
                Cerrar sesión
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

/*
 * `data-highlighted` y no `hover`: Base UI lo pone tanto al pasar el ratón como
 * al recorrer con las flechas, así que teclado y ratón se ven igual sin
 * escribirlo dos veces.
 */
const CLASE_ITEM =
  'flex w-full cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors duration-150 select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground'

function Separador() {
  return <span aria-hidden className="my-1 block h-px bg-border/70" />
}

/** La inicial, para que el pie tenga un ancla visual y no solo texto. */
function Inicial({ nombre }: { nombre: string }) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
    >
      {nombre.trim().charAt(0).toUpperCase() || '·'}
    </span>
  )
}

/** Gira al abrir: es la señal de que el botón hizo algo. */
function Chevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:text-sidebar-accent-foreground group-data-[popup-open]:rotate-180"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function IconoAjustes() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}

function IconoSalir() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}
