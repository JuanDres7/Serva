'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { Button } from '@/components/ui/button'
import { VisualDeHerramienta } from '@/components/chat-visuales'
import { empezarConversacion } from '@/lib/actions/conversations'

/**
 * Serva AI, el asistente (spec 003).
 *
 * Ocupa la pantalla entera en lugar de un panel en la esquina. La razón de D-002
 * sigue siendo la misma —la conversación reemplaza a la navegación—, pero un
 * recuadro de 24rem la contradecía en la práctica: las respuestas con cifras y
 * varias líneas no cabían, y quedaba como un accesorio encima de la aplicación
 * en vez del lugar donde se le pregunta a Serva (D-064).
 */

const SUGERENCIAS = [
  '¿En qué se me fue la plata este mes?',
  '¿Gasté más que el mes pasado?',
  '¿Cuáles fueron mis gastos más grandes?',
]

export function Chat({
  nombre,
  currency,
  locale,
  conversationId,
  inicial,
}: {
  readonly nombre: string
  readonly currency: string
  readonly locale: string
  readonly conversationId: string | null
  readonly inicial: readonly { id: string; role: string; parts: unknown }[]
}) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const finalRef = useRef<HTMLDivElement>(null)
  const campoRef = useRef<HTMLTextAreaElement>(null)

  const { messages, sendMessage, setMessages, status, error } = useChat({
    messages: inicial as UIMessage[],
    // El identificador viaja en cada petición para que el servidor sepa a qué
    // hilo pertenece el turno. No lo decide el cliente: si manda uno ajeno, la
    // consulta no lo encuentra y se abre una conversación nueva.
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { conversationId },
    }),
  })

  useEffect(() => {
    finalRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const pensando = status === 'submitted' || status === 'streaming'
  const vacio = messages.length === 0

  /**
   * Empezar de cero (FR-019).
   *
   * Hay que hacer las dos cosas. La acción borra el hilo en el servidor, pero
   * `useChat` guarda los mensajes en su propio estado: sin vaciarlo, la
   * conversación seguiría en pantalla aunque ya no exista, y el siguiente turno
   * la resucitaría al enviarla entera.
   */
  async function nuevaConversacion() {
    await empezarConversacion()
    setMessages([])
    router.refresh()
  }

  function enviar(pregunta: string) {
    const limpia = pregunta.trim()
    if (limpia === '' || pensando) return
    sendMessage({ text: limpia })
    setTexto('')
    campoRef.current?.focus()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          {/* Empezar de nuevo no borra a mano nada: la anterior se cierra sola
              (FR-019). Solo aparece cuando hay algo que dejar atrás. */}
          {!vacio && (
            <div className="mb-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={nuevaConversacion}>
                Nueva conversación
              </Button>
            </div>
          )}
          {/*
            Sin conversación, la pantalla no arranca en blanco: saluda por su
            nombre y ofrece tres preguntas reales. Quien no sabe qué se le puede
            preguntar a un asistente no pregunta nada.
          */}
          {vacio ? (
            <div className="space-y-8 py-12 text-center">
              <div className="entra space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Hola {nombre}
                </h1>
                <p className="text-muted-foreground">
                  Pregúntame lo que quieras sobre tu dinero. Respondo con tus
                  propios movimientos.
                </p>
              </div>

              <div className="escalonado mx-auto grid max-w-md gap-2">
                {SUGERENCIAS.map((sugerencia) => (
                  <button
                    key={sugerencia}
                    onClick={() => enviar(sugerencia)}
                    className="superficie superficie-viva px-4 py-3 text-left text-sm hover:bg-accent"
                  >
                    {sugerencia}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((mensaje) => (
                <Mensaje
                  key={mensaje.id}
                  mensaje={mensaje}
                  currency={currency}
                  locale={locale}
                />
              ))}

              {pensando && <Esperando />}

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  Serva AI no está disponible ahora mismo. El resto de Serva
                  funciona con normalidad.
                </p>
              )}
            </div>
          )}

          <div ref={finalRef} />
        </div>
      </div>

      {/* El campo queda abajo y fijo: al escribir la segunda pregunta no hay que
          ir a buscarlo al final de una conversación larga. */}
      <div className="border-t border-border/70 bg-background/85 backdrop-blur">
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            enviar(texto)
          }}
          className="mx-auto w-full max-w-2xl px-4 py-4"
        >
          <div className="superficie flex items-end gap-2 p-2 transition-colors focus-within:border-ring/60">
            <textarea
              ref={campoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                // Enter envía; Mayús+Enter deja escribir una pregunta larga en
                // varias líneas, que es lo que espera quien ya usó un chat.
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  enviar(texto)
                }
              }}
              rows={1}
              placeholder="¿Cuánto gasté en comida?"
              aria-label="Tu pregunta"
              disabled={pensando}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button type="submit" disabled={pensando || texto.trim() === ''}>
              Enviar
            </Button>
          </div>

          {/* Dejó de ser cierto que solo consulta (D-066). Lo que sigue
              siendo cierto, y es lo que importa saber, es que nada de lo que
              haga es definitivo. */}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Todo lo que registre Serva AI se puede revertir.
          </p>
        </form>
      </div>
    </div>
  )
}

type Parte = { type?: string; text?: string; state?: string; output?: unknown }

function Mensaje({
  mensaje,
  currency,
  locale,
}: {
  mensaje: { role: string; parts: readonly unknown[] }
  currency: string
  locale: string
}) {
  const partes = mensaje.parts.filter(
    (parte): parte is Parte => typeof parte === 'object' && parte !== null,
  )

  const texto = partes
    .filter((parte) => parte.type === 'text' && typeof parte.text === 'string')
    .map((parte) => parte.text)
    .join('')

  if (mensaje.role === 'user') {
    return (
      <div className="entra flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">
          {texto}
        </div>
      </div>
    )
  }

  // Los resultados de herramienta llegan como partes `tool-<nombre>` y hasta
  // ahora se descartaban en silencio, que es por lo que el FR-006 quedó sin
  // construir pese a estar aprobado.
  const visuales = partes.flatMap((parte, i) => {
    if (typeof parte.type !== 'string' || !parte.type.startsWith('tool-')) return []
    if (parte.state !== 'output-available') return []
    if (typeof parte.output !== 'object' || parte.output === null) return []

    return [
      <VisualDeHerramienta
        key={i}
        nombre={parte.type.slice('tool-'.length)}
        salida={parte.output as Record<string, unknown>}
        currency={currency}
        locale={locale}
      />,
    ]
  })

  return (
    <div className="entra text-sm">
      <p className="eyebrow mb-1.5 text-muted-foreground">Serva AI</p>
      <div className="whitespace-pre-wrap">{texto}</div>
      {visuales}
    </div>
  )
}

/**
 * La espera.
 *
 * Tres puntos que respiran, y no una rueda que gira: la rueda dice «el sistema
 * está ocupado», los puntos dicen «te está escribiendo». Aquí la diferencia
 * importa, porque detrás hay una consulta a los datos de la persona y no una
 * descarga.
 */
function Esperando() {
  return (
    <div className="entra flex items-center gap-2" aria-live="polite">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: '900ms' }}
          />
        ))}
      </span>
      <span className="text-sm text-muted-foreground">Consultando tus datos…</span>
    </div>
  )
}
