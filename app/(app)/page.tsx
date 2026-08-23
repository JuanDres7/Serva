import Link from 'next/link'
import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  periodAggregates,
  categoryBreakdown,
  countTransactions,
} from '@/lib/db/queries/transactions'
import { periodFor, previousPeriod } from '@/lib/domain/cycle'
import { todayIn } from '@/lib/domain/civil-date'
import { computeTotals, computeBreakdown, compareWithPrevious } from '@/lib/domain/balance'
import { formatMoney } from '@/lib/domain/money-format'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EtiquetaPeriodo } from '@/components/etiqueta-periodo'
import { CargarEjemplo, BorrarEjemplo } from '@/components/datos-de-ejemplo'
import { tieneDatosDeEjemplo } from '@/lib/db/queries/sample-data'
import { gastoPorDia, evolucion } from '@/lib/db/queries/charts'
import { compararRitmo, ritmoRelativo } from '@/lib/domain/series'
import { GraficoEvolucion, GraficoRitmo } from '@/components/graficos'
import { nombrarPeriodo } from '@/components/etiqueta-periodo'
import { construirSaludo } from '@/lib/domain/greeting'
import { listTransactions } from '@/lib/db/queries/transactions'
import { daysBetween, fromISO } from '@/lib/domain/civil-date'
import { contarPendientes } from '@/lib/db/queries/recurring'
import { contarEnAviso } from '@/lib/db/queries/budgets'

