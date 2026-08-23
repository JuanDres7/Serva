'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoney, formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { aportarAMeta, borrarMeta } from '@/lib/actions/goals'

export type MetaVista = {
  readonly id: string
  readonly nombre: string
  readonly objetivoCents: number
  readonly aportadoCents: number
  readonly faltaCents: number
  readonly porcentaje: number
  readonly alcanzada: boolean
  readonly tieneImagen: boolean
  readonly mensaje: string
  readonly aporteSugeridoCents?: number
}

export function MetaTarjeta({
  meta,
  currency,
  locale,
}: {
  meta: MetaVista
  currency: string
  locale: string
}) {
  const router = useRouter()
  const [modo, setModo] = useState<'ninguno' | 'aportar' | 'retirar'>('ninguno')
  const [monto, setMonto] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const dinero = (cents: number) => formatMoney({ cents, currency }, locale)

  async function mover(direccion: 'contribution' | 'withdrawal') {
    let parseado
    try {
      parseado = parseAmount(monto, currency, locale)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Monto inválido')
      return
    }
    if (!parseado || parseado.cents <= 0) {
      toast.error('Escribe de cuánto es')
      return
    }

    setOcupado(true)
    const resultado = await aportarAMeta(meta.id, parseado.cents, direccion)
    setOcupado(false)

    if (!resultado.ok) {
      toast.error(resultado.error)
      return
    }

    if (resultado.alcanzada) {
      // FR-011: celebración al completarla. El historial de lo conseguido es
      // parte de la motivación, así que la meta se archiva, no se borra.
      toast.success(`¡Lo lograste! Ya reuniste lo de ${meta.nombre}`, { duration: 8000 })
    } else {
      toast.success(direccion === 'withdrawal' ? 'Retiro registrado' : 'Aporte registrado')
    }

    setMonto('')
    setModo('ninguno')
    router.refresh()
  }

  return (
    <article className="overflow-hidden rounded-lg border bg-card">
      {/* La imagen propia, no un icono genérico: cuando alguien duda entre
          gastar y no gastar, ver la moto que quiere pesa más que ver una cifra
          (D-029). */}
      {meta.tieneImagen && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/metas/${meta.id}/imagen`}
          alt={meta.nombre}
          className="h-40 w-full object-cover"
        />
      )}

      <div className="space-y-4 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">{meta.nombre}</h3>
            <p className="cifra text-sm text-muted-foreground">
              {dinero(meta.aportadoCents)} de {dinero(meta.objetivoCents)}
            </p>
          </div>
          {meta.alcanzada && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
              Lograda
            </span>
          )}
        </header>

        <div className="space-y-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${meta.porcentaje}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{meta.porcentaje}%</span>
            {!meta.alcanzada && <span>faltan {dinero(meta.faltaCents)}</span>}
          </div>
        </div>

        {/* Lo que motiva son los datos, no las frases: «al ritmo actual la
            tienes en marzo» engancha; «¡tú puedes!» se ignora a la tercera. */}
        <p className="text-sm">
          {meta.mensaje}
          {meta.aporteSugeridoCents !== undefined && (
            <span className="font-medium"> · {dinero(meta.aporteSugeridoCents)}</span>
          )}
        </p>

        {modo === 'ninguno' ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setModo('aportar')}>
              Aportar
            </Button>
            {meta.aportadoCents > 0 && (
              <Button size="sm" variant="outline" onClick={() => setModo('retirar')}>
                Retirar
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Eliminar ${meta.nombre}`}
              onClick={async () => {
                setOcupado(true)
                const r = await borrarMeta(meta.id)
                setOcupado(false)
                if (!r.ok) {
                  toast.error(r.error)
                  return
                }
                toast('Meta eliminada')
                router.refresh()
              }}
            >
              Eliminar
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-md bg-muted/60 p-3">
            <div className="space-y-1">
              <Label htmlFor={`monto-${meta.id}`} className="text-xs">
                {modo === 'aportar'
                  ? `¿Cuánto le abonas a ${meta.nombre}?`
                  : `¿Cuánto sacas de ${meta.nombre}?`}
              </Label>
              <Input
                id={`monto-${meta.id}`}
                value={monto}
                onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
                inputMode="decimal"
                placeholder="0"
                autoFocus
                className="h-9"
              />
            </div>

            {modo === 'retirar' && (
              // RN-003: si no se retira antes de gastar, el mismo dinero se
              // descuenta dos veces y el saldo queda por debajo de la realidad.
              <p className="text-xs text-muted-foreground">
                Si vas a usar este dinero, retíralo aquí y registra el gasto
                aparte.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={ocupado}
                onClick={() => mover(modo === 'aportar' ? 'contribution' : 'withdrawal')}
              >
                {ocupado ? 'Guardando…' : modo === 'aportar' ? 'Aportar' : 'Retirar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setModo('ninguno')
                  setMonto('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
