import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { CerrarSesion } from '@/components/cerrar-sesion'
import { ChatPanel } from '@/components/chat-panel'
import { hayProveedor } from '@/lib/ai/provider'

/**
 * Contenedor de la aplicación autenticada.
 *
 * Ninguna página con datos del usuario es accesible sin sesión válida (FR-008 de
 * la spec 000). La comprobación vive aquí, en el servidor, y no en cada página:
 * olvidarla en una sola página sería suficiente para exponer datos.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await currentUserId()
  if (!userId) redirect('/entrar')

  const settings = await ensureUserSettings(userId)

  // Quien no ha elegido nombre ni país opera con valores provisionales: se le
  // lleva a configurarlos antes de registrar nada (spec 004). La bienvenida vive
  // fuera de este contenedor, de modo que no puede redirigirse a sí misma.
  if (!settings.onboardedAt) redirect('/bienvenida')

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          {/* Con varias secciones, en pantalla estrecha la navegación no cabe.
              Se desplaza dentro de su propio espacio en lugar de empujar la
              página, que es lo que hace que una web se sienta rota. */}
          <nav className="flex min-w-0 items-center gap-4 overflow-x-auto sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/" className="shrink-0 font-semibold tracking-tight">
              Finzen
            </Link>
            <Link
              href="/historial"
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Historial
            </Link>
            <Link
              href="/metas"
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Metas
            </Link>
            <Link
              href="/recurrentes"
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Recurrentes
            </Link>
            <Link
              href="/ajustes"
              className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
            >
              Ajustes
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {settings.displayName}
            </span>
            <CerrarSesion />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      {/* Sin proveedor de IA el botón no aparece: mejor que no exista a que
          exista y no funcione (spec 003, degradación). */}
      {hayProveedor() && <ChatPanel nombre={settings.displayName} />}
    </div>
  )
}
