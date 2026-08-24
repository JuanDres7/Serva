import { redirect } from 'next/navigation'
import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { hayProveedor } from '@/lib/ai/provider'
import { Chat } from '@/components/chat'

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

  return <Chat nombre={settings.displayName} />
}
