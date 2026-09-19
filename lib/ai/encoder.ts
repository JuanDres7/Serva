import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers'
import { normalizarParaEncoding } from '@/lib/domain/normalize'

/**
 * Servicio de encoding semántico (spec 013).
 *
 * Usa el modelo paraphrase-multilingual-MiniLM-L12-v2 vía ONNX para generar
 * embeddings de 384 dimensiones a partir de descripciones de transacciones.
 *
 * El modelo se carga una sola vez por instancia del servidor y queda en
 * memoria mientras esa instancia esté viva. Si la carga falla, el sistema
 * opera sin capacidades de encoding (degradación graceful, Art. III.2).
 *
 * **Riesgo conocido de despliegue serverless (spec 013, riesgo #4):** en
 * Vercel el sistema de archivos es de solo lectura salvo `/tmp`, que además
 * se vacía en cada instancia nueva. La ruta de caché por defecto de esta
 * librería (`./.cache`) no sobrevive ahí, así que cada instancia fría podría
 * volver a descargar el modelo completo por red en vez de reutilizar una
 * copia local — no es un fallo, pero conviene que la primera categorización
 * de cada instancia fría no dependa de que la descarga sea instantánea.
 * `env.cacheDir` se apunta a `/tmp/.cache` solo cuando corre en Vercel, para
 * que al menos dentro de la misma instancia no se repita la descarga entre
 * invocaciones. Pendiente de verificar con un despliegue real: ver el
 * checklist de `plan.md` §9.
 */

const MODELO = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
const DIMENSIONES = 384

// Evitar descargas en el cliente — el modelo solo corre server-side.
env.allowLocalModels = false

// En Vercel, todo el sistema de archivos es de solo lectura salvo /tmp
// (que tampoco es persistente entre instancias, pero sí durante la vida de
// una misma instancia). Fuera de Vercel se deja el valor por defecto
// (./.cache), que funciona bien en desarrollo local y en un servidor
// tradicional con disco persistente.
if (process.env.VERCEL === '1') {
  env.cacheDir = '/tmp/.cache'
}

let pipelineInstancia: FeatureExtractionPipeline | null = null
let cargando: Promise<FeatureExtractionPipeline | null> | null = null

/**
 * Indica si el encoder está disponible.
 *
 * Se verifica al iniciar el servidor. Si el modelo no carga (memoria
 * insuficiente, error de red), `disponible` queda en false y todo el
 * sistema funciona sin encoding.
 */
let _disponible = false
export { _disponible as encoderDisponible }

/**
 * Carga el modelo de embeddings. Se llama una sola vez al iniciar.
 *
 * El modelo ocupa ~120MB de RAM y tarda ~1-2s en cargar la primera vez.
 * En servidores con poca memoria, se deshabilita silenciosamente.
 */
export async function cargarEncoder(): Promise<void> {
  if (pipelineInstancia) return
  if (cargando) {
    await cargando
    return
  }

  cargando = (async () => {
    try {
      const pipe = await pipeline('feature-extraction', MODELO, {
        // Usar ejecución ONNX en CPU (sin GPU en servidor).
        device: 'cpu',
      })
      pipelineInstancia = pipe
      _disponible = true
      return pipe
    } catch (error) {
      console.warn(
        '[encoder] No se pudo cargar el modelo:',
        error instanceof Error ? error.message : error,
      )
      _disponible = false
      return null
    }
  })()

  await cargando
  cargando = null
}

/**
 * Genera un embedding de 384 dimensiones a partir de un texto.
 *
 * El texto se normaliza antes de codificar para garantizar consistencia
 * con los embeddings almacenados.
 *
 * @returns Vector de 384 floats, o null si el encoder no está disponible.
 */
export async function codificar(texto: string): Promise<Float32Array | null> {
  if (!pipelineInstancia) return null

  const normalizado = normalizarParaEncoding(texto)
  if (normalizado === '') return null

  try {
    const resultado = await pipelineInstancia(normalizado, {
      pooling: 'mean',
      normalize: true,
    })

    const embedding = resultado.data
    if (embedding.length !== DIMENSIONES) {
      console.warn(
        `[encoder] Dimensiones inesperadas: esperaba ${DIMENSIONES}, obtuvo ${embedding.length}`,
      )
      return null
    }

    // Verificar que no contiene NaN o Infinity
    for (let i = 0; i < embedding.length; i++) {
      if (!Number.isFinite(embedding[i]!)) {
        console.warn('[encoder] Embedding contiene valores no finitos')
        return null
      }
    }

    return new Float32Array(Array.from(embedding as ArrayLike<number>))
  } catch (error) {
    console.warn(
      '[encoder] Error durante inferencia:',
      error instanceof Error ? error.message : error,
    )
    return null
  }
}

/**
 * Convierte un Float32Array a string para almacenamiento en pgvector.
 *
 * Formato: "[0.1,0.2,0.3,...]" — el formato que pgvector espera para
 * la inserción directa con CAST.
 */
export function embeddingAVector(embedding: Float32Array): string {
  return `[${Array.from(embedding).join(',')}]`
}

/**
 * Parsea un string de pgvector a Float32Array.
 */
export function vectorAEmbedding(vector: string): Float32Array {
  const limpio = vector.replace(/[\[\]]/g, '')
  const valores = limpio.split(',').map(Number)
  return new Float32Array(valores)
}
