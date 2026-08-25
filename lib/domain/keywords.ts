/**
 * Extracción de términos con contenido de lo que escribe el usuario.
 *
 * Es el nivel 1 de la cascada (D-013) y la pieza que hace que la categorización
 * se sienta instantánea: si «leche» ya se categorizó antes, la quinta vez no
 * necesita modelo.
 *
 * Lógica pura, sin base de datos ni red.
 *
 * El problema que resuelve: una descripción en lenguaje natural nunca se repite
 * igual. «Fui a la tienda y compré un cartón de leche» y «compré leche en la
 * tienda» no comparten forma, pero sí comparten lo que importa.
 */

/**
 * Palabras sin contenido informativo para categorizar.
 *
 * Incluye verbos de compra y gasto —comprar, pagar, gastar— porque aparecen en
 * casi toda descripción y no distinguen una categoría de otra.
 */
const VACIAS = new Set([
  'a', 'al', 'algo', 'ante', 'aqui', 'asi', 'aun', 'cada', 'como', 'con', 'contra',
  'cual', 'cuando', 'de', 'del', 'desde', 'donde', 'dos', 'el', 'ella', 'ellos',
  'en', 'entre', 'era', 'ese', 'esa', 'eso', 'esta', 'este', 'esto', 'estos',
  'fue', 'fui', 'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas',
  'me', 'mi', 'mis', 'mucho', 'muy', 'nos', 'nada', 'ni', 'no', 'nuevo', 'nueva',
  'o', 'os', 'otra', 'otro', 'para', 'pero', 'poco', 'por', 'porque', 'que',
  'quien', 'se', 'segun', 'ser', 'si', 'sin', 'sobre', 'solo', 'son', 'su',
  'sus', 'tambien', 'tan', 'te', 'tengo', 'tiene', 'todo', 'toda', 'tras', 'tu',
  'tus', 'un', 'una', 'unas', 'uno', 'unos', 'y', 'ya', 'yo',
  // Verbos y sustantivos de transacción: presentes en casi todo, informativos
  // en nada.
  'abone', 'abono', 'compra', 'compras', 'compre', 'comprar', 'costo', 'cuesta',
  'gasta', 'gastar', 'gaste', 'gasto', 'ir', 'pagar', 'pago', 'pague', 'plata',
  'precio', 'valor', 'vale',
])

/** Quita tildes y diacríticos sin perder la ñ. */
export function quitarTildes(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-̂̄-ͯ]/g, '')
    .normalize('NFC')
}

/**
 * Forma canónica de una descripción: minúsculas, sin tildes ni puntuación.
 *
 * Es lo que se guarda para buscar coincidencias, de modo que «Almuerzo» y
 * «almuerzo!» sean lo mismo.
 */
export function normalizar(texto: string): string {
  return quitarTildes(texto.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Reduce plurales simples a su forma singular.
 *
 * Sin esto, «tomates» y «tomate» serían términos distintos y el aprendizaje se
 * fragmentaría. No pretende ser correcto en todos los casos: basta con que sea
 * consistente, porque se aplica igual al guardar y al buscar.
 */
export function singularizar(palabra: string): string {
  if (palabra.length > 4 && palabra.endsWith('es')) return palabra.slice(0, -2)
  if (palabra.length > 3 && palabra.endsWith('s')) return palabra.slice(0, -1)
  return palabra
}

/**
 * Términos con contenido de una descripción, sin repeticiones y en orden de
 * aparición.
 */
export function extraerPalabrasClave(texto: string): string[] {
  const vistos = new Set<string>()
  const resultado: string[] = []

  for (const palabra of normalizar(texto).split(' ')) {
    if (palabra.length < 3) continue
    if (VACIAS.has(palabra)) continue

    const raiz = singularizar(palabra)
    if (raiz.length < 3) continue
    if (VACIAS.has(raiz)) continue
    if (vistos.has(raiz)) continue

    vistos.add(raiz)
    resultado.push(raiz)
  }

  return resultado
}

/** Cuánto se parecen dos descripciones, entre 0 y 1, por términos compartidos. */
export function similitud(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0

  const conjuntoB = new Set(b)
  const comunes = a.filter((t) => conjuntoB.has(t)).length
  // Se divide por el conjunto más pequeño: que una descripción larga contenga
  // por completo a una corta es una coincidencia fuerte, no débil.
  return comunes / Math.min(a.length, conjuntoB.size)
}

const LARGO_MAXIMO = 45

/**
 * Etiqueta breve para mostrar en el historial (D-012).
 *
 * Esta es la versión sin modelo: recorta por palabras completas. Cuando la IA
 * está disponible produce algo mejor —«Cartón de leche» en lugar de «Fui a la
 * tienda y compré un…»—, pero el historial debe ser legible también sin ella.
 */
/**
 * La primera letra en mayúscula, y ninguna más.
 *
 * Un modelo devuelve el texto como lo oyó, y quien habla no escribe mayúsculas:
 * «palomitas cine», «primo», «mi hermana». Eso llegaba tal cual al historial y
 * a las tarjetas, y una lista entera en minúscula se lee como algo a medio
 * hacer.
 *
 * Solo la primera. Poner en Mayúscula Cada Palabra es una convención del
 * inglés; en español «Palomitas Cine» se lee peor que «palomitas cine».
 */
export function enMayuscula(texto: string): string {
  // Se normaliza a NFC primero: si el acento viaja como carácter combinante
  // aparte, tocar la primera posición puede partir la letra de su tilde.
  const limpio = texto.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (limpio === '') return ''

  return limpio.charAt(0).toUpperCase() + limpio.slice(1)
}

export function descripcionCorta(texto: string): string {
  const limpio = texto.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (limpio === '') return ''

  const capitalizado = enMayuscula(limpio)
  if (capitalizado.length <= LARGO_MAXIMO) return capitalizado

  // Se arma palabra a palabra en lugar de recortar por posición: así nunca se
  // parte una palabra a la mitad.
  let acumulado = ''
  for (const palabra of capitalizado.split(' ')) {
    const candidato = acumulado === '' ? palabra : `${acumulado} ${palabra}`
    if (candidato.length > LARGO_MAXIMO) break
    acumulado = candidato
  }

  // Si la primera palabra ya excede el límite, no queda más que recortarla.
  if (acumulado === '') acumulado = capitalizado.slice(0, LARGO_MAXIMO)

  return `${acumulado.replace(/[.,;:]+$/, '')}…`
}
