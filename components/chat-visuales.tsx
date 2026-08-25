'use client'

import { findCategory } from '@/lib/domain/categories'
import { GraficoRitmo } from '@/components/graficos'
import { TarjetaDeAccion } from '@/components/chat-accion'
import type { PuntoAcumulado } from '@/lib/domain/series'

/**
 * Lo que el chat dibuja además de escribir (spec 003, FR-006 y E3).
 *
 * Cada herramienta del asistente devuelve su resultado al cliente como una
 * parte del mensaje; hasta ahora la interfaz descartaba todas las que no eran
 * texto. Aquí se encaminan por el nombre de la herramienta que las produjo.
 *
 * **Sin protocolos de por medio (D-068).** El modelo, las herramientas y esta
 * interfaz son la misma aplicación, así que basta con leer lo que el SDK ya
 * envía. Los montos vienen en sus dos formas: la frase usa el texto que el
 * modelo ya citó, y la geometría usa el entero en centavos.
 *
 * Una herramienta sin visual no es un error: se ignora y el mensaje se queda
 * en su texto, que ya responde la pregunta.
 */

type Salida = Record<string, unknown>

export function VisualDeHerramienta({
  nombre,
  salida,
  currency,
  locale,
}: {
  readonly nombre: string
  readonly salida: Salida
  readonly currency: string
  readonly locale: string
}) {
  // Un conjunto vacío no se dibuja: una barra de longitud cero se lee como un
  // fallo de la interfaz, y el texto ya explica que no hay datos. Las de
  // escritura no tienen ese campo, así que no les afecta.
  if (salida.sinDatos === true || salida.sinReferencia === true) return null

  switch (nombre) {
    case 'gastoPorCategoria':
      return <Desglose categorias={comoLista(salida.categorias)} />
    case 'compararConPeriodoAnterior':
      return <Comparacion salida={salida} />
    case 'mayoresGastos':
      return <Desglose categorias={comoMayores(salida.gastos)} />
    case 'ritmoDelPeriodo':
      return <Ritmo salida={salida} currency={currency} locale={locale} />

    // Las tres de escritura comparten tarjeta: la pregunta que le hacen a la
    // persona es la misma, «¿esto está bien?», y solo cambian los verbos.
    case 'proponerMovimientos':
    case 'proponerCorreccion':
    case 'proponerAnulacion':
    // Las de deuda comparten tarjeta: la pregunta sigue siendo «¿esto está
    // bien?» (spec 011).
    case 'proponerDeuda':
    case 'proponerAbono':
    case 'proponerSaldarDeuda':
      return <TarjetaDeAccion salida={salida} />
    default:
      return null
  }
}

/** Marco común: separa el dibujo del texto sin encerrarlo en otra tarjeta. */
function Marco({ children }: { children: React.ReactNode }) {
  return <div className="entra mt-3 space-y-3">{children}</div>
}

type Fila = { clave: string; etiqueta: string; monto: string; parte: number }

/**
 * Barras horizontales, las mismas del resumen.
 *
 * Comparar longitudes es más preciso que comparar ángulos, y con trece
 * categorías un gráfico circular sería ilegible (D-034). Reutilizar el mismo
 * lenguaje que el resumen evita que el chat parezca otra aplicación.
 */
function Desglose({ categorias }: { categorias: readonly Fila[] }) {
  if (categorias.length === 0) return null
  const mayor = Math.max(...categorias.map((c) => c.parte))

  return (
    <Marco>
      <div className="escalonado space-y-2">
        {categorias.map((fila, i) => {
          const color = findCategory(fila.clave)?.color ?? 'var(--muted-foreground)'
          return (
            <div key={`${fila.clave}-${i}`} className="space-y-1">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="truncate">{fila.etiqueta}</span>
                </span>
                <span className="cifra shrink-0">{fila.monto}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="barra-crece h-full rounded-full"
                  style={{
                    width: `${mayor > 0 ? Math.round((fila.parte / mayor) * 100) : 0}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </Marco>
  )
}

/** Dos barras enfrentadas: este período contra el anterior. */
function Comparacion({ salida }: { salida: Salida }) {
  const actual = numero(salida.gastoActualCents)
  const anterior = numero(salida.gastoAnteriorCents)
  if (actual === null || anterior === null) return null

  const mayor = Math.max(actual, anterior, 1)
  const barras = [
    { etiqueta: texto(salida.periodoAnterior) ?? 'Período anterior', cents: anterior, monto: texto(salida.gastoAnterior) },
    { etiqueta: texto(salida.periodoActual) ?? 'Este período', cents: actual, monto: texto(salida.gastoActual) },
  ]

  return (
    <Marco>
      <div className="space-y-3">
        {barras.map((barra, i) => (
          <div key={barra.etiqueta} className="space-y-1">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="eyebrow text-muted-foreground">{barra.etiqueta}</span>
              <span className="cifra">{barra.monto}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="barra-crece h-full rounded-full"
                style={{
                  width: `${Math.round((barra.cents / mayor) * 100)}%`,
                  // El período anterior va apagado: es la referencia, no el
                  // protagonista, igual que en el gráfico del resumen.
                  backgroundColor: i === 0 ? 'var(--muted-foreground)' : 'var(--primary)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Marco>
  )
}

/** La misma línea acumulada del resumen, dentro del mensaje. */
function Ritmo({
  salida,
  currency,
  locale,
}: {
  salida: Salida
  currency: string
  locale: string
}) {
  const puntos = salida.puntos
  if (!Array.isArray(puntos) || puntos.length === 0) return null

  return (
    <Marco>
      <GraficoRitmo
        datos={puntos as PuntoAcumulado[]}
        currency={currency}
        locale={locale}
      />
    </Marco>
  )
}

/* Lectura defensiva: la salida de una herramienta llega como JSON sin tipar, y
   una forma inesperada debe dejar el mensaje en su texto, no romperlo. */

function numero(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' ? valor : undefined
}

function comoLista(valor: unknown): Fila[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((entrada) => {
    if (typeof entrada !== 'object' || entrada === null) return []
    const e = entrada as Salida
    const cents = numero(e.montoCents)
    const etiqueta = texto(e.categoria)
    const monto = texto(e.monto)
    if (cents === null || !etiqueta || !monto) return []
    return [{ clave: texto(e.clave) ?? '', etiqueta, monto, parte: cents }]
  })
}

function comoMayores(valor: unknown): Fila[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((entrada) => {
    if (typeof entrada !== 'object' || entrada === null) return []
    const e = entrada as Salida
    const cents = numero(e.montoCents)
    const etiqueta = texto(e.descripcion)
    const monto = texto(e.monto)
    if (cents === null || !etiqueta || !monto) return []
    return [{ clave: texto(e.clave) ?? '', etiqueta, monto, parte: cents }]
  })
}
