import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { MenuDeCuenta } from '@/components/menu-de-cuenta'
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
  const usuario = await currentUser()
  if (!usuario) redirect('/entrar')

  const userId = usuario.id

  const settings = await ensureUserSettings(userId)

  // Quien no ha elegido nombre ni país opera con valores provisionales: se le
  // lleva a configurarlos antes de registrar nada (spec 004). La bienvenida vive
  // fuera de este contenedor, de modo que no puede redirigirse a sí misma.
  if (!settings.onboardedAt) redirect('/bienvenida')

  // Sin proveedor de IA, Serva AI no aparece en la navegación: mejor que no
  // exista a que exista y no funcione (spec 003, degradación).
  const conAsistente = hayProveedor()

  return (
    <div className="flex h-screen">
      <aside className="hidden h-screen w-56 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
        <div className="space-y-8">
          <Marca className="px-3" />
          <NavegacionLateral conAsistente={conAsistente} />
        </div>

        {/* El nombre es el botón: dentro está lo que se hace poco —ajustes y
            cerrar sesión— para que el pie no gaste sitio permanente en ello. */}
        <MenuDeCuenta nombre={settings.displayName} correo={usuario.email} />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 shrink-0 border-b border-border bg-background/85 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Marca />
            <MenuDeCuenta nombre={settings.displayName} correo={usuario.email} compacto />
          </div>
          <div className="px-2 pb-2">
            <NavegacionCompacta conAsistente={conAsistente} />
          </div>
        </header>

        {/* `overflow-y-auto` y no scroll del documento: así el campo de Serva AI
            puede quedarse fijo abajo sin que el resto de pantallas cambie. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