export default async function InicioPage() {
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)

  const hoy = todayIn(settings.timeZone)
  const periodo = periodFor(settings.cycleConfig, hoy)
  const anterior = previousPeriod(settings.cycleConfig, periodo)

  const [
    agregados,
    agregadosAnteriores,
    desgloseCrudo,
    total,
    conEjemplos,
    diasActual,
    diasAnterior,
    serieEvolucion,
  ] = await Promise.all([
    periodAggregates(userId, periodo, settings.currency),
    periodAggregates(userId, anterior, settings.currency),
    categoryBreakdown(userId, periodo),
    countTransactions(userId),
    tieneDatosDeEjemplo(userId),
    gastoPorDia(userId, periodo),
    gastoPorDia(userId, anterior),
    evolucion(userId, settings.cycleConfig, periodo, 6),
  ])

  const [[ultimo], pendientes, presupuestosEnAviso] = await Promise.all([
    listTransactions(userId, { limit: 1 }),
    contarPendientes(userId, hoy),
    contarEnAviso(userId, periodo),
  ])
  const horaLocal = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.timeZone,
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  )

  const saludo = construirSaludo({
    nombre: settings.displayName,
    hora: horaLocal,
    diasSinRegistrar: ultimo ? daysBetween(fromISO(ultimo.occurredOn), hoy) : null,
    registrosDelPeriodo: total,
    pendientes,
    presupuestosEnAviso,
  })

  const totales = computeTotals(agregados)
  const totalesAnteriores = computeTotals(agregadosAnteriores)
  const desglose = computeBreakdown(desgloseCrudo, settings.currency)
  const comparacionGasto = compareWithPrevious(totales.expense, totalesAnteriores.expense)

  const ritmo = compararRitmo(diasActual, diasAnterior, { actual: periodo, anterior }, hoy)
  const comparacionRitmo = ritmoRelativo(ritmo)
  const evolucionParaGrafico = serieEvolucion.map((punto) => ({
    etiqueta: nombrarPeriodo(punto.periodo, settings.locale).replace(/ de \d{4}$/, ''),
    ingresos: punto.ingresos,
    gastos: punto.gastos,
  }))
  // Un solo período no permite comparar nada: el gráfico diría menos que el
  // total que ya está arriba (FR-007 de la spec 008).
  const hayEvolucion = serieEvolucion.filter((p) => p.ingresos + p.gastos > 0).length >= 2

  const formatear = (cents: number) =>
    formatMoney({ cents, currency: settings.currency }, settings.locale)

  // E9: la primera pantalla explica qué hace la aplicación y cuál es la siguiente
  // acción, en lugar de mostrar cifras en cero sin contexto.
  if (total === 0) {
    return (
      <div className="mx-auto max-w-md space-y-8 py-16 text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">{saludo.titulo}</h1>
          <p className="text-muted-foreground">
            Aquí vas a ver a dónde se va tu dinero. Para empezar, registra tu primer
            gasto: toma unos segundos.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/registro"
            className={buttonVariants({ size: 'lg', className: 'w-full' })}
          >
            Registrar mi primer movimiento
          </Link>

          {/* D-046: quien llega a probar necesita ver la aplicación con datos,
              o no verá nada de lo que la distingue. */}
          <CargarEjemplo />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="eyebrow text-muted-foreground">
            <EtiquetaPeriodo periodo={periodo} locale={settings.locale} />
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {saludo.titulo}
          </h1>
          {saludo.subtitulo && (
            <p className="text-sm text-muted-foreground">{saludo.subtitulo}</p>
          )}
        </div>

        <Link href="/registro" className={buttonVariants({ size: 'lg' })}>
          Registro fácil
        </Link>
      </div>

      {/*
        Las tres cifras del período comparten una sola superficie separada por
        filetes. Tres tarjetas sueltas se leen como tres cosas distintas; esto
        es una sola: el estado del mes.
      */}
      <div className="superficie grid divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="space-y-2 px-5 py-5">
          <p className="eyebrow text-muted-foreground">Ingresos</p>
          <p className="cifra text-2xl">{formatear(totales.income.cents)}</p>
        </div>

        <div className="space-y-2 px-5 py-5">
          <p className="eyebrow text-muted-foreground">Gastos</p>
          <p className="cifra text-2xl">{formatear(totales.expense.cents)}</p>
          {/* Ninguna cifra destacada se muestra sin comparación: un número
              suelto no dice si es mucho o poco. */}
          {comparacionGasto.percentageChange !== null && (
            <p className="text-xs text-muted-foreground">
              {comparacionGasto.percentageChange > 0 ? '↑' : '↓'}{' '}
              {Math.abs(comparacionGasto.percentageChange)}% frente al período
              anterior
            </p>
          )}
        </div>

        <div className="space-y-2 px-5 py-5">
          <p className="eyebrow text-muted-foreground">Saldo</p>
          <p
            className={`cifra text-2xl ${
              totales.balance.cents < 0 ? 'text-destructive' : 'text-primary'
            }`}
          >
            {formatear(totales.balance.cents)}
          </p>
        </div>
      </div>

      {desglose.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿En qué se te fue?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {desglose.map((entrada) => (
              <div key={entrada.category.key} className="space-y-1">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: entrada.category.color }}
                      aria-hidden
                    />
                    {entrada.category.name}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="cifra">{formatear(entrada.amount.cents)}</span>
                    <span className="cifra w-10 text-right text-xs text-muted-foreground">
                      {entrada.percentage}%
                    </span>
                  </span>
                </div>
                {/* Barras horizontales ordenadas de mayor a menor: comparar
                    longitudes es más preciso que comparar ángulos, y con trece
                    categorías un gráfico circular sería ilegible (D-034). */}
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${entrada.percentage}%`,
                      backgroundColor: entrada.category.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {hayEvolucion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">¿Voy mejor o peor que antes?</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoEvolucion
              datos={evolucionParaGrafico}
              currency={settings.currency}
              locale={settings.locale}
            />
          </CardContent>
        </Card>
      )}

      {ritmo.length > 0 && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">¿Voy más rápido de lo normal?</CardTitle>
            {comparacionRitmo && (
              <p className="text-sm text-muted-foreground">
                {comparacionRitmo.diferencia === 0
                  ? 'Vas al mismo ritmo que el período anterior.'
                  : comparacionRitmo.diferencia > 0
                    ? `Llevas ${formatear(comparacionRitmo.diferencia)} más que a estas alturas del período anterior.`
                    : `Llevas ${formatear(-comparacionRitmo.diferencia)} menos que a estas alturas del período anterior.`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <GraficoRitmo
              datos={ritmo}
              currency={settings.currency}
              locale={settings.locale}
            />
          </CardContent>
        </Card>
      )}

      {conEjemplos && <BorrarEjemplo />}

      <p className="text-center">
        <Link
          href="/historial"
          className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver todos los movimientos <span aria-hidden>→</span>
        </Link>
      </p>
    </div>
  )
}
