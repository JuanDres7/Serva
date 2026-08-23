import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userSettings, user, type UserSettingsRow } from '@/lib/db/schema'
import type { CycleConfig } from '@/lib/domain/cycle'

/**
 * Configuración de cada usuario: nombre, moneda, formato y ciclo.
 *
 * Los valores por defecto se crean al primer acceso para que la aplicación
 * funcione desde el primer momento. La pantalla que permite elegirlos es la
 * feature 004; hasta entonces todo usuario arranca con la configuración
 * colombiana y el mes calendario como ciclo (D-027).
 */

const DEFAULTS = {
  country: 'CO',
  currency: 'COP',
  locale: 'es-CO',
  timeZone: 'America/Bogota',
} as const

export type UserSettings = {
  readonly userId: string
  readonly displayName: string
  readonly country: string
  readonly currency: string
  readonly locale: string
  readonly timeZone: string
  readonly cycleConfig: CycleConfig
}

function toSettings(row: UserSettingsRow): UserSettings {
  return {
    userId: row.userId,
    displayName: row.displayName,
    country: row.country,
    currency: row.currency,
    locale: row.locale,
    timeZone: row.timeZone,
    cycleConfig: row.cycleConfig as CycleConfig,
  }
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1)

  return row ? toSettings(row) : null
}

/** Devuelve la configuración del usuario, creándola con los valores por defecto. */
export async function ensureUserSettings(userId: string): Promise<UserSettings> {
  const existing = await getUserSettings(userId)
  if (existing) return existing

  const [account] = await db.select().from(user).where(eq(user.id, userId)).limit(1)

  const [row] = await db
    .insert(userSettings)
    .values({
      userId,
      displayName: account?.name?.trim() || 'Hola',
      ...DEFAULTS,
      cycleConfig: { kind: 'calendar-month' },
    })
    .onConflictDoNothing()
    .returning()

  return row ? toSettings(row) : (await getUserSettings(userId))!
}

export async function updateDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  await db
    .update(userSettings)
    .set({ displayName, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
}
