import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { db, client } from '@/lib/db'
import { user, userSettings, transactions } from '@/lib/db/schema'
import {
  ensureUserSettings,
  completarConfiguracion,
  getUserSettings,
} from '@/lib/db/queries/settings'
import { createTransaction } from '@/lib/db/queries/transactions'

/**
 * Configuración inicial con datos previos.
 *
 * Regresión de un fallo real: la configuración se bloqueaba cuando ya había
 * movimientos, para proteger la moneda. Pero el contenedor de la aplicación
 * manda a esa pantalla a quien no la ha completado, así que una cuenta anterior
 * quedaba encerrada: no podía configurarse ni salir de ahí.
 *
 * Lo que no puede cambiar con movimientos registrados es la **moneda**, no la
 * configuración entera.
 */

const USUARIO = 'test-onboarding-user'

afterAll(async () => {
  await db.delete(user).where(sql`id = ${USUARIO}`)
  await client.end()
})

describe('configuración inicial', () => {
  beforeAll(async () => {
    await db
      .insert(user)
      .values({
        id: USUARIO,
        name: 'Juan',
        email: 'onboarding@test.local',
        emailVerified: false,
      })
      .onConflictDoNothing()
  })

  beforeEach(async () => {
    await db.delete(transactions).where(sql`user_id = ${USUARIO}`)
    await db.delete(userSettings).where(sql`user_id = ${USUARIO}`)
  })

  it('una cuenta nueva arranca sin configurar', async () => {
    const settings = await ensureUserSettings(USUARIO)
    expect(settings.onboardedAt).toBeNull()
  })

  it('al configurarse toma la moneda y los formatos del país', async () => {
    await ensureUserSettings(USUARIO)
    await completarConfiguracion(USUARIO, { displayName: 'Juan', country: 'ES' })

    const settings = await getUserSettings(USUARIO)
    expect(settings?.currency).toBe('EUR')
    expect(settings?.locale).toBe('es-ES')
    expect(settings?.timeZone).toBe('Europe/Madrid')
    expect(settings?.onboardedAt).not.toBeNull()
  })

  it('con movimientos registrados, la moneda se conserva', async () => {
    await ensureUserSettings(USUARIO)
    await createTransaction(USUARIO, {
      type: 'expense',
      amountCents: 1500000,
      currency: 'COP',
      category: 'groceries',
      occurredOn: '2026-08-01',
      categorySource: 'user',
    })

    await completarConfiguracion(USUARIO, {
      displayName: 'Juan Andrés',
      country: 'ES',
      conservarMoneda: true,
    })

    const settings = await getUserSettings(USUARIO)
    // Los montos guardados no se convierten solos: cambiar la moneda haría que
    // 15.000 pesos pasaran a leerse como 15.000 euros.
    expect(settings?.currency).toBe('COP')
  })

  it('pero la configuración se completa igual: nadie queda encerrado', async () => {
    // El fallo original: con movimientos, la pantalla no dejaba continuar y el
    // contenedor seguía mandando a ella. Sin salida.
    await ensureUserSettings(USUARIO)
    await createTransaction(USUARIO, {
      type: 'expense',
      amountCents: 1000,
      currency: 'COP',
      category: 'groceries',
      occurredOn: '2026-08-01',
      categorySource: 'user',
    })

    await completarConfiguracion(USUARIO, {
      displayName: 'Juan Andrés',
      country: 'CO',
      conservarMoneda: true,
    })

    const settings = await getUserSettings(USUARIO)
    expect(settings?.onboardedAt).not.toBeNull()
    expect(settings?.displayName).toBe('Juan Andrés')
  })

  it('las cuentas que ya estaban en uso quedaron marcadas como configuradas', async () => {
    // Lo hizo la migración 0005. Sin ella, toda cuenta anterior a esta pantalla
    // sería enviada a configurarse cada vez que entra.
    //
    // Se excluyen las cuentas de prueba: otras suites crean ajustes y
    // movimientos sin pasar por la configuración, que es legítimo para lo que
    // comprueban. Sin esta exclusión, el resultado de esta prueba dependería de
    // qué otras estuvieran corriendo en paralelo, y un oráculo que cambia según
    // el reparto de trabajo no sirve como señal.
    const [fila] = await db.execute<{ pendientes: number }>(sql`
      SELECT count(*)::int AS pendientes
      FROM user_settings s
      WHERE s.onboarded_at IS NULL
        AND s.user_id NOT LIKE 'test-%'
        AND EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = s.user_id)
    `)

    expect(fila?.pendientes).toBe(0)
  })

  it('el nombre se puede seguir cambiando después', async () => {
    await ensureUserSettings(USUARIO)
    await completarConfiguracion(USUARIO, { displayName: 'Juan', country: 'CO' })

    await db
      .update(userSettings)
      .set({ displayName: 'Juana' })
      .where(eq(userSettings.userId, USUARIO))

    expect((await getUserSettings(USUARIO))?.displayName).toBe('Juana')
  })
})
