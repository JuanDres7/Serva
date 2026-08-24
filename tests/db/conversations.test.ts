import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { sql, eq } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, conversations } from '@/lib/db/schema'
import {
  conversacionViva,
  guardarConversacion,
  cerrarConversacion,
  contarConversaciones,
  purgarCaducadas,
  DIAS_DE_RETENCION,
} from '@/lib/db/queries/conversations'

/**
 * La conversación con Serva AI (spec 003, FR-017 a FR-021 · D-067).
 *
 * Ninguna de estas pruebas necesita un modelo: se guardan y se recuperan
 * mensajes ya formados. Lo que se comprueba aquí es la custodia —qué se
 * conserva, cuánto, y de quién— que es la parte que protege al usuario.
 */

const ANA = 'test-conv-ana'
const BRUNO = 'test-conv-bruno'

const turno = (role: string, texto: string) => ({
  role,
  parts: [{ type: 'text', text: texto }],
})

async function crearUsuarios() {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await db.insert(user).values([
    { id: ANA, name: 'Ana', email: `${ANA}@serva.local`, emailVerified: true },
    { id: BRUNO, name: 'Bruno', email: `${BRUNO}@serva.local`, emailVerified: true },
  ])
}

beforeEach(crearUsuarios)

afterAll(async () => {
  await db.delete(user).where(sql`id in (${ANA}, ${BRUNO})`)
  await client.end()
})

describe('guardar y recuperar', () => {
  it('sin conversación previa, el asistente arranca limpio', async () => {
    expect(await conversacionViva(ANA)).toBeNull()
  })

  it('E7 — al volver, la conversación sigue donde se dejó', async () => {
    const id = await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', '¿cuánto gasté?'), turno('assistant', 'Llevas $ 50.000.')],
    })

    const viva = await conversacionViva(ANA)
    expect(viva?.id).toBe(id)
    expect(viva?.mensajes).toHaveLength(2)
    expect(viva?.mensajes[0]?.role).toBe('user')
    expect(viva?.mensajes[1]?.role).toBe('assistant')
  })

  it('los mensajes vuelven en el orden en que se dijeron', async () => {
    await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'uno'), turno('assistant', 'dos'), turno('user', 'tres')],
    })

    const viva = await conversacionViva(ANA)
    const textos = viva!.mensajes.map(
      (m) => (m.parts as { text: string }[])[0]!.text,
    )
    expect(textos).toEqual(['uno', 'dos', 'tres'])
  })

  it('conserva las partes íntegras, no solo el texto', async () => {
    // Si se guardara solo el texto, al volver se perderían los gráficos y el
    // hilo recuperado no sería el que se tuvo (FR-019).
    const conGrafico = {
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Vivienda se llevó casi la mitad.' },
        {
          type: 'tool-gastoPorCategoria',
          state: 'output-available',
          output: { categorias: [{ clave: 'housing', montoCents: 120000000 }] },
        },
      ],
    }

    await guardarConversacion({ userId: ANA, conversationId: null, mensajes: [conGrafico] })

    const viva = await conversacionViva(ANA)
    const partes = viva!.mensajes[0]!.parts as { type: string; output?: unknown }[]
    expect(partes).toHaveLength(2)
    expect(partes[1]!.type).toBe('tool-gastoPorCategoria')
    expect(partes[1]!.output).toBeDefined()
  })

  it('un turno posterior actualiza el mismo hilo, no crea otro', async () => {
    const id = await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'hola')],
    })

    await guardarConversacion({
      userId: ANA,
      conversationId: id,
      mensajes: [turno('user', 'hola'), turno('assistant', 'qué tal')],
    })

    expect(await contarConversaciones(ANA)).toBe(1)
    expect((await conversacionViva(ANA))?.mensajes).toHaveLength(2)
  })
})

describe('E8 — empezar de cero', () => {
  it('cerrar deja al asistente sin contexto previo', async () => {
    await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'algo que ya no quiero')],
    })

    await cerrarConversacion(ANA)

    expect(await conversacionViva(ANA)).toBeNull()
    expect(await contarConversaciones(ANA)).toBe(0)
  })

  it('cerrar sin conversación no falla', async () => {
    await expect(cerrarConversacion(ANA)).resolves.toBeUndefined()
  })
})

describe('E9 — la conversación caduca', () => {
  async function envejecer(userId: string, dias: number) {
    const fecha = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
    await db
      .update(conversations)
      .set({ lastMessageAt: fecha })
      .where(eq(conversations.userId, userId))
  }

  it(`una conversación de más de ${DIAS_DE_RETENCION} días no se recupera`, async () => {
    await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'lo que dije la semana pasada')],
    })
    await envejecer(ANA, DIAS_DE_RETENCION + 1)

    expect(await conversacionViva(ANA)).toBeNull()
  })

  it('y además se borra, no solo se oculta', async () => {
    // Ocultar no protege nada: lo que no está es lo que no se filtra (D-067).
    await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'algo sensible')],
    })
    await envejecer(ANA, DIAS_DE_RETENCION + 1)

    await conversacionViva(ANA)
    expect(await contarConversaciones(ANA)).toBe(0)
  })

  it('una de ayer sigue estando', async () => {
    await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'lo de ayer')],
    })
    await envejecer(ANA, 1)

    expect(await conversacionViva(ANA)).not.toBeNull()
  })

  it('purgar no toca las conversaciones de otro usuario', async () => {
    await guardarConversacion({ userId: BRUNO, conversationId: null, mensajes: [turno('user', 'de bruno')] })
    await envejecer(BRUNO, DIAS_DE_RETENCION + 1)

    await purgarCaducadas(ANA)

    expect(await contarConversaciones(BRUNO)).toBe(1)
  })
})

describe('T-324 — aislamiento entre cuentas', () => {
  it('nadie recupera la conversación de otro', async () => {
    await guardarConversacion({
      userId: BRUNO,
      conversationId: null,
      mensajes: [turno('user', 'mis deudas de bruno')],
    })

    expect(await conversacionViva(ANA)).toBeNull()
  })

  it('escribir con el identificador ajeno abre un hilo propio, no invade el otro', async () => {
    const deBruno = await guardarConversacion({
      userId: BRUNO,
      conversationId: null,
      mensajes: [turno('user', 'de bruno')],
    })

    // Ana envía el identificador de Bruno: el `userId` del where impide que la
    // actualización lo alcance, y se le abre uno nuevo.
    const deAna = await guardarConversacion({
      userId: ANA,
      conversationId: deBruno,
      mensajes: [turno('user', 'intento de ana')],
    })

    expect(deAna).not.toBe(deBruno)

    const bruno = await conversacionViva(BRUNO)
    expect(bruno?.id).toBe(deBruno)
    expect(bruno?.mensajes).toHaveLength(1)
    expect((bruno!.mensajes[0]!.parts as { text: string }[])[0]!.text).toBe('de bruno')
  })

  it('FR-020 — al borrar la cuenta, sus conversaciones se van con ella', async () => {
    await guardarConversacion({
      userId: ANA,
      conversationId: null,
      mensajes: [turno('user', 'algo')],
    })

    await db.delete(user).where(eq(user.id, ANA))

    const [fila] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.userId, ANA))

    expect(fila?.total).toBe(0)
  })
})
