import { redirect } from 'next/navigation'
import { currentUserId } from '@/lib/session'
import { FormularioAcceso } from '@/components/formulario-acceso'
import { Marca } from '@/components/navegacion'

/*
 * La puerta de entrada.
 *
 * En pantalla ancha se parte en dos: a la izquierda qué es Serva, a la derecha
 * el formulario. Un formulario solo en medio de la pantalla no dice nada de la
 * aplicación, y esta es la única pantalla que ve alguien que todavía no la
 * conoce.
 */

const PROMESAS = [
  'Anotas un gasto en cinco segundos.',
  'Serva le pone la categoría por ti.',
  'Le preguntas a dónde se fue tu dinero, en tus palabras.',
]

export default async function EntrarPage() {
  if (await currentUserId()) redirect('/')

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-between gap-10 bg-accent px-6 py-8 lg:px-12 lg:py-12">
        <Marca />

        <div className="escalonado max-w-lg space-y-8">
          <h1 className="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">
            Saber en qué se te va el dinero no debería ser un trabajo.
          </h1>

          <ul className="escalonado space-y-3">
            {PROMESAS.map((promesa) => (
              <li key={promesa} className="flex gap-3 text-sm">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {promesa}
              </li>
            ))}
          </ul>
        </div>

        {/* FR-015 de la spec 000: la advertencia debe verse antes de crear la
            cuenta, no después. Es la medida principal de protección de datos. */}
        <p className="max-w-md rounded-xl border border-amber-300/60 bg-amber-100/60 px-4 py-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Serva es una aplicación de demostración. No ingreses información
          financiera real.
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12 lg:px-12">
        <div className="entra-escala w-full max-w-sm">
          <FormularioAcceso />
        </div>
      </div>
    </div>
  )
}
