'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { findCategory } from '@/lib/domain/categories'
import {
  confirmarAccion,
  revertirAccion,
  cancelarAccion,
  confirmarYActivar,
} from '@/lib/actions/asistente'

/**
 * La tarjeta de acción (spec 010, FR-012 y FR-023).
 *
 * Cuenta en una frase qué hizo o qué va a hacer Serva, y debajo pone dos
 * botones. Los verbos cambian con el momento: antes de escribir son «confirmar»
 * y «cancelar»; después, «está bien» y «revertir». Misma pieza, distinto
 * momento, porque la pregunta que se le hace a la persona es la misma: ¿esto
 * está bien?
 *
 * La primera vez que Serva va a escribir aparece además la tercera salida
 * —«sí, y no preguntes más»—, que es la activación consciente que exige el
 * Artículo II.1. Vive aquí y no en Ajustes: mandar a alguien a otra pantalla
 * para activar algo que solo ocurre en el chat es hacerle recorrer la
 * aplicación para no tener que recorrerla.
 */

type Movimiento = {
  descripcion: string
  monto: string
  categoria: string
  clave: string
  fecha: string
  tipo: string
  programado: boolean
}

type Salida = {
  resultado?: string
  propuestaId?: string
  motivo?: string
  explicacion?: string
  movimientos?: Movimiento[]
  faltan?: { descripcion: string; falta: string }[]
  primeraVez?: boolean
  revertible?: boolean
  afectado?: {
    descripcion: string
    montoAntes: string
    montoDespues: string | null
    fecha: string
  }
  candidatos?: { descripcion: string; monto: string; fecha: string }[]
  buscado?: string
  /** En qué quedó la propuesta, puesto al recargar la conversación (D-076). */
  estadoGuardado?: string
  /** Deudas (spec 011). */
  deuda?: {
    contraparte: string
    direccion: string
    monto?: string
    saldo?: string
    vence?: string | null
  }
  abono?: {
    contraparte: string
    monto: string
    saldoAntes: string
    saldoDespues: string
    salda: boolean
  }
}

type Estado = 'pendiente' | 'confirmada' | 'revertida' | 'cancelada' | 'caducada'

/**
 * Con qué estado nace la tarjeta.
 *
 * Recién emitida solo se sabe lo que contestó la herramienta. Recargada desde
 * la conversación guardada viene además `estadoGuardado`, que es el único que
 * dice la verdad días después: sin él, algo ya confirmado vuelve a pedir
 * confirmación y el botón no hace nada visible al pulsarlo.
 */
function estadoInicial(salida: Salida): Estado {
  switch (salida.estadoGuardado) {
    case 'aplicada':
      return 'confirmada'
    case 'revertida':
      return 'revertida'
    case 'rechazada':
      return 'cancelada'
    case 'caducada':
      return 'caducada'
    case 'propuesta':
      return 'pendiente'
  }

  return salida.resultado === 'registrado' ? 'confirmada' : 'pendiente'
}

