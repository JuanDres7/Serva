'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney, formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { abonarADeuda, darPorSaldada, reabrirDeuda, eliminarDeuda } from '@/lib/actions/debts'
import type { EstadoDeVencimiento } from '@/lib/domain/deudas'

/**
 * Una deuda en la lista (spec 011, T-532).
 *
 * Reutiliza el lenguaje de la tarjeta de metas —barra de progreso, cifra de lo
 * cubierto sobre el total— porque es lo mismo visto de otro lado: algo que dura
 * y que va llenándose. Inventar otro componente para lo mismo habría dado dos
 * formas de leer la misma idea.
 */

export type DeudaVista = {
  readonly id: string
  readonly contraparte: string
  readonly direccion: 'owed_by_me' | 'owed_to_me'
  readonly originalCents: number
  readonly abonadoCents: number
  readonly saldoCents: number
  readonly porcentaje: number
  readonly vencimiento: string
  readonly estado: EstadoDeVencimiento
  readonly saldada: boolean
  readonly escritaPorIA: boolean
}

export function DeudaTarjeta({
  deuda,
  currency,
  locale,
}: {
  readonly deuda: DeudaVista
  readonly currency: string
  readonly locale: string
}) {
  const router = useRouter()
  const [abonando, setAbonando] = useState(false)
  const [monto, setMonto] = useState('')
  const [ocupada, setOcupada] = useState(false)

  const dinero = (cents: number) => formatMoney({ cents, currency }, locale)

  async function enviarAbono(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupada) return

    let cantidad
    try {
      cantidad = parseAmount(monto, currency, locale)
    } catch {
      toast.error('Ese monto no se entiende')
      return
    }
    if (!cantidad || cantidad.cents <= 0) {
      toast.error('Escribe cuánto abonaste')
      return
    }

    setOcupada(true)
    const resultado = await abonarADeuda(deuda.id, cantidad.cents)
    setOcupada(false)

    if (!resultado.ok) {
      toast.error(resultado.error)
      return
    }

    toast.success('Abono registrado')
    setMonto('')
    setAbonando(false)
    router.refresh()
  }

  async function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>, exito: string) {
    setOcupada(true)
    const resultado = await accion()
    setOcupada(false)

    if (!resultado.ok) {
      toast.error(resultado.error ?? 'No se pudo')
      return
    }
    toast.success(exito)
    router.refresh()
  }

  return (
    <article className="superficie superficie-viva space-y-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-medium">
            <span className="truncate">{deuda.contraparte}</span>
            {deuda.escritaPorIA && (
              <span
                className="eyebrow shrink-0 rounded-full bg-accent px-2 py-0.5 text-accent-foreground"
                title="La registró Serva AI a partir de algo que dijiste"
              >
                Serva
              </span>
            )}
          </h3>
          <p className="cifra text-sm text-muted-foreground">
            {dinero(deuda.abonadoCents)} de {dinero(deuda.originalCents)}
          </p>
        </div>

        <span className={`eyebrow shrink-0 ${colorDeEstado(deuda.estado)}`}>
          {deuda.vencimiento}
        </span>
      </header>

      <div className="space-y-1">
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="barra-crece h-full rounded-full bg-primary"
            style={{ width: `${deuda.porcentaje}%` }}
          />
        </div>
        {!deuda.saldada && (
          <p className="cifra text-sm">
            Quedan {dinero(deuda.saldoCents)}
          </p>
        )}
      </div>

      {deuda.saldada ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupada}
            onClick={() => ejecutar(() => reabrirDeuda(deuda.id), 'Deuda reabierta')}
          >
            Reabrir
          </Button>
        </div>
      ) : abonando ? (
        <form onSubmit={enviarAbono} className="flex flex-wrap items-center gap-2">
          <Input
            autoFocus
            inputMode="decimal"
            placeholder="¿Cuánto abonaste?"
            aria-label="Monto del abono"
            value={monto}
            onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
            className="cifra w-40"
          />
          <Button type="submit" size="sm" disabled={ocupada}>
            {ocupada ? 'Un momento…' : 'Abonar'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAbonando(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAbonando(true)}>
            {deuda.direccion === 'owed_by_me' ? 'Abonar' : 'Me devolvieron'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupada}
            onClick={() => ejecutar(() => darPorSaldada(deuda.id), 'Deuda saldada')}
          >
            Ya está saldada
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupada}
            onClick={() => ejecutar(() => eliminarDeuda(deuda.id), 'Deuda eliminada')}
          >
            Eliminar
          </Button>
        </div>
      )}
    </article>
  )
}

/**
 * El color del aviso (T-535).
 *
 * Vencida en terracota, que es lo más fuerte de la paleta y ya está reservado
 * para lo negativo. Nunca rojo de alarma: la persona sabe que se le pasó, y
 * gritárselo no le ayuda a pagar (D-024).
 */
function colorDeEstado(estado: EstadoDeVencimiento): string {
  switch (estado) {
    case 'vencida':
      return 'text-destructive'
    case 'cerca':
      return 'text-foreground'
    default:
      return 'text-muted-foreground'
  }
}
