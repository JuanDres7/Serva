import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { CerrarSesion } from '@/components/cerrar-sesion'

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <nav className="flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">
              Finzen
            </Link>
            <Link
              href="/historial"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Historial
            </Link>
            <Link
              href="/ajustes"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Ajustes
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {settings.displayName}
            </span>
            <CerrarSesion />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
