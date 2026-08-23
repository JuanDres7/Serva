'use client'

import { useEffect, useRef, useState } from 'react'
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
import { formatWhileTyping, parseAmount, formatMoney } from '@/lib/domain/money-format'
import { money, add, zero } from '@/lib/domain/money'
import { registrarMovimiento, anularMovimiento } from '@/lib/actions/transactions'

type Props = {
  readonly currency: string
  readonly locale: string
  /** Fecha de hoy en la zona del usuario, calculada en el servidor. */
  readonly hoy: string
}

export function RegistroFacil({ currency, locale, hoy }: Props) {
  const router = useRouter()
  const montoRef = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState<MovementKind>('expense')
  const [montoTexto, setMontoTexto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState<string>('')
  const [fecha, setFecha] = useState(hoy)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Contador de la sesión: da sensación de avance y evita registrar dos veces lo
  // mismo cuando se encadenan varios (FR-013).
  const [registrados, setRegistrados] = useState(0)
  const [totalSesion, setTotalSesion] = useState(() => zero(currency))

  // FR-010: al abrir, el cursor ya está en el monto. Es un toque de menos, y es
  // el que más se nota.
  useEffect(() => {
    montoRef.current?.focus()
  }, [])

  const categorias = categoriesFor(tipo)

  function cambiarTipo(nuevo: MovementKind) {
    setTipo(nuevo)
    // Las categorías del otro tipo no aplican (FR-004).
    setCategoria('')
    setError(null)
  }

  function limpiar() {
    setMontoTexto('')
    setDescripcion('')
    setCategoria('')
    setError(null)
    montoRef.current?.focus()
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)

    let monto
    try {
      monto = parseAmount(montoTexto, currency, locale)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Monto inválido')
      return
    }
    if (!monto || monto.cents <= 0) {
      setError('Escribe cuánto fue')
      montoRef.current?.focus()
      return
    }

    // FR-006: o describes, o eliges categoría. Nunca se exigen ambas.
    const sinDescripcion = descripcion.trim() === ''
    if (sinDescripcion && !categoria) {
      setError('Escribe en qué fue, o elige una categoría')
      return
    }

    setGuardando(true)
    const resultado = await registrarMovimiento({
      type: tipo,
      amountCents: monto.cents,
      category: categoria || categoriaPorDefecto(tipo),
      occurredOn: fecha,
      description: descripcion.trim() || null,
    })
    setGuardando(false)

    if (!resultado.ok) {
      // FR-011: se informa el motivo sin perder lo que el usuario escribió.
      setError(resultado.error)
      return
    }

    setRegistrados((n) => n + 1)
    setTotalSesion((total) => add(total, money(monto.cents, currency)))

    // FR-012: confirmación visible y posibilidad de deshacer sin salir del flujo.
    toast.success(`${tipo === 'expense' ? 'Gasto' : 'Ingreso'} registrado`, {
      description: formatMoney(monto, locale),
      action: {
        label: 'Deshacer',
        onClick: async () => {
          await anularMovimiento(resultado.id)
          setRegistrados((n) => Math.max(0, n - 1))
          setTotalSesion((total) =>
            money(Math.max(0, total.cents - monto.cents), currency),
          )
          toast('Movimiento deshecho')
          router.refresh()
        },
      },
    })

    limpiar()
    router.refresh()
  }

  return (
    <form onSubmit={guardar} className="space-y-6">
      {/* FR-003: ambas opciones visibles a la vez, con gasto preseleccionado. Un
          control que alterna entre estados no deja claro si muestra lo que es o lo
          que hará, y aquí ese error invierte el signo del monto. */}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de movimiento">
        <Button
          type="button"
          variant={tipo === 'expense' ? 'default' : 'outline'}
          aria-pressed={tipo === 'expense'}
          onClick={() => cambiarTipo('expense')}
        >
          Gasto
        </Button>
        <Button
          type="button"
          variant={tipo === 'income' ? 'default' : 'outline'}
          aria-pressed={tipo === 'income'}
          onClick={() => cambiarTipo('income')}
        >
          Ingreso
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="monto" className="text-base">
          ¿De cuánto fue {tipo === 'expense' ? 'el gasto' : 'el ingreso'}?
        </Label>
        <Input
          id="monto"
          ref={montoRef}
          name="monto"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={montoTexto}
          onChange={(e) => setMontoTexto(formatWhileTyping(e.target.value, locale))}
          className="h-14 text-2xl font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion">¿En qué?</Label>
        <Input
          id="descripcion"
          name="descripcion"
          autoComplete="off"
          placeholder="almuerzo, mercado de la semana…"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria">Categoría</Label>
        <Select value={categoria} onValueChange={(v) => setCategoria(v ?? '')}>
          <SelectTrigger id="categoria" className="w-full">
            {/* El valor guardado es la clave interna. Sin esta función, el
                selector mostraría «eating_out» en lugar de «Comidas fuera». */}
            <SelectValue>
              {(valor) =>
                findCategory(String(valor ?? ''))?.name ?? 'Elige una categoría'
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                    aria-hidden
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fecha">¿Cuándo?</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={fecha === hoy ? 'secondary' : 'ghost'}
            onClick={() => setFecha(hoy)}
          >
            Hoy
          </Button>
          <Button
            type="button"
            size="sm"
            variant={fecha === ayerDe(hoy) ? 'secondary' : 'ghost'}
            onClick={() => setFecha(ayerDe(hoy))}
          >
            Ayer
          </Button>
          <Input
            id="fecha"
            type="date"
            value={fecha}
            max={hoy}
            onChange={(e) => setFecha(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row">
        <Button type="submit" className="flex-1" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Registrar y seguir'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/')}
        >
          Terminar
        </Button>
      </div>

      {registrados > 0 && (
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          Llevas {registrados} {registrados === 1 ? 'registro' : 'registros'} ·{' '}
          {formatMoney(totalSesion, locale)}
        </p>
      )}
    </form>
  )
}

/** Cuando el usuario no elige categoría, el movimiento va a «Otros». */
function categoriaPorDefecto(tipo: MovementKind): string {
  return tipo === 'expense' ? 'other_expense' : 'other_income'
}

function ayerDe(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(y!, m! - 1, d! - 1))
  return fecha.toISOString().slice(0, 10)
}
