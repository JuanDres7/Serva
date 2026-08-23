'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/**
 * El asistente (spec 003).
 *
 * Panel superpuesto y no pantalla aparte: si consultar obligara a cambiar de
 * pantalla, la conversación competiría con la navegación en lugar de
 * reemplazarla, y se perdería el diferenciador del producto (D-002, D-009).
 */

const SUGERENCIAS = [
  '¿En qué se me fue la plata este mes?',
  '¿Gasté más que el mes pasado?',
  '¿Cuáles fueron mis gastos más grandes?',
]

export function ChatPanel({ nombre }: { nombre: string }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const finalRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat()

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const pensando = status === 'submitted' || status === 'streaming'

  function enviar(pregunta: string) {
    const limpia = pregunta.trim()
    if (limpia === '' || pensando) return
    sendMessage({ text: limpia })
    setTexto('')
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        aria-label="Abrir el asistente"
        className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden>
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[32rem] w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-medium">Pregúntale a Finzen</p>
          <p className="text-xs text-muted-foreground">Sobre tus propios datos</p>
        </div>
        <Button variant="ghost" size="xs" onClick={() => setAbierto(false)}>
          Cerrar
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hola {nombre}. Pregúntame lo que quieras sobre tu dinero.
            </p>
            <div className="space-y-2">
              {SUGERENCIAS.map((sugerencia) => (
                <button
                  key={sugerencia}
                  onClick={() => enviar(sugerencia)}
                  className="block w-full rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted"
                >
                  {sugerencia}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((mensaje) => (
          <div
            key={mensaje.id}
            className={mensaje.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                mensaje.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              {mensaje.parts
                .filter((parte) => parte.type === 'text')
                .map((parte, i) => (
                  <span key={i}>{'text' in parte ? parte.text : ''}</span>
                ))}
            </div>
          </div>
        ))}

        {pensando && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Consultando tus datos…
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            El asistente no está disponible ahora mismo. El resto de Finzen
            funciona con normalidad.
          </p>
        )}

        <div ref={finalRef} />
      </div>

      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          enviar(texto)
        }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="¿Cuánto gasté en comida?"
          aria-label="Tu pregunta"
          disabled={pensando}
        />
        <Button type="submit" size="sm" disabled={pensando || texto.trim() === ''}>
          Enviar
        </Button>
      </form>
    </div>
  )
}
