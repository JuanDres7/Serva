import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { presupuestosConGasto, sugerenciasDeTope } from '@/lib/db/queries/budgets'
import { periodFor } from '@/lib/domain/cycle'
import { todayIn, daysBetween } from '@/lib/domain/civil-date'
import { estadoDePresupuesto, mensajeDePresupuesto } from '@/lib/domain/budgets'
import { nombrarPeriodo } from '@/components/etiqueta-periodo'
import { ConfigurarCiclo } from '@/components/configurar-ciclo'
import { PresupuestosLista } from '@/components/presupuestos-lista'

export default async function PresupuestosPage() {
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)

  // E1: la primera visita pregunta el ciclo de pago. Aquí la pregunta llega con
  // contexto; en el primer arranque habría interpelado a alguien que aún no sabe
  // para qué sirve la respuesta (D-027).
  if (!settings.cycleConfiguredAt) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">
            Antes de empezar, una pregunta que cambia cómo se mide todo.
          </p>
        </div>
        <ConfigurarCiclo />
      </div>
    )
  }

  const hoy = todayIn(settings.timeZone)
  const periodo = periodFor(settings.cycleConfig, hoy)
  const diasRestantes = Math.max(0, daysBetween(hoy, periodo.end))

  const [conGasto, sugerencias] = await Promise.all([
    presupuestosConGasto(userId, periodo),
    sugerenciasDeTope(userId, settings.cycleConfig, periodo),
  ])

  const definidas = new Set(conGasto.map((p) => p.category))

  const presupuestos = conGasto.map((presupuesto) => {
    const estado = estadoDePresupuesto(presupuesto.gastadoCents, presupuesto.limitCents)
    return {
      id: presupuesto.id,
      categoria: presupuesto.category,
      topeCents: presupuesto.limitCents,
      gastadoCents: presupuesto.gastadoCents,
      porcentaje: estado.porcentaje,
      restanteCents: estado.restanteCents,
      nivel: estado.nivel,
      mensaje: mensajeDePresupuesto(estado, diasRestantes).texto,
    }
  })

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Presupuestos</h1>
        <p className="text-sm text-muted-foreground">
          {nombrarPeriodo(periodo, settings.locale)} ·{' '}
          {diasRestantes === 0
            ? 'termina hoy'
            : `${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} por delante`}
        </p>
      </div>

      {presupuestos.length === 0 && sugerencias.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            Todavía no hay historial suficiente para proponerte topes con tus
            datos. Puedes ponerlos a mano cuando quieras.
          </p>
        </div>
      )}

      {/* FR-006: se orienta a poner tope a pocas categorías, las que se pueden
          influir. Trece topes son un trabajo administrativo que nadie sostiene, y
          el arriendo o los servicios no cambian porque se les ponga un número. */}
      {presupuestos.length === 0 && sugerencias.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Con tres o cuatro basta. Ponle tope a lo que puedes cambiar —comidas
          fuera, entretenimiento, compras—; el arriendo y los servicios son lo que
          son.
        </p>
      )}

      <PresupuestosLista
        presupuestos={presupuestos}
        sugerencias={sugerencias
          .filter((s) => !definidas.has(s.category) && s.sugeridoCents !== null)
          .slice(0, 5)
          .map((s) => ({
            categoria: s.category,
            promedioCents: s.promedioCents,
            sugeridoCents: s.sugeridoCents!,
          }))}
        currency={settings.currency}
        locale={settings.locale}
      />
    </div>
  )
}
