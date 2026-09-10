import { generateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { sugerenciaSchema, validarSugerencia, type Sugerencia } from './schema'
import { construirMensaje } from './prompt'
import type { MovementKind } from '@/lib/domain/categories'

/**
 * Proveedor de modelo, intercambiable por configuración (D-008, D-049).
 *
 * Tres caminos, y los tres deben funcionar:
 *   ollama → modelo local, gratuito, sin que los datos salgan del equipo
 *   gemini → API de nube, requiere clave propia
 *   none   → sin IA; el registro funciona igual y la categorización se desactiva
 *
 * La aplicación nunca depende de que haya un modelo. Si no lo hay, se sugiere
 * nada y el usuario elige.
 */

export type EntradaSugerencia = {
  readonly texto: string
  readonly tipo: MovementKind
}

export type ResultadoProveedor =
  | { readonly estado: 'ok'; readonly sugerencia: Sugerencia; readonly latenciaMs: number }
  | { readonly estado: 'no-disponible' }
  | { readonly estado: 'fallo'; readonly motivo: string; readonly latenciaMs: number }

export type ProveedorIA = {
  readonly nombre: string
  readonly disponible: boolean
  sugerir(entrada: EntradaSugerencia): Promise<ResultadoProveedor>
}

/**
 * Tiempo máximo de espera.
 *
 * Es lo que hace usable un modelo local: en una CPU sin tarjeta gráfica la
 * respuesta puede tardar mucho, y sin límite el usuario se quedaría mirando un
 * formulario congelado. Pasado el plazo se abandona la sugerencia, no el registro.
 */
export const ESPERA_MAXIMA_MS = 4000

/** Proveedor que no hace nada. Es el que se usa cuando no hay modelo. */
export const proveedorInactivo: ProveedorIA = {
  nombre: 'none',
  disponible: false,
  async sugerir() {
    return { estado: 'no-disponible' }
  },
}

function crearModelo() {
  const proveedor = process.env.AI_PROVIDER ?? 'none'

  if (proveedor === 'gemini') {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return null
    const google = createGoogleGenerativeAI({ apiKey })
    // El modelo se puede fijar por configuración: los proveedores retiran
    // versiones y el valor por defecto envejece.
    return google(process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite')
  }

  if (proveedor === 'ollama') {
    const modelo = process.env.OLLAMA_MODEL
    if (!modelo) return null
    // Ollama expone una API compatible con OpenAI, así que no hace falta un
    // proveedor específico ni una dependencia extra.
    const ollama = createOpenAICompatible({
      name: 'ollama',
      baseURL: `${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/v1`,
    })
    return ollama(modelo)
  }

  return null
}

/**
 * Modelo para el chat, o `null` si no hay proveedor configurado.
 *
 * Se expone aparte porque el chat necesita el modelo en bruto para hacer
 * streaming y usar herramientas, mientras que la categorización solo necesita
 * una sugerencia validada.
 */
export function modeloDeChat() {
  return crearModelo()
}

/** Indica si hay algún proveedor de IA disponible. */
export function hayProveedor(): boolean {
  return crearModelo() !== null
}

/**
 * Indica si el modelo actual soporta tool calling.
 *
 * Algunos modelos (como gemma3:1b) solo tienen「completion」y Ollama rechaza
 * la petición si se le envían herramientas. En ese caso el chat funciona como
 * conversación libre: responde con su conocimiento pero no puede consultar la
 * base de datos ni ejecutar acciones.
 *
 * La cache evita una llamada a Ollama en cada petición del chat. Los
 *Capabilities de un modelo no cambian durante la vida del servidor.
 */
let cacheTools: boolean | null = null

export async function hayToolSupport(): Promise<boolean> {
  if (cacheTools !== null) return cacheTools

  const proveedor = process.env.AI_PROVIDER ?? 'none'
  if (proveedor !== 'ollama') {
    cacheTools = true
    return true
  }

  const modelo = process.env.OLLAMA_MODEL
  if (!modelo) {
    cacheTools = false
    return false
  }

  try {
    const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) {
      cacheTools = false
      return false
    }
    const data = await res.json() as {
      models?: Array<{ name: string; capabilities?: string[] }>
    }
    const info = data.models?.find((m) => m.name === modelo)
    cacheTools = info?.capabilities?.includes('tools') ?? false
    return cacheTools
  } catch {
    cacheTools = false
    return false
  }
}

export function crearProveedor(): ProveedorIA {
  const modelo = crearModelo()
  if (!modelo) return proveedorInactivo

  const nombre = process.env.AI_PROVIDER ?? 'none'

  return {
    nombre,
    disponible: true,

    async sugerir({ texto, tipo }) {
      const inicio = Date.now()

      try {
        const { object } = await generateObject({
          model: modelo,
          schema: sugerenciaSchema,
          prompt: construirMensaje(texto, tipo),
          abortSignal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
          temperature: 0,
        })

        const latenciaMs = Date.now() - inicio
        // El esquema del SDK ya validó la forma; falta comprobar que la
        // categoría corresponda al tipo de movimiento.
        const validado = validarSugerencia(object, tipo)

        return validado.ok
          ? { estado: 'ok', sugerencia: validado.valor, latenciaMs }
          : { estado: 'fallo', motivo: validado.motivo, latenciaMs }
      } catch (error) {
        return {
          estado: 'fallo',
          motivo: error instanceof Error ? error.message : 'fallo desconocido',
          latenciaMs: Date.now() - inicio,
        }
      }
    },
  }
}
