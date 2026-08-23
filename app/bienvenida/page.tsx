import { redirect } from 'next/navigation'
import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { FormularioBienvenida } from '@/components/formulario-bienvenida'

export default async function BienvenidaPage() {
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)

  // Quien ya la completó no vuelve a pasar por aquí.
  if (settings.onboardedAt) redirect('/')

  return (
    <div className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Antes de empezar
        </h1>
        <p className="text-sm text-muted-foreground">
          Dos cosas y ya. Con esto sabemos cómo llamarte y en qué moneda mostrar
          tus montos.
        </p>
      </div>

      <FormularioBienvenida nombreSugerido={settings.displayName} />
    </div>
  )
}
