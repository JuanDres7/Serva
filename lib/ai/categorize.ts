import type { MovementKind } from '@/lib/domain/categories'
import {
  extraerPalabrasClave,
  normalizar,
  descripcionCorta as recortarDescripcion,
} from '@/lib/domain/keywords'
import type { ProveedorIA } from './provider'

/**
 * La cascada de categorización (D-013, D-044).
 *
 *   1. Palabras clave ─ ¿coincide con lo que este usuario ya categorizó?
 *   2. Similitud ────── aplazado a una feature posterior
 *   3. Modelo ───────── solo lo genuinamente nuevo
 *
 * Se detiene en el primer nivel que alcance el umbral. Que la mayoría de los
 * registros se resuelvan en el nivel 1 es lo que hace que la sugerencia se sienta
 * instantánea en una máquina sin tarjeta gráfica, y lo que permite sostener varios
 * usuarios a la vez dentro de una capa gratuita (D-041).
 *
 * Esta función no toca la base de datos ni la red: recibe la búsqueda y el
 * proveedor como dependencias. Por eso se prueba entera sin modelo instalado.
 */

export type Mecanismo = 'keywords' | 'similarity' | 'model' | 'none'

export type CoincidenciaHistorial = {
  readonly categoria: string
  readonly confianza: number
}

export type BuscarEnHistorial = (
  palabrasClave: readonly string[],
  tipo: MovementKind,
) => Promise<CoincidenciaHistorial | null>

export type ResultadoCategorizacion = {
  /** Clave de categoría, o `null` si no se alcanzó confianza suficiente. */
  readonly categoria: string | null
  readonly confianza: number
  readonly mecanismo: Mecanismo
  readonly descripcionCorta: string
  readonly textoNormalizado: string
  readonly palabrasClave: readonly string[]
  readonly latenciaMs: number
  /** Presente solo cuando el modelo falló, para poder diagnosticarlo después. */
  readonly motivoFallo?: string
}

/**
 * Por debajo de este valor no se sugiere nada.
 *
 * Es preferible que el usuario elija a que corrija: una sugerencia equivocada
 * cuesta más que la ausencia de sugerencia, porque primero hay que advertirla.
 */
export const UMBRAL_CONFIANZA = 0.6

export async function categorizar(params: {
  texto: string
  tipo: MovementKind
  buscarEnHistorial: BuscarEnHistorial
  proveedor: ProveedorIA
}): Promise<ResultadoCategorizacion> {
  const { texto, tipo, buscarEnHistorial, proveedor } = params
  const inicio = Date.now()

  const textoNormalizado = normalizar(texto)
  const palabrasClave = extraerPalabrasClave(texto)
  const cortaLocal = recortarDescripcion(texto)

  const sinSugerencia = (motivoFallo?: string): ResultadoCategorizacion => ({
    categoria: null,
    confianza: 0,
    mecanismo: 'none',
    descripcionCorta: cortaLocal,
    textoNormalizado,
    palabrasClave,
    latenciaMs: Date.now() - inicio,
    ...(motivoFallo ? { motivoFallo } : {}),
  })

  if (textoNormalizado === '') return sinSugerencia()

  // ── Nivel 1: lo que este usuario ya categorizó ──────────────────────────
  if (palabrasClave.length > 0) {
    try {
      const coincidencia = await buscarEnHistorial(palabrasClave, tipo)
      if (coincidencia && coincidencia.confianza >= UMBRAL_CONFIANZA) {
        return {
          categoria: coincidencia.categoria,
          confianza: coincidencia.confianza,
          mecanismo: 'keywords',
          descripcionCorta: cortaLocal,
          textoNormalizado,
          palabrasClave,
          latenciaMs: Date.now() - inicio,
        }
      }
    } catch {
      // Un fallo consultando el historial no debe impedir intentar con el
      // modelo: se sigue adelante.
    }
  }

  // ── Nivel 3: el modelo, solo para lo nuevo ──────────────────────────────
  if (!proveedor.disponible) return sinSugerencia()

  const respuesta = await proveedor.sugerir({ texto, tipo })

  if (respuesta.estado === 'no-disponible') return sinSugerencia()

  if (respuesta.estado === 'fallo') {
    // El registro continúa sin categoría: la categorización es una comodidad,
    // no un requisito (spec 002, FR-011).
    return sinSugerencia(respuesta.motivo)
  }

  const { sugerencia } = respuesta
  if (sugerencia.confianza < UMBRAL_CONFIANZA) {
    return sinSugerencia()
  }

  return {
    categoria: sugerencia.categoria,
    confianza: sugerencia.confianza,
    mecanismo: 'model',
    // El resumen del modelo es mejor que el recorte local, cuando lo hay.
    descripcionCorta: sugerencia.descripcionCorta || cortaLocal,
    textoNormalizado,
    palabrasClave,
    latenciaMs: Date.now() - inicio,
  }
}
