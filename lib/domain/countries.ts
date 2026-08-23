/**
 * Países disponibles en la configuración inicial (spec 004).
 *
 * Se pregunta el **país de residencia**, no la nacionalidad: la moneda depende
 * de dónde vive la persona, no de dónde nació (RN-001).
 *
 * La lista es corta a propósito. Un desplegable con doscientos países es peor
 * que uno con veinte cuando el noventa y nueve por ciento de quienes lo abran
 * están en unos pocos.
 */

export type Pais = {
  readonly codigo: string
  readonly nombre: string
  readonly currency: string
  readonly locale: string
  readonly timeZone: string
}

export const PAISES: readonly Pais[] = [
  { codigo: 'CO', nombre: 'Colombia', currency: 'COP', locale: 'es-CO', timeZone: 'America/Bogota' },
  { codigo: 'MX', nombre: 'México', currency: 'MXN', locale: 'es-MX', timeZone: 'America/Mexico_City' },
  { codigo: 'AR', nombre: 'Argentina', currency: 'ARS', locale: 'es-AR', timeZone: 'America/Argentina/Buenos_Aires' },
  { codigo: 'CL', nombre: 'Chile', currency: 'CLP', locale: 'es-CL', timeZone: 'America/Santiago' },
  { codigo: 'PE', nombre: 'Perú', currency: 'PEN', locale: 'es-PE', timeZone: 'America/Lima' },
  { codigo: 'EC', nombre: 'Ecuador', currency: 'USD', locale: 'es-EC', timeZone: 'America/Guayaquil' },
  { codigo: 'UY', nombre: 'Uruguay', currency: 'UYU', locale: 'es-UY', timeZone: 'America/Montevideo' },
  { codigo: 'CR', nombre: 'Costa Rica', currency: 'CRC', locale: 'es-CR', timeZone: 'America/Costa_Rica' },
  { codigo: 'GT', nombre: 'Guatemala', currency: 'GTQ', locale: 'es-GT', timeZone: 'America/Guatemala' },
  { codigo: 'DO', nombre: 'República Dominicana', currency: 'DOP', locale: 'es-DO', timeZone: 'America/Santo_Domingo' },
  { codigo: 'PA', nombre: 'Panamá', currency: 'USD', locale: 'es-PA', timeZone: 'America/Panama' },
  { codigo: 'ES', nombre: 'España', currency: 'EUR', locale: 'es-ES', timeZone: 'Europe/Madrid' },
  { codigo: 'US', nombre: 'Estados Unidos', currency: 'USD', locale: 'es-US', timeZone: 'America/New_York' },
]

export const PAIS_POR_DEFECTO = PAISES[0]!

export function buscarPais(codigo: string): Pais | undefined {
  return PAISES.find((p) => p.codigo === codigo)
}
