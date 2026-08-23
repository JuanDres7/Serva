import { redirect } from 'next/navigation'
import { currentUserId } from '@/lib/session'
import { FormularioAcceso } from '@/components/formulario-acceso'

export default async function EntrarPage() {
  if (await currentUserId()) redirect('/')

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Finzen</h1>
          <p className="text-sm text-muted-foreground">
            Registra tus gastos en segundos y entiende a dónde se va tu dinero.
          </p>
        </div>

        <FormularioAcceso />

        {/* FR-015 de la spec 000: la advertencia debe verse antes de crear la
            cuenta, no después. Es la medida principal de protección de datos. */}
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Finzen es una aplicación de demostración. No ingreses información
          financiera real.
        </p>
      </div>
    </div>
  )
}
