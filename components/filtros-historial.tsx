'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CATEGORIES, findCategory } from '@/lib/domain/categories'

type Props = {
  readonly tipo?: string
  readonly categoria?: string
  readonly incluirAnulados: boolean
  readonly offsetPeriodo: number
}

const TODOS = '__todos__'

const ETIQUETAS_TIPO: Record<string, string> = {
  [TODOS]: 'Todos los tipos',
  expense: 'Gastos',
  income: 'Ingresos',
  saving: 'Ahorro',
}

export function FiltrosHistorial({
  tipo,
  categoria,
  incluirAnulados,
  offsetPeriodo,
}: Props) {
  const router = useRouter()

  function navegar(cambios: Record<string, string | undefined>) {
    const url = new URLSearchParams()
    const actual: Record<string, string | undefined> = {
      p: offsetPeriodo === 0 ? undefined : String(offsetPeriodo),
      tipo,
      categoria,
      anulados: incluirAnulados ? '1' : undefined,
      ...cambios,
    }
    for (const [clave, valor] of Object.entries(actual)) {
      if (valor) url.set(clave, valor)
    }
    const cadena = url.toString()
    router.push(cadena ? `/historial?${cadena}` : '/historial')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
      <Select
        value={tipo ?? TODOS}
        onValueChange={(v) => navegar({ tipo: v === TODOS ? undefined : (v ?? undefined) })}
      >
        <SelectTrigger className="w-40" aria-label="Filtrar por tipo">
          <SelectValue>
            {(valor) => ETIQUETAS_TIPO[String(valor ?? TODOS)] ?? 'Todos los tipos'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos los tipos</SelectItem>
          <SelectItem value="expense">Gastos</SelectItem>
          <SelectItem value="income">Ingresos</SelectItem>
          <SelectItem value="saving">Ahorro</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={categoria ?? TODOS}
        onValueChange={(v) =>
          navegar({ categoria: v === TODOS ? undefined : (v ?? undefined) })
        }
      >
        <SelectTrigger className="w-52" aria-label="Filtrar por categoría">
          <SelectValue>
            {(valor) =>
              findCategory(String(valor ?? ''))?.name ?? 'Todas las categorías'
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todas las categorías</SelectItem>
          {CATEGORIES.map((c) => (
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

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={incluirAnulados}
          onChange={(e) => navegar({ anulados: e.target.checked ? '1' : undefined })}
          className="size-4 rounded border-input"
        />
        Mostrar anulados
      </label>
    </div>
  )
}
