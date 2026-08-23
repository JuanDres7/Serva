'use server'

import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import {
  generarDatosDeEjemplo,
  eliminarDatosDeEjemplo,
} from '@/lib/db/queries/sample-data'
import { todayIn } from '@/lib/domain/civil-date'

export type ResultadoEjemplo =
  | { readonly ok: true; readonly movimientos: number }
  | { readonly ok: false; readonly error: string }

export async function cargarDatosDeEjemplo(): Promise<ResultadoEjemplo> {
  try {
    const userId = await requireUserId()
    const settings = await ensureUserSettings(userId)

    const resultado = await generarDatosDeEjemplo(userId, {
      currency: settings.currency,
      hoy: todayIn(settings.timeZone),
    })

    revalidatePath('/')
    revalidatePath('/historial')
    return { ok: true, movimientos: resultado.movimientos }
  } catch {
    return { ok: false, error: 'No se pudieron cargar los datos de ejemplo' }
  }
}

export async function borrarDatosDeEjemplo(): Promise<ResultadoEjemplo> {
  try {
    const userId = await requireUserId()
    const eliminados = await eliminarDatosDeEjemplo(userId)

    revalidatePath('/')
    revalidatePath('/historial')
    return { ok: true, movimientos: eliminados }
  } catch {
    return { ok: false, error: 'No se pudieron eliminar los datos de ejemplo' }
  }
}
