import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userSettings, user, type UserSettingsRow } from '@/lib/db/schema'
import type { CycleConfig } from '@/lib/domain/cycle'
import { buscarPais, PAIS_POR_DEFECTO } from '@/lib/domain/countries'

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
  /** Nulo mientras la persona no haya completado la configuración inicial. */
  readonly onboardedAt: Date | null
  /** Nulo mientras no haya elegido su ciclo de pago (D-027). */
  readonly cycleConfiguredAt: Date | null
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
    onboardedAt: row.onboardedAt,
    cycleConfiguredAt: row.cycleConfiguredAt,
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

/**
 * Guarda la configuración inicial: nombre y país (spec 004).
 *
 * El país determina moneda, formato numérico, formato de fecha y zona horaria.
 * La moneda solo puede fijarse aquí y mientras no existan movimientos: los
 * montos ya guardados no se convierten solos, y cambiarla después falsearía todo
 * el historial (FR-011).
 */
export async function completarConfiguracion(
  userId: string,
  datos: {
    displayName: string
    country: string
    /**
     * Con movimientos ya registrados, la moneda se conserva: los montos
     * guardados no se convierten solos y cambiarla falsearía el historial.
     * El resto de la configuración sí se aplica.
     */
    conservarMoneda?: boolean
  },
): Promise<void> {
  const pais = buscarPais(datos.country) ?? PAIS_POR_DEFECTO
  const actual = await getUserSettings(userId)

  await db
    .update(userSettings)
    .set({
      displayName: datos.displayName,
      country: pais.codigo,
      currency: datos.conservarMoneda && actual ? actual.currency : pais.currency,
      locale: pais.locale,
      timeZone: pais.timeZone,
      onboardedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, userId))
}

/**
 * Guarda el ciclo de pago del usuario (spec 005, FR-011).
 *
 * Se pregunta al entrar a presupuestos por primera vez: allí la pregunta llega
 * con contexto y el usuario entiende qué está definiendo. En el primer arranque
 * habría interpelado a alguien que aún no sabe para qué sirve la respuesta
 * (D-027).
 */
export async function guardarCiclo(userId: string, ciclo: CycleConfig): Promise<void> {
  await db
    .update(userSettings)
    .set({ cycleConfig: ciclo, cycleConfiguredAt: new Date(), updatedAt: new Date() })
    .where(eq(userSettings.userId, userId))
}
