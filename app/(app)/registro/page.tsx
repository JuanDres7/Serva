import Link from 'next/link'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { todayIn, toISO } from '@/lib/domain/civil-date'
import { RegistroFacil } from '@/components/registro-facil'

export default async function RegistroPage() {
  const userId = await requireUserId()
  const settings = await ensureUserSettings(userId)

  // La fecha de hoy se calcula en el servidor con la zona del usuario: el reloj
  // del navegador no es fuente de verdad para algo que decide en qué período
  // cae un movimiento.
  const hoy = toISO(todayIn(settings.timeZone))

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Registro fácil</h1>
        <p className="text-sm text-muted-foreground">
          Anota un movimiento en segundos. Puedes encadenar varios seguidos.
        </p>
      </div>

      <RegistroFacil
        currency={settings.currency}
        locale={settings.locale}
        hoy={hoy}
      />

      <p className="text-center text-sm">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Volver al inicio
        </Link>
      </p>
    </div>
  )
}
