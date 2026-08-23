import { categoriesFor, type MovementKind } from '@/lib/domain/categories'

/**
 * Construcción del mensaje que recibe el modelo.
 *
 * Artículo VI.3 — minimización: se envía la descripción y la lista de categorías
 * vigentes. Nada más. Ni identificador de usuario, ni monto, ni fecha, ni el
 * historial. El modelo no necesita saber de quién es el gasto para clasificarlo,
 * y lo que no se envía no puede filtrarse.
 */
export function construirMensaje(texto: string, tipo: MovementKind): string {
  const opciones = categoriesFor(tipo)
    .map((c) => `- ${c.key}: ${c.name}`)
    .join('\n')

  const queEs = tipo === 'expense' ? 'un gasto' : 'un ingreso'

  return `Clasifica ${queEs} personal en una de estas categorías:

${opciones}

Descripción escrita por la persona:
"${texto}"

Devuelve:
- categoria: la clave exacta de una de las categorías de la lista, nunca otra.
- confianza: entre 0 y 1, según lo seguro que estés. Si la descripción es
  ambigua o no encaja bien en ninguna, usa un valor bajo.
- descripcionCorta: la descripción resumida en pocas palabras, para mostrarla
  en una lista. Por ejemplo, "fui a la tienda y compré un cartón de leche" se
  resume como "Cartón de leche". Conserva el idioma original.`
}
