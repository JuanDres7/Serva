import Link from 'next/link'
import { FormularioRestablecer } from '@/components/formulario-restablecer'

export default function RestablecerPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Restablecer contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un enlace para elegir una nueva.
          </p>
        </div>

        <FormularioRestablecer />

        <p className="text-center text-sm">
          <Link href="/entrar" className="text-muted-foreground hover:text-foreground">
            Volver a entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
