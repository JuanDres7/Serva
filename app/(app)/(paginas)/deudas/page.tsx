import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { listarDeudas, comoDeuda, comoAbonos } from '@/lib/db/queries/debts'
import {
  saldoDe,
  abonadoDe,
  porcentajePagado,
  estadoDeVencimiento,
  describirVencimiento,
  estaSaldada,
  resumenDeDeudas,
} from '@/lib/domain/deudas'
import { todayIn } from '@/lib/domain/civil-date'
import { formatMoney } from '@/lib/domain/money-format'
import { DeudaTarjeta, type DeudaVista } from '@/components/deuda-tarjeta'
import { NuevaDeuda } from '@/components/nueva-deuda'
import { Vacio } from '@/components/vacio'

/**
 * Deudas y préstamos (spec 011).
 *
 * Dos listas separadas y no una mezclada: deber 500.000 y que te deban 500.000
 * no es lo mismo que no deber nada, y ponerlas juntas invitaría a restarlas
 * mentalmente.
 */
export default async function DeudasPage() {
  const userId = await requireUserIdOrRedirect()
  const settings = await ensureUserSettings(userId)
  const hoy = todayIn(settings.timeZone)

  const todas = await listarDeudas(userId, { incluirSaldadas: true })
  const dinero = (cents: number) => formatMoney({ cents, currency: settings.currency }, settings.locale)

  const vistas: DeudaVista[] = todas.map(({ fila, abonos }) => {
    const deuda = comoDeuda(fila)
    const pagos = comoAbonos(abonos)

    return {
      id: fila.id,
      contraparte: fila.counterparty,
      direccion: fila.direction,
      originalCents: fila.originalCents,
      abonadoCents: abonadoDe(deuda, pagos).cents,
      saldoCents: saldoDe(deuda, pagos).cents,
      porcentaje: porcentajePagado(deuda, pagos),
      vencimiento: describirVencimiento(deuda, pagos, hoy),
      estado: estadoDeVencimiento(deuda, pagos, hoy),
      saldada: estaSaldada(deuda, pagos),
      escritaPorIA: fila.createdBy === 'assistant',
    }
  })

  const resumen = resumenDeDeudas(
    todas.map(({ fila, abonos }) => ({ deuda: comoDeuda(fila), abonos: comoAbonos(abonos) })),
    settings.currency,
  )

  const debo = vistas.filter((d) => d.direccion === 'owed_by_me' && !d.saldada)
  const meDeben = vistas.filter((d) => d.direccion === 'owed_to_me' && !d.saldada)
  const saldadas = vistas.filter((d) => d.saldada)
  const hayAlguna = vistas.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Deudas</h1>
          <p className="text-sm text-muted-foreground">
            Lo que debes y lo que te deben, con lo que falta de cada una.
          </p>
        </div>
        {hayAlguna && <NuevaDeuda currency={settings.currency} locale={settings.locale} />}
      </div>

      {hayAlguna && (
        <div className="superficie grid divide-y divide-border/70 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="space-y-2 px-5 py-5">
            <p className="eyebrow text-muted-foreground">Debo</p>
            <p className="cifra text-2xl">{dinero(resumen.debo.cents)}</p>
            <p className="text-xs text-muted-foreground">
              {resumen.cuantasDebo === 1 ? '1 deuda' : `${resumen.cuantasDebo} deudas`}
            </p>
          </div>
          <div className="space-y-2 px-5 py-5">
            <p className="eyebrow text-muted-foreground">Me deben</p>
            <p className="cifra text-2xl text-primary">{dinero(resumen.meDeben.cents)}</p>
            <p className="text-xs text-muted-foreground">
              {resumen.cuantasMeDeben === 1 ? '1 préstamo' : `${resumen.cuantasMeDeben} préstamos`}
            </p>
          </div>
        </div>
      )}

      {!hayAlguna ? (
        <Vacio
          titulo="Todavía no llevas ninguna deuda"
          accion={<NuevaDeuda currency={settings.currency} locale={settings.locale} />}
        >
          Anota lo que debes para saber cuánto falta, y lo que prestaste para no
          olvidarlo. Prestar y no acordarse es de las formas más comunes de
          perder plata.
        </Vacio>
      ) : (
        <>
          <Grupo titulo="Debo" deudas={debo} settings={settings} />
          <Grupo titulo="Me deben" deudas={meDeben} settings={settings} />

          {saldadas.length > 0 && (
            <section className="space-y-3">
              <h2 className="eyebrow text-muted-foreground">Ya saldadas</h2>
              {/* Presentes pero apagadas: siguen existiendo (Art. VII) y a
                  veces hace falta reabrir una que se saldó por error. */}
              <div className="escalonado grid gap-4 opacity-70 sm:grid-cols-2">
                {saldadas.map((deuda) => (
                  <DeudaTarjeta
                    key={deuda.id}
                    deuda={deuda}
                    currency={settings.currency}
                    locale={settings.locale}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Grupo({
  titulo,
  deudas,
  settings,
}: {
  titulo: string
  deudas: readonly DeudaVista[]
  settings: { currency: string; locale: string }
}) {
  if (deudas.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="eyebrow text-muted-foreground">{titulo}</h2>
      <div className="escalonado grid gap-4 sm:grid-cols-2">
        {deudas.map((deuda) => (
          <DeudaTarjeta
            key={deuda.id}
            deuda={deuda}
            currency={settings.currency}
            locale={settings.locale}
          />
        ))}
      </div>
    </section>
  )
}
