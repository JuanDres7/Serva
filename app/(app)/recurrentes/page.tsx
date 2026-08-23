import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  listarRecurrentes,
  pendientesDeConfirmar,
  periodicidadDe,
} from '@/lib/db/queries/recurring'
import { todayIn, toISO, fromISO } from '@/lib/domain/civil-date'
import { describirPeriodicidad, diasDeRetraso } from '@/lib/domain/recurrence'
import { formatMoney } from '@/lib/domain/money-format'
import { findCategory } from '@/lib/domain/categories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PendientesRecurrentes } from '@/components/pendientes-recurrentes'
import { NuevoRecurrente } from '@/components/nuevo-recurrente'
import { BorrarRecurrente } from '@/components/borrar-recurrente'

export default async function RecurrentesPage() {
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)
  const hoy = todayIn(settings.timeZone)

  const [todos, pendientes] = await Promise.all([
    listarRecurrentes(userId),
    pendientesDeConfirmar(userId, hoy),
  ])

  const formatear = (cents: number) =>
    formatMoney({ cents, currency: settings.currency }, settings.locale)

  const idsPendientes = new Set(pendientes.map((p) => p.id))
  const programados = todos.filter((r) => !idsPendientes.has(r.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Movimientos recurrentes</h1>
          <p className="text-sm text-muted-foreground">
            Lo que se repite cada mes: arriendo, suscripciones, tu salario.
          </p>
        </div>
        <NuevoRecurrente currency={settings.currency} locale={settings.locale} />
      </div>

      <PendientesRecurrentes
        pendientes={pendientes.map((p) => ({
          id: p.id,
          descripcion: p.description,
          categoria: p.category,
          tipo: p.type as 'expense' | 'income',
          amountCents: p.amountCents,
          venceEl: p.nextDueOn,
          diasDeRetraso: diasDeRetraso(fromISO(p.nextDueOn), hoy),
        }))}
        currency={settings.currency}
        locale={settings.locale}
        hoy={toISO(hoy)}
      />

      {todos.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aún no has definido ninguno. Con ellos, tu historial se llena casi
            solo y no tienes que registrar cada mes lo mismo.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {programados.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Todos están arriba, esperando confirmación.
              </p>
            )}

            {programados.map((recurrente) => {
              const categoria = findCategory(recurrente.category)
              return (
                <div
                  key={recurrente.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {categoria && (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: categoria.color }}
                          aria-hidden
                        />
                      )}
                      {recurrente.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {describirPeriodicidad(periodicidadDe(recurrente))} · próximo el{' '}
                      {new Intl.DateTimeFormat(settings.locale, {
                        day: 'numeric',
                        month: 'long',
                        timeZone: 'UTC',
                      }).format(new Date(`${recurrente.nextDueOn}T00:00:00Z`))}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm tabular-nums ${
                        recurrente.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : ''
                      }`}
                    >
                      {recurrente.type === 'income' ? '+' : '−'}{' '}
                      {formatear(recurrente.amountCents)}
                    </span>
                    <BorrarRecurrente
                      id={recurrente.id}
                      descripcion={recurrente.description}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
