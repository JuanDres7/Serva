'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoriesFor, findCategory, type MovementKind } from '@/lib/domain/categories'
import { formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { nuevoRecurrente } from '@/lib/actions/recurring'

type Forma = 'monthly' | 'every-n-days'

export function NuevoRecurrente({
  currency,
  locale,
}: {
  currency: string
  locale: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<MovementKind>('expense')
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [forma, setForma] = useState<Forma>('monthly')
  const [dia, setDia] = useState('1')
  const [cadaN, setCadaN] = useState('14')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>+ Nuevo movimiento recurrente</Button>
    )
  }

  return (
    <form
      className="space-y-5 rounded-lg border bg-card p-5"
      onSubmit={async (evento) => {
        evento.preventDefault()
        setError(null)

        let parseado
        try {
          parseado = parseAmount(monto, currency, locale)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Monto inválido')
          return
        }
        if (!parseado || parseado.cents <= 0) {
          setError('Escribe de cuánto es')
          return
        }
        if (descripcion.trim() === '') {
          setError('Escribe de qué se trata')
          return
        }
        if (!categoria) {
          setError('Elige una categoría')
          return
        }

        setGuardando(true)
        const resultado = await nuevoRecurrente({
          type: tipo,
          amountCents: parseado.cents,
          category: categoria,
          description: descripcion.trim(),
          schedule:
            forma === 'monthly'
              ? { kind: 'monthly', day: Number(dia) }
              : { kind: 'every-n-days', n: Number(cadaN) },
        })
        setGuardando(false)

        if (!resultado.ok) {
          setError(resultado.error)
          return
        }

        toast.success('Movimiento recurrente creado')
        setAbierto(false)
        setMonto('')
        setDescripcion('')
        setCategoria('')
        router.refresh()
      }}
    >
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo">
        <Button
          type="button"
          variant={tipo === 'expense' ? 'default' : 'outline'}
          aria-pressed={tipo === 'expense'}
          onClick={() => {
            setTipo('expense')
            setCategoria('')
          }}
        >
          Gasto
        </Button>
        <Button
          type="button"
          variant={tipo === 'income' ? 'default' : 'outline'}
          aria-pressed={tipo === 'income'}
          onClick={() => {
            setTipo('income')
            setCategoria('')
          }}
        >
          Ingreso
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-descripcion">¿De qué se trata?</Label>
        <Input
          id="rec-descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="arriendo, suscripción de música…"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-monto">¿De cuánto?</Label>
        <Input
          id="rec-monto"
          value={monto}
          onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
          inputMode="decimal"
          placeholder="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rec-categoria">Categoría</Label>
        <Select value={categoria} onValueChange={(v) => setCategoria(v ?? '')}>
          <SelectTrigger id="rec-categoria" className="w-full">
            <SelectValue>
              {(valor) => findCategory(String(valor ?? ''))?.name ?? 'Elige una categoría'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categoriesFor(tipo).map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>¿Cada cuánto?</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={forma} onValueChange={(v) => setForma((v as Forma) ?? 'monthly')}>
            <SelectTrigger className="w-52" aria-label="Periodicidad">
              <SelectValue>
                {(valor) =>
                  valor === 'every-n-days' ? 'Cada cierto número de días' : 'Cada mes'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Cada mes</SelectItem>
              <SelectItem value="every-n-days">Cada cierto número de días</SelectItem>
            </SelectContent>
          </Select>

          {forma === 'monthly' ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">el día</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-20"
                aria-label="Día del mes"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">cada</span>
              <Input
                type="number"
                min={1}
                max={365}
                value={cadaN}
                onChange={(e) => setCadaN(e.target.value)}
                className="w-20"
                aria-label="Número de días"
              />
              <span className="text-sm text-muted-foreground">días</span>
            </div>
          )}
        </div>
        {forma === 'monthly' && Number(dia) > 28 && (
          // FR-003: la regla que el usuario no tiene por qué adivinar.
          <p className="text-xs text-muted-foreground">
            En los meses que no tengan día {dia}, el cobro se hará el último día
            del mes.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Crear'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
