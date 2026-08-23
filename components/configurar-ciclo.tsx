'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { definirCiclo } from '@/lib/actions/budgets'

type Forma = 'calendar-month' | 'monthly' | 'semi-monthly' | 'weekly' | 'every-n-days'

const OPCIONES: { valor: Forma; etiqueta: string; ayuda: string }[] = [
  {
    valor: 'calendar-month',
    etiqueta: 'Del 1 al último día del mes',
    ayuda: 'Lo habitual si tus ingresos no siguen un día fijo',
  },
  {
    valor: 'monthly',
    etiqueta: 'Una vez al mes, un día fijo',
    ayuda: 'Te pagan el 15, o el 30',
  },
  {
    valor: 'semi-monthly',
    etiqueta: 'Dos veces al mes',
    ayuda: 'El 15 y el 30, el 5 y el 20, el 10 y el 25…',
  },
  { valor: 'weekly', etiqueta: 'Cada semana', ayuda: 'Te pagan un día fijo de la semana' },
  { valor: 'every-n-days', etiqueta: 'Cada cierto número de días', ayuda: 'Cada 14 días, por ejemplo' },
]

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Configuración del ciclo de pago (spec 005, E1 · D-027).
 *
 * Se pregunta aquí y no en el primer arranque: allí habría interpelado a alguien
 * que todavía no sabe para qué sirve la respuesta, y muchos elegirían cualquier
 * cosa por avanzar. Una configuración mal puesta desde el inicio es peor que no
 * tenerla.
 */
export function ConfigurarCiclo() {
  const router = useRouter()
  const [forma, setForma] = useState<Forma>('calendar-month')
  const [dia, setDia] = useState('15')
  const [primerDia, setPrimerDia] = useState('15')
  const [segundoDia, setSegundoDia] = useState('30')
  const [diaSemana, setDiaSemana] = useState('1')
  const [cadaN, setCadaN] = useState('14')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function construir() {
    switch (forma) {
      case 'monthly':
        return { kind: 'monthly', day: Number(dia) }
      case 'semi-monthly':
        return {
          kind: 'semi-monthly',
          days: [Number(primerDia), Number(segundoDia)].sort((a, b) => a - b),
        }
      case 'weekly':
        return { kind: 'weekly', weekday: Number(diaSemana) }
      case 'every-n-days': {
        const hoy = new Date()
        return {
          kind: 'every-n-days',
          n: Number(cadaN),
          anchor: {
            year: hoy.getFullYear(),
            month: hoy.getMonth() + 1,
            day: hoy.getDate(),
          },
        }
      }
      default:
        return { kind: 'calendar-month' }
    }
  }

  return (
    <form
      className="space-y-6 rounded-lg border bg-card p-6"
      onSubmit={async (evento) => {
        evento.preventDefault()
        setError(null)

        if (forma === 'semi-monthly' && primerDia === segundoDia) {
          setError('Los dos días deben ser distintos')
          return
        }

        setGuardando(true)
        const resultado = await definirCiclo(construir())
        setGuardando(false)

        if (!resultado.ok) {
          setError(resultado.error)
          return
        }

        toast.success('Listo. Tus períodos se miden así de ahora en adelante.')
        router.refresh()
      }}
    >
      <header className="space-y-1">
        <h2 className="text-lg font-medium">¿Cada cuánto te pagan?</h2>
        <p className="text-sm text-muted-foreground">
          De esto depende qué período se mide. Si te pagan el 15, tu mes va del 15
          al 14, no del 1 al 31.
        </p>
      </header>

      <fieldset className="space-y-2">
        <legend className="sr-only">Ciclo de pago</legend>
        {OPCIONES.map((opcion) => (
          <label
            key={opcion.valor}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
              forma === opcion.valor ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="forma"
              value={opcion.valor}
              checked={forma === opcion.valor}
              onChange={() => setForma(opcion.valor)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">{opcion.etiqueta}</span>
              <span className="block text-xs text-muted-foreground">{opcion.ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {forma === 'monthly' && (
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="ciclo-dia">Día del mes</Label>
            <Input
              id="ciclo-dia"
              type="number"
              min={1}
              max={31}
              value={dia}
              onChange={(e) => setDia(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
      )}

      {forma === 'semi-monthly' && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="ciclo-primero">Primer día</Label>
            <Input
              id="ciclo-primero"
              type="number"
              min={1}
              max={31}
              value={primerDia}
              onChange={(e) => setPrimerDia(e.target.value)}
              className="w-24"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ciclo-segundo">Segundo día</Label>
            <Input
              id="ciclo-segundo"
              type="number"
              min={1}
              max={31}
              value={segundoDia}
              onChange={(e) => setSegundoDia(e.target.value)}
              className="w-24"
            />
          </div>
        </div>
      )}

      {forma === 'weekly' && (
        <div className="space-y-1">
          <Label htmlFor="ciclo-semana">Día de la semana</Label>
          <select
            id="ciclo-semana"
            value={diaSemana}
            onChange={(e) => setDiaSemana(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {DIAS_SEMANA.map((nombre, indice) => (
              <option key={nombre} value={indice}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {forma === 'every-n-days' && (
        <div className="space-y-1">
          <Label htmlFor="ciclo-n">Cada cuántos días</Label>
          <Input
            id="ciclo-n"
            type="number"
            min={1}
            max={365}
            value={cadaN}
            onChange={(e) => setCadaN(e.target.value)}
            className="w-24"
          />
        </div>
      )}

      {(forma === 'monthly' || forma === 'semi-monthly') && (
        // La regla que el usuario no tiene por qué adivinar (D-025).
        <p className="text-xs text-muted-foreground">
          En los meses que no tengan ese día, se usa el último día del mes. Los
          períodos no se mueven por fines de semana ni festivos.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={guardando}>
        {guardando ? 'Guardando…' : 'Continuar'}
      </Button>
    </form>
  )
}
