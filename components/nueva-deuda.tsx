'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatWhileTyping, parseAmount, currencySymbol } from '@/lib/domain/money-format'
import { registrarDeuda } from '@/lib/actions/debts'

/**
 * Registrar una deuda a mano (spec 011, E1 y E4).
 *
 * Las dos direcciones comparten formulario y cambian con un control segmentado,
 * igual que gasto e ingreso en Registro Fácil. Son la misma cosa con el signo
 * cambiado, y separarlas en dos formularios haría pensar que no lo son.
 */

const DIRECCIONES = [
  ['owed_by_me', 'La debo'],
  ['owed_to_me', 'Me la deben'],
] as const

export function NuevaDeuda({
  currency,
  locale,
}: {
  readonly currency: string
  readonly locale: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [direccion, setDireccion] = useState<'owed_by_me' | 'owed_to_me'>('owed_by_me')
  const [contraparte, setContraparte] = useState('')
  const [monto, setMonto] = useState('')
  const [vence, setVence] = useState('')
  const [guardando, setGuardando] = useState(false)

  const simbolo = currencySymbol(currency, locale)

  function limpiar() {
    setContraparte('')
    setMonto('')
    setVence('')
    setAbierto(false)
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    if (contraparte.trim() === '') {
      toast.error(direccion === 'owed_by_me' ? '¿A quién le debes?' : '¿Quién te debe?')
      return
    }

    let cantidad
    try {
      cantidad = parseAmount(monto, currency, locale)
    } catch {
      toast.error('Ese monto no se entiende')
      return
    }
    if (!cantidad || cantidad.cents <= 0) {
      toast.error('Escribe de cuánto es')
      return
    }

    setGuardando(true)
    const resultado = await registrarDeuda({
      direction: direccion,
      counterparty: contraparte.trim(),
      originalCents: cantidad.cents,
      dueOn: vence || null,
    })
    setGuardando(false)

    if (!resultado.ok) {
      toast.error(resultado.error)
      return
    }

    toast.success('Deuda registrada')
    limpiar()
    router.refresh()
  }

  if (!abierto) {
    return <Button onClick={() => setAbierto(true)}>+ Nueva deuda</Button>
  }

  return (
    <form onSubmit={guardar} className="superficie entra w-full space-y-4 p-5">
      <div
        className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
        role="group"
        aria-label="Dirección de la deuda"
      >
        {DIRECCIONES.map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={direccion === valor}
            onClick={() => setDireccion(valor)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              direccion === valor
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contraparte">
          {direccion === 'owed_by_me' ? '¿A quién le debes?' : '¿Quién te debe?'}
        </Label>
        <Input
          id="contraparte"
          autoFocus
          autoComplete="off"
          placeholder="mi hermana, el banco…"
          value={contraparte}
          onChange={(e) => setContraparte(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="monto-deuda">¿De cuánto?</Label>
        <div className="flex items-baseline gap-2">
          <span aria-hidden className="cifra text-muted-foreground">
            {simbolo}
          </span>
          <Input
            id="monto-deuda"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={monto}
            onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
            className="cifra"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vence">¿Para cuándo? (opcional)</Label>
        <Input
          id="vence"
          type="date"
          value={vence}
          onChange={(e) => setVence(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border/70 pt-4">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Registrar deuda'}
        </Button>
        <Button type="button" variant="ghost" onClick={limpiar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
