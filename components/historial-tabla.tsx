'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { categoriesFor, findCategory, type MovementKind } from '@/lib/domain/categories'
import { formatMoney, formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { toISO, type CivilDate } from '@/lib/domain/civil-date'
import { currencyDecimals } from '@/lib/domain/money'
import {
  registrarMovimiento,
  actualizarMovimiento,
  anularMovimiento,
  restaurarMovimiento,
} from '@/lib/actions/transactions'

export type MovimientoVista = {
  readonly id: string
  readonly type: 'expense' | 'income' | 'saving'
  readonly amountCents: number
  readonly category: string | null
  readonly occurredOn: string
  readonly description: string | null
  readonly descriptionShort: string | null
  readonly status: 'active' | 'voided'
}

type Props = {
  readonly movimientos: readonly MovimientoVista[]
  readonly currency: string
  readonly locale: string
  readonly hoy: CivilDate
}

export function HistorialTabla({ movimientos, currency, locale, hoy }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const hoyISO = toISO(hoy)

  if (movimientos.length === 0 && !creando) {
    return (
      <div className="space-y-3">
        <BotonAgregar onClick={() => setCreando(true)} deshabilitado={creando} />
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No hay movimientos que coincidan con estos filtros.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <BotonAgregar onClick={() => setCreando(true)} deshabilitado={creando} />
      <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Fecha</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-44">Categoría</TableHead>
            <TableHead className="w-36 text-right">Monto</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {creando && (
            <FilaNueva
              currency={currency}
              locale={locale}
              hoy={hoyISO}
              onCerrar={() => setCreando(false)}
            />
          )}

          {movimientos.map((movimiento) =>
            editando === movimiento.id ? (
              <FilaEdicion
                key={movimiento.id}
                movimiento={movimiento}
                currency={currency}
                locale={locale}
                hoy={hoyISO}
                onCerrar={() => setEditando(null)}
              />
            ) : (
              <FilaLectura
                key={movimiento.id}
                movimiento={movimiento}
                locale={locale}
                currency={currency}
                onEditar={() => setEditando(movimiento.id)}
                onCambio={() => router.refresh()}
              />
            ),
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  )
}

function BotonAgregar({
  onClick,
  deshabilitado,
}: {
  onClick: () => void
  deshabilitado: boolean
}) {
  return (
    <div className="flex justify-end">
      <Button size="sm" variant="outline" onClick={onClick} disabled={deshabilitado}>
        + Agregar movimiento
      </Button>
    </div>
  )
}

/**
 * Alta de un movimiento desde la propia tabla (FR-019).
 *
 * Usa la misma acción y las mismas validaciones que Registro Fácil: un movimiento
 * creado aquí es indistinguible de uno creado allá. Duplicar la lógica
 * garantizaría que ambas vías se desincronicen (D-016).
 */
function FilaNueva({
  currency,
  locale,
  hoy,
  onCerrar,
}: {
  currency: string
  locale: string
  hoy: string
  onCerrar: () => void
}) {
  const router = useRouter()
  const [tipo, setTipo] = useState<MovementKind>('expense')
  const [fecha, setFecha] = useState(hoy)
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [monto, setMonto] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      let parseado
      try {
        parseado = parseAmount(monto, currency, locale)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Monto inválido')
        return
      }
      if (!parseado || parseado.cents <= 0) {
        toast.error('Escribe cuánto fue')
        return
      }
      // Misma regla que Registro Fácil: o describes, o eliges categoría.
      if (!descripcion.trim() && !categoria) {
        toast.error('Escribe en qué fue, o elige una categoría')
        return
      }

      const resultado = await registrarMovimiento({
        type: tipo,
        amountCents: parseado.cents,
        category: categoria || (tipo === 'expense' ? 'other_expense' : 'other_income'),
        occurredOn: fecha,
        description: descripcion.trim() || null,
      })

      if (!resultado.ok) {
        toast.error(resultado.error)
        return
      }

      toast.success('Movimiento registrado')
      onCerrar()
      router.refresh()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TableRow className="bg-primary/5">
      <TableCell>
        <Input
          type="date"
          value={fecha}
          max={hoy}
          onChange={(e) => setFecha(e.target.value)}
          className="h-8"
          aria-label="Fecha del nuevo movimiento"
        />
      </TableCell>

      <TableCell>
        <Input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="¿En qué?"
          className="h-8"
          aria-label="Descripción del nuevo movimiento"
          autoFocus
        />
      </TableCell>

      <TableCell>
        <div className="space-y-1">
          <Select
            value={tipo}
            onValueChange={(v) => {
              setTipo(((v as MovementKind) ?? 'expense'))
              setCategoria('')
            }}
          >
            <SelectTrigger className="h-8 w-full" aria-label="Tipo del nuevo movimiento">
              <SelectValue>
                {(valor) => (valor === 'income' ? 'Ingreso' : 'Gasto')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Gasto</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoria} onValueChange={(v) => setCategoria(v ?? '')}>
            <SelectTrigger
              className="h-8 w-full"
              aria-label="Categoría del nuevo movimiento"
            >
              <SelectValue>
                {(valor) => findCategory(String(valor ?? ''))?.name ?? 'Categoría'}
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
      </TableCell>

      <TableCell>
        <Input
          value={monto}
          onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
          inputMode="decimal"
          placeholder="0"
          className="h-8 text-right tabular-nums"
          aria-label="Monto del nuevo movimiento"
        />
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="xs" onClick={guardar} disabled={guardando}>
            Guardar
          </Button>
          <Button size="xs" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function FilaLectura({
  movimiento,
  locale,
  currency,
  onEditar,
  onCambio,
}: {
  movimiento: MovimientoVista
  locale: string
  currency: string
  onEditar: () => void
  onCambio: () => void
}) {
  const anulado = movimiento.status === 'voided'
  const categoria = movimiento.category ? findCategory(movimiento.category) : undefined
  const signo = movimiento.type === 'income' ? '+' : '−'

  return (
    <TableRow className={anulado ? 'opacity-50' : undefined}>
      <TableCell className="text-sm text-muted-foreground tabular-nums">
        {new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(`${movimiento.occurredOn}T00:00:00Z`))}
      </TableCell>

      <TableCell className={anulado ? 'line-through' : undefined}>
        {/* Se muestra la versión corta cuando existe: un historial lleno de
            frases largas se vuelve ilegible de un vistazo (D-012). */}
        {movimiento.descriptionShort || movimiento.description || (
          <span className="text-muted-foreground">Sin descripción</span>
        )}
      </TableCell>

      <TableCell>
        {categoria ? (
          <span className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: categoria.color }}
              aria-hidden
            />
            {categoria.name}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Ahorro</span>
        )}
      </TableCell>

      <TableCell
        className={`text-right tabular-nums ${
          movimiento.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''
        }`}
      >
        {signo}{' '}
        {formatMoney({ cents: movimiento.amountCents, currency }, locale)}
      </TableCell>

      <TableCell className="text-right">
        {anulado ? (
          <Button
            size="xs"
            variant="ghost"
            onClick={async () => {
              const r = await restaurarMovimiento(movimiento.id)
              if (r.ok) {
                toast('Movimiento restaurado')
                onCambio()
              }
            }}
          >
            Restaurar
          </Button>
        ) : (
          <div className="flex justify-end gap-1">
            <Button size="xs" variant="ghost" onClick={onEditar}>
              Editar
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={async () => {
                const r = await anularMovimiento(movimiento.id)
                if (!r.ok) {
                  toast.error(r.error)
                  return
                }
                // Anular no borra: se puede deshacer al instante o más tarde
                // desde el filtro de anulados (Art. VII).
                toast('Movimiento anulado', {
                  action: {
                    label: 'Deshacer',
                    onClick: async () => {
                      await restaurarMovimiento(movimiento.id)
                      onCambio()
                    },
                  },
                })
                onCambio()
              }}
            >
              Anular
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
}

function FilaEdicion({
  movimiento,
  currency,
  locale,
  hoy,
  onCerrar,
}: {
  movimiento: MovimientoVista
  currency: string
  locale: string
  hoy: string
  onCerrar: () => void
}) {
  const router = useRouter()
  // El monto se edita en la unidad que el usuario ve, no en la unidad mínima:
  // se convierte con los decimales de la moneda y se devuelve a centavos al
  // guardar, sin coma flotante intermedia.
  const [monto, setMonto] = useState(() => {
    const decimales = currencyDecimals(currency)
    const texto = String(movimiento.amountCents).padStart(decimales + 1, '0')
    const entera = texto.slice(0, texto.length - decimales) || '0'
    const fraccion = decimales > 0 ? texto.slice(texto.length - decimales) : ''
    const separador = locale.startsWith('en') ? '.' : ','
    const limpia = fraccion.replace(/0+$/, '')
    return formatWhileTyping(limpia ? `${entera}${separador}${limpia}` : entera, locale)
  })
  const [descripcion, setDescripcion] = useState(movimiento.description ?? '')
  const [categoria, setCategoria] = useState(movimiento.category ?? '')
  const [fecha, setFecha] = useState(movimiento.occurredOn)
  const [guardando, setGuardando] = useState(false)

  const esAhorro = movimiento.type === 'saving'
  const categorias = esAhorro ? [] : categoriesFor(movimiento.type as MovementKind)

  async function guardar() {
    setGuardando(true)
    try {
      const parseado = parseAmount(monto, currency, locale)
      if (!parseado || parseado.cents <= 0) {
        toast.error('El monto debe ser mayor que cero')
        return
      }

      const resultado = await actualizarMovimiento(movimiento.id, {
        amountCents: parseado.cents,
        category: esAhorro ? null : categoria,
        occurredOn: fecha,
        description: descripcion.trim() || null,
      })

      if (!resultado.ok) {
        toast.error(resultado.error)
        return
      }

      toast.success('Movimiento actualizado')
      onCerrar()
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TableRow className="bg-muted/40">
      <TableCell>
        <Input
          type="date"
          value={fecha}
          max={hoy}
          onChange={(e) => setFecha(e.target.value)}
          className="h-8"
          aria-label="Fecha"
        />
      </TableCell>

      <TableCell>
        <Input
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Sin descripción"
          className="h-8"
          aria-label="Descripción"
        />
      </TableCell>

      <TableCell>
        {esAhorro ? (
          <span className="text-sm text-muted-foreground">Ahorro</span>
        ) : (
          <Select value={categoria} onValueChange={(v) => setCategoria(v ?? '')}>
            <SelectTrigger className="h-8 w-full" aria-label="Categoría">
              <SelectValue>
                {(valor) => findCategory(String(valor ?? ''))?.name ?? 'Categoría'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>

      <TableCell>
        <Input
          value={monto}
          onChange={(e) => setMonto(formatWhileTyping(e.target.value, locale))}
          inputMode="decimal"
          className="h-8 text-right tabular-nums"
          aria-label="Monto"
        />
      </TableCell>

      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button size="xs" onClick={guardar} disabled={guardando}>
            Guardar
          </Button>
          <Button size="xs" variant="ghost" onClick={onCerrar}>
            Cancelar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