export function TarjetaDeAccion({ salida }: { salida: Salida }) {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>(() => estadoInicial(salida))
  const [ocupada, setOcupada] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const id = salida.propuestaId

  async function ejecutar(
    accion: (id: string) => Promise<{ ok: boolean; mensaje?: string }>,
    siguiente: Estado,
  ) {
    if (!id || ocupada) return
    setOcupada(true)
    setError(null)

    const resultado = await accion(id)
    setOcupada(false)

    if (!resultado.ok) {
      setError(resultado.mensaje ?? 'No se pudo.')
      return
    }

    setEstado(siguiente)
    router.refresh()
  }

  if (salida.resultado === 'rechazado') {
    return <Aviso>{salida.motivo}</Aviso>
  }

  if (salida.resultado === 'no-encontrado') {
    return <Aviso>No encontré nada que coincida con «{salida.buscado}».</Aviso>
  }

  if (salida.resultado === 'falta-fecha') {
    return <Aviso>{salida.motivo}</Aviso>
  }

  if (salida.resultado === 'varias-coincidencias') {
    return (
      <Marco>
        <p className="text-sm text-muted-foreground">
          Encontré varios. ¿Cuál de estos?
        </p>
        <ul className="space-y-1.5">
          {salida.candidatos?.map((c, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="truncate">{c.descripcion}</span>
              <span className="cifra shrink-0 text-muted-foreground">{c.monto}</span>
            </li>
          ))}
        </ul>
      </Marco>
    )
  }

  const resuelta = estado !== 'pendiente'

  return (
    <Marco>
      {salida.movimientos && salida.movimientos.length > 0 && (
        <ul className="escalonado space-y-2">
          {salida.movimientos.map((m, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: findCategory(m.clave)?.color ?? 'var(--muted)' }}
                />
                <span className="truncate">{m.descripcion}</span>
                <span className="eyebrow shrink-0 text-muted-foreground">
                  {m.programado ? 'programado' : m.categoria}
                </span>
              </span>
              <span className="cifra shrink-0">
                {m.tipo === 'income' ? '+' : '–'} {m.monto}
              </span>
            </li>
          ))}
        </ul>
      )}

      {salida.afectado && (
        <div className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate">{salida.afectado.descripcion}</span>
            <span className="cifra shrink-0">
              {salida.afectado.montoDespues ? (
                <>
                  <span className="text-muted-foreground line-through">
                    {salida.afectado.montoAntes}
                  </span>{' '}
                  {salida.afectado.montoDespues}
                </>
              ) : (
                salida.afectado.montoAntes
              )}
            </span>
          </div>
        </div>
      )}

      {salida.deuda && (
        <div className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">{salida.deuda.contraparte}</span>
              <span className="eyebrow shrink-0 text-muted-foreground">
                {salida.deuda.direccion}
              </span>
            </span>
            <span className="cifra shrink-0">
              {salida.deuda.monto ?? salida.deuda.saldo}
            </span>
          </div>
          {salida.deuda.vence && (
            <p className="text-xs text-muted-foreground">Vence el {salida.deuda.vence}</p>
          )}
        </div>
      )}

      {salida.abono && (
        <div className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate">Abono a {salida.abono.contraparte}</span>
            <span className="cifra shrink-0">– {salida.abono.monto}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {salida.abono.salda
              ? 'Con esto queda saldada.'
              : `Quedarían ${salida.abono.saldoDespues}.`}
          </p>
        </div>
      )}

      {salida.faltan && salida.faltan.length > 0 && (
        <p className="text-sm text-muted-foreground">
          De {salida.faltan.map((f) => `«${f.descripcion}»`).join(' y ')} me falta
          {salida.faltan.length === 1 ? ' el monto' : ' el monto'}. ¿Cuánto fue?
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Una tarjeta resuelta se lee como algo que pasó, no como algo que
          espera respuesta (T-432). Sigue en pantalla porque la conversación se
          guarda siete días, así que tiene que envejecer bien. */}
      {resuelta ? (
        <p className="eyebrow text-muted-foreground">{leyenda(estado, salida)}</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            disabled={ocupada}
            onClick={() => ejecutar(confirmarAccion, 'confirmada')}
          >
            {ocupada ? 'Un momento…' : 'Confirmar'}
          </Button>

          {salida.primeraVez && (
            <Button
              size="sm"
              variant="secondary"
              disabled={ocupada}
              onClick={() => ejecutar(confirmarYActivar, 'confirmada')}
            >
              Sí, y no preguntes más
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            disabled={ocupada}
            onClick={() => ejecutar(cancelarAccion, 'cancelada')}
          >
            Cancelar
          </Button>
        </div>
      )}

      {/* Con el automático puesto ya está escrito, así que el segundo botón no
          cancela: revierte. Y revertir no pide permiso (FR-023). */}
      {estado === 'confirmada' && salida.revertible && (
        <div className="pt-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={ocupada}
            onClick={() => ejecutar(revertirAccion, 'revertida')}
          >
            Revertir
          </Button>
        </div>
      )}
    </Marco>
  )
}

function leyenda(estado: Estado, salida: Salida): string {
  if (estado === 'revertida') return 'Revertido'
  if (estado === 'cancelada') return 'Cancelado'
  // Pasado un día ya no se puede confirmar, porque la fecha que se escribiría
  // no sería la que se dijo. Se dice en vez de dejar un botón que falla.
  if (estado === 'caducada') return 'Caducado sin confirmar'
  return salida.resultado === 'registrado' ? 'Registrado' : 'Confirmado'
}

function Marco({ children }: { children: React.ReactNode }) {
  return <div className="entra superficie mt-3 space-y-3 p-4">{children}</div>
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="entra mt-2 text-sm text-muted-foreground">{children}</p>
}
