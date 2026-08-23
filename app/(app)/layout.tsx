import { redirect } from 'next/navigation'
import { currentUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { CerrarSesion } from '@/components/cerrar-sesion'
import { ChatPanel } from '@/components/chat-panel'
import { Marca, NavegacionLateral, NavegacionCompacta } from '@/components/navegacion'
import { hayProveedor } from '@/lib/ai/provider'

/**
 * Contenedor de la aplicación autenticada.
 *
 * Ninguna página con datos del usuario es accesible sin sesión válida (FR-008 de
 * la spec 000). La comprobación vive aquí, en el servidor, y no en cada página:
 * olvidarla en una sola bastaría para exponer datos.
 *
 * En pantalla ancha la navegación va a un lado y el contenido respira; en
 * estrecha se convierte en una tira sobre el contenido.
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
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="space-y-8">
          <Marca className="px-3" />
          <NavegacionLateral />
        </div>

        <div className="space-y-2 px-3">
          <p className="truncate text-sm font-medium">{settings.displayName}</p>
          <CerrarSesion />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Marca />
            <CerrarSesion />
          </div>
          <div className="px-2 pb-2">
            <NavegacionCompacta />
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          {children}
        </main>
      </div>

      {/* Sin proveedor de IA el botón no aparece: mejor que no exista a que
          exista y no funcione (spec 003, degradación). */}
      {hayProveedor() && <ChatPanel nombre={settings.displayName} />}
    </div>
  )
}
