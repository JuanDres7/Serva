import { redirect } from 'next/navigation'
import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { hayProveedor } from '@/lib/ai/provider'
import { Chat } from '@/components/chat'
import { conversacionViva } from '@/lib/db/queries/conversations'

/**
 * Serva AI a pantalla completa (spec 003, FR-001).
 *
 * Sin proveedor de modelo la sección no existe: la navegación tampoco la
 * ofrece, y quien llegue por la dirección directa vuelve al resumen en lugar de
 * encontrarse un chat que no puede responder.
 */
export default async function AsistentePage() {
  const userId = await requireUserIdOrRedirect()
  if (!hayProveedor()) redirect('/')

  const settings = await ensureUserSettings(userId)

  // Recuperar el hilo vivo es también lo que borra los caducados: la retención
  // se aplica al leer, así que nadie llega a ver una conversación de hace más
  // de siete días (D-067).
  const conversacion = await conversacionViva(userId)

  return (
    <Chat
      nombre={settings.displayName}
      currency={settings.currency}
      locale={settings.locale}
      conversationId={conversacion?.id ?? null}
      inicial={conversacion?.mensajes ?? []}
    />
  )
}
