import { and, asc, desc, eq, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversations, chatMessages } from '@/lib/db/schema'

/**
 * La conversación con Serva AI (spec 003, D-067).
 *
 * Todas las funciones reciben `userId` y lo aplican en el `where`. No hay
 * ninguna que acepte un identificador de conversación sin el dueño: pedir el
 * hilo de otra cuenta devuelve vacío, no contenido (Art. VI.1).
 */

/** Siete días desde el último mensaje. */
export const DIAS_DE_RETENCION = 7

/**
 * Borra las conversaciones caducadas de un usuario.
 *
 * Se limpia al leer y no con una tarea programada. Serva no tiene dónde correr
 * un cron en el plan gratuito, y una tarea que nadie ejecuta es una promesa de
 * borrado que no se cumple. Al hacerlo en la lectura, la caducidad se aplica
 * exactamente cuando importa: nadie puede ver un hilo caducado, porque se borra
 * antes de poder devolverlo.
 */
export async function purgarCaducadas(userId: string): Promise<number> {
  const limite = new Date(Date.now() - DIAS_DE_RETENCION * 24 * 60 * 60 * 1000)

  const borradas = await db
    .delete(conversations)
    .where(and(eq(conversations.userId, userId), lt(conversations.lastMessageAt, limite)))
    .returning({ id: conversations.id })

  return borradas.length
}

export type MensajeGuardado = {
  readonly id: string
  readonly role: string
  readonly parts: unknown
}

/**
 * La conversación viva: la más reciente que no haya caducado.
 *
 * Devuelve `null` cuando no hay ninguna, que es lo que hace que el asistente
 * arranque limpio sin necesidad de un caso especial.
 */
export async function conversacionViva(
  userId: string,
): Promise<{ id: string; mensajes: MensajeGuardado[] } | null> {
  await purgarCaducadas(userId)

  const [conversacion] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1)

  if (!conversacion) return null

  const filas = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      parts: chatMessages.parts,
    })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversacion.id))
    .orderBy(asc(chatMessages.position))

  return { id: conversacion.id, mensajes: filas }
}

/**
 * Guarda el estado completo de una conversación tras un turno.
 *
 * Se reemplazan todos los mensajes en lugar de añadir el último. El SDK puede
 * reescribir un mensaje ya emitido mientras llegan las partes de herramienta, y
 * añadir por separado dejaría versiones a medias mezcladas con las definitivas.
 * Una conversación de siete días no llega a un tamaño donde esto importe.
 */
export async function guardarConversacion(params: {
  readonly userId: string
  readonly conversationId: string | null
  readonly mensajes: readonly { role: string; parts: unknown }[]
}): Promise<string> {
  const { userId, conversationId, mensajes } = params

  const id = await db.transaction(async (tx) => {
    let idConversacion = conversationId

    if (idConversacion) {
      // El `userId` en el where es lo que impide escribir en un hilo ajeno
      // aunque llegue su identificador.
      const [existente] = await tx
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(and(eq(conversations.id, idConversacion), eq(conversations.userId, userId)))
        .returning({ id: conversations.id })

      if (!existente) idConversacion = null
    }

    if (!idConversacion) {
      const [creada] = await tx
        .insert(conversations)
        .values({ userId })
        .returning({ id: conversations.id })
      idConversacion = creada!.id
    }

    await tx.delete(chatMessages).where(eq(chatMessages.conversationId, idConversacion))

    if (mensajes.length > 0) {
      await tx.insert(chatMessages).values(
        mensajes.map((mensaje, posicion) => ({
          conversationId: idConversacion!,
          role: mensaje.role,
          parts: mensaje.parts as never,
          position: posicion,
        })),
      )
    }

    return idConversacion
  })

  return id
}

/**
 * Cierra la conversación en curso (FR-019).
 *
 * Borra en lugar de archivar. Es la excepción consciente al Artículo VII: el
 * historial que ese artículo protege es el del dinero, y una conversación no es
 * un movimiento. Guardar hilos que el usuario dio por cerrados contradiría la
 * razón de ser de la retención de siete días.
 */
export async function cerrarConversacion(userId: string): Promise<void> {
  const [ultima] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(1)

  if (!ultima) return

  await db
    .delete(conversations)
    .where(and(eq(conversations.id, ultima.id), eq(conversations.userId, userId)))
}

/** Cuántas conversaciones tiene un usuario. Solo para pruebas y diagnóstico. */
export async function contarConversaciones(userId: string): Promise<number> {
  const [fila] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(conversations)
    .where(eq(conversations.userId, userId))

  return fila?.total ?? 0
}
