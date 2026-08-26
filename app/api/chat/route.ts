import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from 'ai'
import { currentUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { crearHerramientas } from '@/lib/ai/tools'
import { instruccionesDelAsistente } from '@/lib/ai/chat-prompt'
import { modeloDeChat } from '@/lib/ai/provider'
import { guardarConversacion } from '@/lib/db/queries/conversations'

/**
 * Cuántos turnos se le envían al modelo.
 *
 * Guardar el hilo entero no obliga a mandarlo entero (FR-021, Art. VI.2). Doce
 * turnos bastan para que el asistente entienda «no, fueron 20 mil» sin arrastrar
 * a la petición todo lo que la persona contó sobre su dinero hace tres días.
 */
const TURNOS_AL_MODELO = 12

/**
 * Punto de entrada del chat (spec 003).
 *
 * La respuesta va en streaming: en el plan gratuito las funciones tienen tiempo
 * máximo de ejecución, y un modelo local en CPU tarda segundos en producir un
 * párrafo. Sin streaming el usuario miraría una pantalla quieta y la función
 * podría cortarse antes de responder (D-040).
 */
export async function POST(peticion: Request) {
  const userId = await currentUserId()
  if (!userId) {
    return new Response('No autorizado', { status: 401 })
  }

  const modelo = modeloDeChat()
  if (!modelo) {
    return new Response(
      JSON.stringify({ error: 'El asistente no está disponible en esta instalación' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const { messages, conversationId }: {
    messages: UIMessage[]
    conversationId?: string | null
  } = await peticion.json()
  const settings = await ensureUserSettings(userId)

  const tools = crearHerramientas({
    userId,
    cycleConfig: settings.cycleConfig,
    cycleConfiguredAt: settings.cycleConfiguredAt,
    currency: settings.currency,
    locale: settings.locale,
    timeZone: settings.timeZone,
  })

  // Las herramientas quedan ligadas a este usuario: el modelo no puede indicar
  // sobre qué cuenta consultar porque nunca recibe ese parámetro.

  try {
    const resultado = streamText({
      model: modelo,
      system: instruccionesDelAsistente(settings.displayName),
      messages: await convertToModelMessages(messages.slice(-TURNOS_AL_MODELO)),
      tools,
      // Proponer, escribir y después consultar: el FR-020 exige que un mismo
      // turno pueda registrar y responder una pregunta, y la respuesta debe
      // reflejar el estado posterior a la escritura (RN-009). Sigue habiendo
      // tope: un modelo confundido no puede encadenar llamadas sin fin.
      stopWhen: stepCountIs(5),
      temperature: 0.3,
    })

    return resultado.toUIMessageStreamResponse({
      originalMessages: messages,
      // Se persiste al terminar el turno, con las partes íntegras: si se
      // guardara solo el texto, al volver a la conversación se perderían los
      // gráficos y quedaría un hilo distinto del que se tuvo (D-067).
      onFinish: async ({ messages: completos }) => {
        await guardarConversacion({
          userId,
          conversationId: conversationId ?? null,
          mensajes: completos.map((mensaje) => ({
            role: mensaje.role,
            parts: mensaje.parts,
          })),
        })
      },
    })
  } catch {
    return new Response(
      JSON.stringify({ error: 'El asistente no pudo responder' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
