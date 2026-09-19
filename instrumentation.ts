/**
 * Arranque del servidor (spec 013, RN-005).
 *
 * El modelo de embeddings se carga una sola vez cuando se inicia una
 * instancia del servidor de Next.js, antes de aceptar peticiones. Sin esta
 * llamada, `encoderDisponible` se queda en `false` para siempre y toda la
 * búsqueda semántica de la cascada de categorización (spec 013) se salta en
 * silencio — el sistema sigue funcionando, pero nunca con sugerencias por
 * similitud.
 *
 * Solo aplica al runtime de Node: el encoder usa ONNX vía
 * `@huggingface/transformers`, que no corre en Edge Runtime (plan.md §1).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const encoder = await import('@/lib/ai/encoder')
    const inicio = Date.now()
    await encoder.cargarEncoder()
    const duracionMs = Date.now() - inicio

    if (encoder.encoderDisponible) {
      console.log(`[encoder] Modelo cargado en ${duracionMs}ms`)
    } else {
      console.warn(
        `[encoder] No disponible tras ${duracionMs}ms — el sistema sigue funcionando sin sugerencias semánticas`,
      )
    }
  } catch (error) {
    // Nunca debe impedir que el servidor arranque: el encoder es una mejora,
    // no un requisito (Art. III.2).
    console.warn(
      '[encoder] Error inesperado al intentar cargar el modelo en el arranque:',
      error instanceof Error ? error.message : error,
    )
  }
}
