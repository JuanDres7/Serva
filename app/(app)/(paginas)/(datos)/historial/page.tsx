import Link from 'next/link'
import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  listTransactions,
  countTransactions,
  periodAggregates,
  type MovementType,
} from '@/lib/db/queries/transactions'
import { periodFor, nextPeriod, previousPeriod, type Period } from '@/lib/domain/cycle'
import { todayIn } from '@/lib/domain/civil-date'
import { computeTotals } from '@/lib/domain/balance'
import { nombrarPeriodo } from '@/components/etiqueta-periodo'
import { HistorialTabla } from '@/components/historial-tabla'
import { FiltrosHistorial } from '@/components/filtros-historial'
import { CifraAnimada } from '@/components/cifra-animada'
import { buttonVariants } from '@/components/ui/button'

const POR_PAGINA = 25

type Params = {
  searchParams: Promise<{
    p?: string
    tipo?: string
    categoria?: string
    anulados?: string
    n?: string
  }>
}

/** Desplaza el período tantas posiciones como indique el parámetro. */
function desplazar(
  config: Parameters<typeof periodFor>[0],
  base: Period,
  posiciones: number,
): Period {
  let periodo = base
  const paso = posiciones < 0 ? previousPeriod : nextPeriod
  for (let i = 0; i < Math.abs(posiciones); i += 1) {
    periodo = paso(config, periodo)
  }
  return periodo
}

export default async function HistorialPage({ searchParams }: Params) {
  const params = await searchParams
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)

  const offsetPeriodo = Number.parseInt(params.p ?? '0', 10) || 0
  const hoy = todayIn(settings.timeZone)
  const periodo = desplazar(
    settings.cycleConfig,
    periodFor(settings.cycleConfig, hoy),
    offsetPeriodo,
  )

  const tipo = ['expense', 'income', 'saving'].includes(params.tipo ?? '')
    ? (params.tipo as MovementType)
    : undefined
  const categoria = params.categoria || undefined
  const incluirAnulados = params.anulados === '1'

  // Carga incremental: la primera petición no trae el historial completo
  // (FR-030). El botón amplía el límite en lugar de paginar, para que la lista
  // no se parta y el usuario no pierda el hilo.
  const limite = Math.max(POR_PAGINA, Number.parseInt(params.n ?? '', 10) || POR_PAGINA)

  const filtros = { period: periodo, type: tipo, category: categoria, includeVoided: incluirAnulados }

  const [movimientos, total, agregados] = await Promise.all([
    listTransactions(userId, { ...filtros, limit: limite }),
    countTransactions(userId, filtros),
    periodAggregates(userId, periodo, settings.currency),
  ])

  const totales = computeTotals(agregados)

  const enlaceCon = (cambios: Record<string, string | undefined>) => {
    const url = new URLSearchParams()
    const actual = { p: String(offsetPeriodo), tipo, categoria, anulados: params.anulados, ...cambios }
    for (const [clave, valor] of Object.entries(actual)) {
      if (valor && valor !== '0') url.set(clave, valor)
    }
    const cadena = url.toString()
    return cadena ? `/historial?${cadena}` : '/historial'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="eyebrow text-muted-foreground">
            {nombrarPeriodo(periodo, settings.locale)} · {total}{' '}
            {total === 1 ? 'movimiento' : 'movimientos'}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Historial</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/exportar"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            Exportar a Excel
          </a>
          <Link
            href={enlaceCon({ p: String(offsetPeriodo - 1) })}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            ← Anterior
          </Link>
          {offsetPeriodo !== 0 && (
            <Link
              href={enlaceCon({ p: '0' })}
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              Hoy
            </Link>
          )}
          {offsetPeriodo < 0 ? (
            <Link
              href={enlaceCon({ p: String(offsetPeriodo + 1) })}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              Siguiente →
            </Link>
          ) : (
            // No hay períodos futuros que consultar: se muestra inerte en lugar
            // de como un enlace que no lleva a ninguna parte.
            <span
              aria-disabled
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'pointer-events-none opacity-50',
              })}
            >
              Siguiente →
            </span>
          )}
        </div>
      </div>

      <div className="superficie grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          ['Ingresos', totales.income.cents],
          ['Gastos', totales.expense.cents],
          ['Saldo', totales.balance.cents],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta as string} className="space-y-1.5 px-5 py-4">
            <p className="eyebrow text-muted-foreground">{etiqueta}</p>
            <CifraAnimada
              cents={valor as number}
              currency={settings.currency}
              locale={settings.locale}
              className="cifra text-xl"
            />
          </div>
        ))}
      </div>

      <FiltrosHistorial
        tipo={tipo}
        categoria={categoria}
        incluirAnulados={incluirAnulados}
        offsetPeriodo={offsetPeriodo}
      />

      <HistorialTabla
        movimientos={movimientos.map((m) => ({
          id: m.id,
          type: m.type,
          amountCents: m.amountCents,
          category: m.category,
          occurredOn: m.occurredOn,
          description: m.description,
          descriptionShort: m.descriptionShort,
          status: m.status,
          createdBy: m.createdBy,
        }))}
        currency={settings.currency}
        locale={settings.locale}
        hoy={todayIn(settings.timeZone)}
      />

      {movimientos.length < total && (
        <div className="text-center">
          <Link
            href={enlaceCon({ n: String(limite + POR_PAGINA) })}
            className={buttonVariants({ variant: 'outline' })}
          >
            Cargar más ({total - movimientos.length} restantes)
          </Link>
        </div>
      )}
    </div>
  )
}
