/**
 * Arranque del servidor (spec 013, RN-005).
 *
 * El modelo de embeddings se empieza a cargar cuando se inicia una instancia
 * del servidor de Next.js, en segundo plano. Sin esta llamada,
 * `encoderDisponible` se queda en `false` para siempre y toda la búsqueda
 * semántica de la cascada de categorización (spec 013) se salta en silencio
 * — el sistema sigue funcionando, pero nunca con sugerencias por similitud.
 *
 * **A propósito no se espera (`await`) a que termine.** Next.js no deja
 * aceptar peticiones hasta que `register()` resuelve, y la primera petición
 * a una instancia fría no tiene por qué pagar los 3-6s (o más, si toca
 * descargar el modelo) que tarda el encoder en estar listo — sobre todo
 * porque el sistema ya sabe degradarse sin él (Art. III.2): mientras carga,
 * la categorización cae a palabras clave o al modelo de lenguaje, igual que
 * si el encoder no existiera. Unas pocas categorizaciones justo después de
 * un arranque en frío pierden la búsqueda semántica; nadie espera nada.
 *
 * Solo aplica al runtime de Node: el encoder usa ONNX vía
 * `@huggingface/transformers`, que no corre en Edge Runtime (plan.md §1).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const inicio = Date.now()

  import('@/lib/ai/encoder')
    .then(async (encoder) => {
      await encoder.cargarEncoder()
      const duracionMs = Date.now() - inicio

      if (encoder.encoderDisponible) {
        console.log(`[encoder] Modelo cargado en ${duracionMs}ms (sin bloquear el arranque)`)
      } else {
        console.warn(
          `[encoder] No disponible tras ${duracionMs}ms — el sistema sigue funcionando sin sugerencias semánticas`,
        )
      }
    })
    .catch((error) => {
      // Nunca debe impedir que el servidor arranque: el encoder es una mejora,
      // no un requisito (Art. III.2).
      console.warn(
        '[encoder] Error inesperado al intentar cargar el modelo en el arranque:',
        error instanceof Error ? error.message : error,
      )
    })
}
