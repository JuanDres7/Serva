import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { listarMetas, ritmoDeMeta } from '@/lib/db/queries/goals'
import { calcularEstado, mensajeDeProgreso } from '@/lib/domain/goals'
import { todayIn, fromISO } from '@/lib/domain/civil-date'
import { NuevaMeta } from '@/components/nueva-meta'
import { MetaTarjeta } from '@/components/meta-tarjeta'

export default async function MetasPage() {
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)
  const hoy = todayIn(settings.timeZone)

  const todas = await listarMetas(userId, { incluirLogradas: true })

  const conProgreso = todas.map((meta) => {
    const estado = calcularEstado(meta.aportadoCents, meta.targetCents)
    const mensaje = mensajeDeProgreso({
      estado,
      ritmo: ritmoDeMeta(meta, hoy),
      hoy,
      fechaObjetivo: meta.targetDate ? fromISO(meta.targetDate) : null,
      locale: settings.locale,
    })

    return {
      id: meta.id,
      nombre: meta.name,
      objetivoCents: meta.targetCents,
      aportadoCents: meta.aportadoCents,
      faltaCents: estado.faltaCents,
      porcentaje: estado.porcentaje,
      alcanzada: meta.achievedAt !== null,
      tieneImagen: meta.tieneImagen,
      mensaje: mensaje.texto,
      aporteSugeridoCents: mensaje.aporteSugeridoCents,
    }
  })

  const activas = conProgreso.filter((m) => !m.alcanzada)
  const logradas = conProgreso.filter((m) => m.alcanzada)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Metas de ahorro</h1>
          <p className="text-sm text-muted-foreground">
            Aquello para lo que estás juntando, con lo que llevas y lo que falta.
          </p>
        </div>
        <NuevaMeta currency={settings.currency} locale={settings.locale} />
      </div>

      {todas.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Ahorrar sin un destino concreto cuesta sostenerlo. Con uno —una moto,
            un viaje— cada aporte significa algo.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activas.map((meta) => (
            <MetaTarjeta
              key={meta.id}
              meta={meta}
              currency={settings.currency}
              locale={settings.locale}
            />
          ))}
        </div>
      )}

      {logradas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Metas logradas
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {logradas.map((meta) => (
              <MetaTarjeta
                key={meta.id}
                meta={meta}
                currency={settings.currency}
                locale={settings.locale}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
