'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { findCategory } from '@/lib/domain/categories'
import { formatMoney, formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { currencyDecimals } from '@/lib/domain/money'
import { confirmarPendiente, reprogramarPendiente, borrarRecurrente } from '@/lib/actions/recurring'

export type PendienteVista = {
  readonly id: string
  readonly descripcion: string
  readonly categoria: string
  readonly tipo: 'expense' | 'income'
  readonly amountCents: number
  readonly venceEl: string
  readonly diasDeRetraso: number
}

type Props = {
  readonly pendientes: readonly PendienteVista[]
  readonly currency: string
  readonly locale: string
  readonly hoy: string
}

/**
 * Cobros por confirmar (spec 007).
 *
 * Se muestran como una lista resoluble en cualquier orden, nunca como diálogos
 * encadenados: cuatro días de ausencia se convertirían en un muro de preguntas
 * antes de poder usar la aplicación (D-032). Y nunca bloquean nada.
 */
export function PendientesRecurrentes({ pendientes, currency, locale, hoy }: Props) {
  if (pendientes.length === 0) return null

  return (
    <section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <header>
        <h2 className="text-sm font-medium">
          {pendientes.length === 1
            ? 'Tienes un cobro por confirmar'
            : `Tienes ${pendientes.length} cobros por confirmar`}
        </h2>
        <p className="text-xs text-muted-foreground">
          Finzen no está conectada a tu banco, así que necesita que se lo digas.
        </p>
      </header>

      <ul className="space-y-2">
        {pendientes.map((pendiente) => (
          <FilaPendiente
            key={pendiente.id}
            pendiente={pendiente}
            currency={currency}
            locale={locale}
            hoy={hoy}
          />
        ))}
      </ul>
    </section>
  )
}

function FilaPendiente({
  pendiente,
  currency,
  locale,
  hoy,
}: {
  pendiente: PendienteVista
  currency: string
  locale: string
  hoy: string
}) {
  const router = useRouter()
  const [monto, setMonto] = useState(() => aTextoEditable(pendiente.amountCents, currency, locale))
  const [editandoMonto, setEditandoMonto] = useState(false)
  const [reprogramando, setReprogramando] = useState(false)
  const [nuevaFecha, setNuevaFecha] = useState(hoy)
  const [ocupado, setOcupado] = useState(false)

  const categoria = findCategory(pendiente.categoria)
  const original = aTextoEditable(pendiente.amountCents, currency, locale)
  const montoCambio = monto !== original

  async function confirmar(montoPermanente?: boolean) {
    setOcupado(true)
    try {
      let amountCents: number | undefined
      if (montoCambio) {
        const parseado = parseAmount(monto, currency, locale)
        if (!parseado || parseado.cents <= 0) {
          toast.error('El monto debe ser mayor que cero')
          return
        }
        amountCents = parseado.cents
      }

      const resultado = await confirmarPendiente(pendiente.id, {
        amountCents,
        montoPermanente,
      })
      if (!resultado.ok) {
        toast.error(resultado.error)
        return
      }

      toast.success('Cobro confirmado')
      setEditandoMonto(false)
      router.refresh()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li className="rounded-md border bg-background px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{pendiente.descripcion}</p>
          <p className="text-xs text-muted-foreground">
            {categoria?.name}
            {' · '}
            {pendiente.diasDeRetraso === 0
              ? 'vence hoy'
              : `venció hace ${pendiente.diasDeRetraso} ${pendiente.diasDeRetraso === 1 ? 'día' : 'días'}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* FR-009: el monto está a la vista y se toca para cambiarlo. No se
              antepone un «¿te cobraron lo de siempre?»: una pregunta que se
              repite idéntica cada mes deja de leerse (D-033). */}
          {editandoMonto ? (
            <Input
              value={monto}
              onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
              inputMode="decimal"
              aria-label={`Monto de ${pendiente.descripcion}`}
              className="h-8 w-32 text-right tabular-nums"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setEditandoMonto(true)}
              className="rounded px-2 py-1 text-sm tabular-nums hover:bg-muted"
              aria-label={`Cambiar el monto de ${pendiente.descripcion}`}
            >
              {formatMoney({ cents: pendiente.amountCents, currency }, locale)}
            </button>
          )}

          {!montoCambio && (
            <>
              <Button size="xs" disabled={ocupado} onClick={() => confirmar()}>
                Sí
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={ocupado}
                onClick={() => setReprogramando((v) => !v)}
              >
                No
              </Button>
              {/* FR-013: eliminar no está al mismo nivel que confirmar. */}
              <Button
                size="xs"
                variant="ghost"
                disabled={ocupado}
                aria-label={`Eliminar ${pendiente.descripcion}`}
                onClick={async () => {
                  setOcupado(true)
                  const r = await borrarRecurrente(pendiente.id)
                  setOcupado(false)
                  if (!r.ok) {
                    toast.error(r.error)
                    return
                  }
                  toast('Movimiento recurrente eliminado')
                  router.refresh()
                }}
              >
                ⋯
              </Button>
            </>
          )}
        </div>
      </div>

      {/* FR-010: al cambiar el monto se pregunta si vale solo esta vez o de ahí
          en adelante. Es lo único que el sistema no puede inferir. */}
      {montoCambio && (
        <div className="mt-3 space-y-2 rounded-md bg-muted/60 p-3">
          <p className="text-xs">Cambiaste el monto. ¿Este cambio es…?</p>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" disabled={ocupado} onClick={() => confirmar(true)}>
              De ahora en adelante
            </Button>
            <Button size="xs" variant="outline" disabled={ocupado} onClick={() => confirmar(false)}>
              Solo esta vez
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setMonto(original)
                setEditandoMonto(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {reprogramando && !montoCambio && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-muted/60 p-3">
          <div className="space-y-1">
            <Label htmlFor={`fecha-${pendiente.id}`} className="text-xs">
              ¿Cuándo se hará efectivo?
            </Label>
            <Input
              id={`fecha-${pendiente.id}`}
              type="date"
              value={nuevaFecha}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="h-8 w-auto"
            />
          </div>
          <Button
            size="xs"
            disabled={ocupado}
            onClick={async () => {
              setOcupado(true)
              const r = await reprogramarPendiente(pendiente.id, nuevaFecha)
              setOcupado(false)
              if (!r.ok) {
                toast.error(r.error)
                return
              }
              toast('Cobro reprogramado')
              setReprogramando(false)
              router.refresh()
            }}
          >
            Reprogramar
          </Button>
        </div>
      )}
    </li>
  )
}

/** Pasa centavos al texto que el usuario ve y edita, sin coma flotante. */
function aTextoEditable(cents: number, currency: string, locale: string): string {
  const decimales = currencyDecimals(currency)
  const texto = String(cents).padStart(decimales + 1, '0')
  const entera = texto.slice(0, texto.length - decimales) || '0'
  const fraccion = decimales > 0 ? texto.slice(texto.length - decimales) : ''
  const separador = locale.startsWith('en') ? '.' : ','
  const limpia = fraccion.replace(/0+$/, '')

  return formatWhileTyping(limpia ? `${entera}${separador}${limpia}` : entera, locale)
}
