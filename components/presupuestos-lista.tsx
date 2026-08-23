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
import { categoriesFor, findCategory } from '@/lib/domain/categories'
import { formatMoney, formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { definirPresupuesto, quitarPresupuesto } from '@/lib/actions/budgets'

export type PresupuestoVista = {
  readonly id: string
  readonly categoria: string
  readonly topeCents: number
  readonly gastadoCents: number
  readonly porcentaje: number
  readonly restanteCents: number
  readonly nivel: 'holgado' | 'cerca' | 'excedido'
  readonly mensaje: string
}

export type SugerenciaVista = {
  readonly categoria: string
  readonly promedioCents: number
  readonly sugeridoCents: number
}

const COLOR_POR_NIVEL: Record<PresupuestoVista['nivel'], string> = {
  holgado: 'bg-primary',
  cerca: 'bg-amber-500',
  excedido: 'bg-destructive',
}

export function PresupuestosLista({
  presupuestos,
  sugerencias,
  currency,
  locale,
}: {
  presupuestos: readonly PresupuestoVista[]
  sugerencias: readonly SugerenciaVista[]
  currency: string
  locale: string
}) {
  const router = useRouter()
  const dinero = (cents: number) => formatMoney({ cents, currency }, locale)

  return (
    <div className="space-y-6">
      {presupuestos.length > 0 && (
        <div className="space-y-4">
          {presupuestos.map((presupuesto) => {
            const categoria = findCategory(presupuesto.categoria)
            return (
              <div key={presupuesto.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    {categoria && (
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: categoria.color }}
                        aria-hidden
                      />
                    )}
                    {categoria?.name}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {dinero(presupuesto.gastadoCents)} de {dinero(presupuesto.topeCents)}
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${COLOR_POR_NIVEL[presupuesto.nivel]}`}
                    style={{ width: `${Math.min(100, presupuesto.porcentaje)}%` }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Nunca se regaña: informar de cuánto queda y cuántos días
                      faltan dice lo mismo sin castigar (FR-010). */}
                  <p className="text-sm text-muted-foreground">
                    {presupuesto.restanteCents >= 0
                      ? `Te quedan ${dinero(presupuesto.restanteCents)}. `
                      : `Vas ${dinero(-presupuesto.restanteCents)} por encima. `}
                    {presupuesto.mensaje}
                  </p>

                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={`Quitar el tope de ${categoria?.name}`}
                    onClick={async () => {
                      const r = await quitarPresupuesto(presupuesto.id)
                      if (!r.ok) {
                        toast.error(r.error)
                        return
                      }
                      toast('Tope eliminado')
                      router.refresh()
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sugerencias.length > 0 && (
        <section className="space-y-3 rounded-lg border border-dashed p-4">
          <header>
            <h2 className="text-sm font-medium">Con tus datos</h2>
            <p className="text-xs text-muted-foreground">
              Esto es lo que gastas en promedio. Un tope que parte de tu realidad
              se sostiene; uno inventado se abandona en la segunda semana.
            </p>
          </header>

          <ul className="space-y-2">
            {sugerencias.map((sugerencia) => {
              const categoria = findCategory(sugerencia.categoria)
              return (
                <li
                  key={sugerencia.categoria}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{categoria?.name}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · gastas {dinero(sugerencia.promedioCents)} en promedio
                    </span>
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={async () => {
                      const r = await definirPresupuesto(
                        sugerencia.categoria,
                        sugerencia.sugeridoCents,
                      )
                      if (!r.ok) {
                        toast.error(r.error)
                        return
                      }
                      toast.success(`Tope de ${dinero(sugerencia.sugeridoCents)} puesto`)
                      router.refresh()
                    }}
                  >
                    Poner {dinero(sugerencia.sugeridoCents)}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <NuevoPresupuesto
        yaDefinidas={presupuestos.map((p) => p.categoria)}
        currency={currency}
        locale={locale}
      />
    </div>
  )
}

function NuevoPresupuesto({
  yaDefinidas,
  currency,
  locale,
}: {
  yaDefinidas: readonly string[]
  currency: string
  locale: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [categoria, setCategoria] = useState('')
  const [tope, setTope] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Un solo presupuesto por categoría: las ya definidas no vuelven a ofrecerse.
  const disponibles = categoriesFor('expense').filter((c) => !yaDefinidas.includes(c.key))

  if (!abierto) {
    return (
      <Button variant="outline" onClick={() => setAbierto(true)}>
        + Poner tope a otra categoría
      </Button>
    )
  }

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-4"
      onSubmit={async (evento) => {
        evento.preventDefault()
        setError(null)

        if (!categoria) {
          setError('Elige una categoría')
          return
        }

        let parseado
        try {
          parseado = parseAmount(tope, currency, locale)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Monto inválido')
          return
        }
        if (!parseado || parseado.cents <= 0) {
          setError('Escribe el tope')
          return
        }

        setGuardando(true)
        const resultado = await definirPresupuesto(categoria, parseado.cents)
        setGuardando(false)

        if (!resultado.ok) {
          setError(resultado.error)
          return
        }

        toast.success('Tope guardado')
        setAbierto(false)
        setCategoria('')
        setTope('')
        router.refresh()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="presupuesto-categoria">Categoría</Label>
        <Select value={categoria} onValueChange={(v) => setCategoria(v ?? '')}>
          <SelectTrigger id="presupuesto-categoria" className="w-full">
            <SelectValue>
              {(valor) => findCategory(String(valor ?? ''))?.name ?? 'Elige una categoría'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {disponibles.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="presupuesto-tope">¿Cuánto como máximo?</Label>
        <Input
          id="presupuesto-tope"
          value={tope}
          onChange={(e) => setTope(formatWhileTyping(e.target.value, locale))}
          inputMode="decimal"
          placeholder="0"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
