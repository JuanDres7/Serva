/**
 * Devolverle a una conversación guardada el estado que tenía (spec 010, FR-012).
 *
 * Una conversación vive siete días (D-067) y se guarda tal como el SDK la
 * emitió: las partes de herramienta se serializan enteras, con el resultado que
 * la herramienta devolvió *en aquel momento*. Ese resultado dice «propuesta»
 * para siempre, porque nadie vuelve a escribirlo cuando alguien pulsa
 * «Confirmar».
 *
 * El estado de verdad vive en `assistant_writes.status`. Sin cruzar las dos
 * cosas al cargar, quien sale del chat y vuelve encuentra la tarjeta pidiendo
 * confirmación de algo que ya confirmó. Pulsar otra vez no escribe dos veces
 * —de eso se encarga `reservar`— pero tampoco hace nada visible, que es la peor
 * combinación posible: parece roto sin estarlo.
 *
 * Estas dos funciones son puras a propósito. La consulta vive en las queries;
 * aquí solo está la forma de los mensajes, que es lo único que hay que
 * comprobar cuando el SDK cambie de versión.
 */

type Parte = { readonly type?: unknown; readonly output?: unknown }

/** Las salidas de herramienta de un mensaje, ya comprobadas. */
function salidasDe(parts: unknown): Record<string, unknown>[] {
  if (!Array.isArray(parts)) return []

  return parts.flatMap((cruda) => {
    const salida = comoSalida(cruda)
    return salida ? [salida] : []
  })
}

function comoSalida(cruda: unknown): Record<string, unknown> | null {
  if (typeof cruda !== 'object' || cruda === null) return null

  const parte = cruda as Parte
  if (typeof parte.type !== 'string' || !parte.type.startsWith('tool-')) return null
  if (typeof parte.output !== 'object' || parte.output === null) return null

  return parte.output as Record<string, unknown>
}

/**
 * Los identificadores de propuesta que aparecen en una conversación.
 *
 * Sin repetidos y en una sola pasada: son los que hay que ir a buscar a la base
 * de datos, y una conversación de siete días puede tener bastantes.
 */
export function propuestasEn(mensajes: readonly { readonly parts: unknown }[]): string[] {
  const ids = new Set<string>()

  for (const mensaje of mensajes) {
    for (const salida of salidasDe(mensaje.parts)) {
      if (typeof salida.propuestaId === 'string') ids.add(salida.propuestaId)
    }
  }

  return [...ids]
}

/**
 * Añade a cada salida el estado que su propuesta tiene ahora.
 *
 * Se añade un campo en lugar de reescribir `resultado` porque `resultado` es lo
 * que la herramienta contestó, y eso pasó: es el registro de un hecho. Lo que
 * cambia con el tiempo es otra cosa, y merece su propio nombre.
 *
 * Un identificador que no esté en el mapa se deja intacto: puede ser una
 * propuesta de este mismo turno, que aún no se ha consultado.
 */
export function conEstados<T extends { readonly parts: unknown }>(
  mensajes: readonly T[],
  estados: ReadonlyMap<string, string>,
): T[] {
  return mensajes.map((mensaje) => {
    if (!Array.isArray(mensaje.parts)) return mensaje

    let cambiado = false

    const parts = mensaje.parts.map((cruda) => {
      const salida = comoSalida(cruda)
      if (!salida) return cruda

      const id = salida.propuestaId
      if (typeof id !== 'string') return cruda

      const estado = estados.get(id)
      if (estado === undefined) return cruda

      cambiado = true
      return { ...(cruda as object), output: { ...salida, estadoGuardado: estado } }
    })

    return cambiado ? { ...mensaje, parts } : mensaje
  })
}
