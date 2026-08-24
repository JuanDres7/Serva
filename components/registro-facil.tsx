'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { descripcionCorta as recortarDescripcion } from '@/lib/domain/keywords'
import {
  formatWhileTyping,
  parseAmount,
  formatMoney,
  currencySymbol,
} from '@/lib/domain/money-format'
import { money, add, zero } from '@/lib/domain/money'
import { registrarMovimiento, anularMovimiento } from '@/lib/actions/transactions'
import { sugerirCategoria } from '@/lib/actions/categorize'

/* FR-003: ambas opciones visibles a la vez, con gasto preseleccionado. Un
   control que alterna entre estados no deja claro si muestra lo que es o lo que
   hará, y aquí ese error invierte el signo del monto. */
const TIPOS = [
  ['expense', 'Gasto'],
  ['income', 'Ingreso'],
] as const satisfies readonly (readonly [MovementKind, string])[]

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

  // Cada guardado incrementa este contador. Sirve de clave para que el barrido
  // de confirmación vuelva a montarse y, con ello, a correr.
  const [pulso, setPulso] = useState(0)

  // Contador de la sesión: da sensación de avance y evita registrar dos veces lo
  // mismo cuando se encadenan varios (FR-013).
  const [registrados, setRegistrados] = useState(0)
  const [totalSesion, setTotalSesion] = useState(() => zero(currency))

  // Sugerencia de la IA. `elegidaPorUsuario` es la que protege el Artículo II.3:
  // una vez la persona escoge, ninguna sugerencia posterior la pisa.
  const [logId, setLogId] = useState<string | null>(null)
  const [descripcionCorta, setDescripcionCorta] = useState<string | null>(null)
  const [categoriaSugerida, setCategoriaSugerida] = useState<string | null>(null)
  const [elegidaPorUsuario, setElegidaPorUsuario] = useState(false)
  const [pensando, setPensando] = useState(false)

  // FR-010: al abrir, el cursor ya está en el monto. Es un toque de menos, y es
  // el que más se nota.
  useEffect(() => {
    montoRef.current?.focus()
  }, [])

  const categorias = categoriesFor(tipo)
  const simbolo = currencySymbol(currency, locale)

  function cambiarTipo(nuevo: MovementKind) {
    setTipo(nuevo)
    // Las categorías del otro tipo no aplican (FR-004), y la sugerencia se
    // calculó para el tipo anterior.
    setCategoria('')
    setCategoriaSugerida(null)
    setElegidaPorUsuario(false)
    setLogId(null)
    setError(null)
  }

  function elegirCategoria(clave: string) {
    setCategoria(clave)
    // A partir de aquí manda el usuario (Art. II.3).
    setElegidaPorUsuario(true)
  }

  /**
   * Pide la sugerencia mientras la persona escribe, no solo al salir del campo.
   *
   * Esperar únicamente al blur obligaba a clickear fuera —o a dar Enter, que
   * registra— para que el sistema pensara. Con un retardo de 700 ms tras la
   * última tecla la categoría llega sola y Enter vuelve a significar solo una
   * cosa. El blur se conserva como atajo: si el foco ya se va, no hay motivo
   * para esperar al retardo.
   *
   * Cuatro protecciones para que pensar en vivo no cueste de más ni pise nada:
   * la clave deduplica texto+tipo ya pedidos, el contador descarta respuestas
   * que llegan tarde (manda lo que hay en pantalla ahora), `elegidaPorUsuario`
   * impide que cualquier sugerencia posterior pise la elección humana (Art.
   * II.3), y limpiar reinicia la clave para que el siguiente movimiento vuelva
   * a consultar aunque repita descripción —entre medias el sistema aprendió—.
   * Con menos de tres letras no se llama: casi nada clasifica ahí. Que todo
   * registro con descripción consulte al menos una vez importa: cada consulta
   * abre el registro de aprendizaje que guardar cierra con la categoría final,
   * y sin consulta no hay de qué aprender.
   */
  const peticionRef = useRef(0)
  const pedidaRef = useRef('')

  const pedirSugerencia = useCallback(
    async (texto: string) => {
      const limpia = texto.trim()
      if (limpia.length < 3) return

      const clave = `${tipo}:${limpia}`
      if (clave === pedidaRef.current) return
      pedidaRef.current = clave

      const id = ++peticionRef.current
      setPensando(true)
      try {
        const sugerencia = await sugerirCategoria(limpia, tipo)
        // Llegó tarde: ya se escribió algo distinto después de pedirlo.
        if (id !== peticionRef.current) return

        setLogId(sugerencia.logId)
        setDescripcionCorta(sugerencia.descripcionCorta || null)

        if (sugerencia.categoria && !elegidaPorUsuario) {
          setCategoria(sugerencia.categoria)
          setCategoriaSugerida(sugerencia.categoria)
        }
      } finally {
        if (id === peticionRef.current) setPensando(false)
      }
    },
    [tipo, elegidaPorUsuario],
  )

  useEffect(() => {
    const t = setTimeout(() => void pedirSugerencia(descripcion), 700)
    return () => clearTimeout(t)
  }, [descripcion, tipo, pedirSugerencia])

  function limpiar() {
    setMontoTexto('')
    setDescripcion('')
    setCategoria('')
    setCategoriaSugerida(null)
    setElegidaPorUsuario(false)
    setLogId(null)
    setDescripcionCorta(null)
    setError(null)
    // La misma descripción en el siguiente movimiento sí merece consulta
    // nueva: entre medias el sistema aprendió de la corrección del usuario.
    pedidaRef.current = ''
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
      // Si la sugerencia no llegó a tiempo —el usuario escribió y guardó de
      // inmediato—, la versión corta se calcula aquí. El historial debe ser
      // legible con IA o sin ella.
      descriptionShort:
        descripcionCorta ?? (descripcion.trim() ? recortarDescripcion(descripcion) : null),
      // Si la persona tocó el desplegable, la categoría es suya, venga de donde
      // venga la sugerencia previa.
      categorySource: elegidaPorUsuario || !categoriaSugerida ? 'user' : 'model',
      logId,
    })
    setGuardando(false)

    if (!resultado.ok) {
      // FR-011: se informa el motivo sin perder lo que el usuario escribió.
      setError(resultado.error)
      return
    }

    setRegistrados((n) => n + 1)
    setTotalSesion((total) => add(total, money(monto.cents, currency)))
    setPulso((n) => n + 1)

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
      {/* El pulgar se desliza hasta el tipo activo en vez de apagar uno y
          encender el otro: el recorrido dice hacia qué lado cambió el signo del
          monto, que aquí es la información que importa. */}
      <div
        className="relative grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
        role="group"
        aria-label="Tipo de movimiento"
      >
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.375rem)] rounded-full bg-card shadow-sm"
          style={{
            transform:
              tipo === 'expense' ? 'translateX(0)' : 'translateX(calc(100% + 0.25rem))',
            transition: 'transform var(--mov-medio) var(--ease-salida)',
          }}
        />
        {TIPOS.map(([valor, etiqueta]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={tipo === valor}
            onClick={() => cambiarTipo(valor)}
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tipo === valor
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {/*
        El monto es lo primero que se teclea y lo único que no se puede omitir,
        así que ocupa el lugar y el tamaño que le corresponde: una superficie
        propia con la cifra grande, sin la caja de un campo cualquiera. El
        símbolo va aparte porque no se escribe, se lee.
      */}
      <div className="superficie relative px-5 py-6 transition-colors focus-within:border-ring/60 sm:px-7 sm:py-7">
        {/* Confirmación de que quedó registrado: una banda de luz cruza el
            campo una vez. Dura lo que dura y no deja nada encendido, porque lo
            siguiente que hace la persona es teclear el monto siguiente. */}
        {pulso > 0 && (
          <span
            key={pulso}
            aria-hidden
            className="barrido pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          />
        )}
        <Label htmlFor="monto" className="eyebrow text-muted-foreground">
          ¿De cuánto fue {tipo === 'expense' ? 'el gasto' : 'el ingreso'}?
        </Label>
        <div className="mt-3 flex items-baseline gap-2">
          <span aria-hidden className="cifra text-2xl text-muted-foreground">
            {simbolo}
          </span>
          <input
            id="monto"
            ref={montoRef}
            name="monto"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={montoTexto}
            onChange={(e) => setMontoTexto(formatWhileTyping(e.target.value, locale))}
            className="cifra w-full min-w-0 bg-transparent text-4xl font-medium outline-none placeholder:text-muted-foreground/40 sm:text-5xl"
          />
        </div>
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
          // Salir del campo adelanta la consulta que el retardo haría igual:
          // quien pasa de la descripción al monto con Tab o clic no espera
          // 700 ms. El dedupe evita pedir dos veces lo mismo.
          onBlur={() => void pedirSugerencia(descripcion)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoria" className="flex items-center gap-2">
          Categoría
          {pensando && (
            <span className="text-xs font-normal text-muted-foreground">pensando…</span>
          )}
          {/* FR-002: la sugerencia se distingue de una elección propia. */}
          {!pensando && categoriaSugerida && categoria === categoriaSugerida && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
              sugerida
            </span>
          )}
        </Label>
        <Select value={categoria} onValueChange={(v) => elegirCategoria(v ?? '')}>
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
        <p role="alert" className="entra text-sm text-destructive">
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
        <p
          className="entra text-center text-sm text-muted-foreground"
          aria-live="polite"
        >
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
