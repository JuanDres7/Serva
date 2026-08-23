import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from 'ai'
import { currentUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { crearHerramientas } from '@/lib/ai/tools'
import { instruccionesDelAsistente } from '@/lib/ai/chat-prompt'
import { modeloDeChat } from '@/lib/ai/provider'

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

  const { messages }: { messages: UIMessage[] } = await peticion.json()
  const settings = await ensureUserSettings(userId)

  const tools = crearHerramientas({
    userId,
    cycleConfig: settings.cycleConfig,
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
      messages: await convertToModelMessages(messages),
      tools,
      // Consultar, leer el resultado y responder. Cada paso es una generación
      // completa, que en CPU cuesta segundos: el tope evita que un modelo
      // confundido encadene llamadas sin fin y deje al usuario esperando.
      stopWhen: stepCountIs(3),
      temperature: 0.3,
    })

    return resultado.toUIMessageStreamResponse()
  } catch {
    return new Response(
      JSON.stringify({ error: 'El asistente no pudo responder' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
