import Link from 'next/link'
import { FormularioNuevaContrasena } from '@/components/formulario-nueva-contrasena'

export default async function NuevaContrasenaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
        </div>

        {!token || error ? (
          <div className="space-y-4 rounded-lg border bg-card p-6 text-sm">
            <p>
              Este enlace ya no sirve: o se usó antes, o caducó. Los enlaces
              funcionan una sola vez y durante una hora.
            </p>
            <Link
              href="/restablecer"
              className="inline-block text-primary hover:underline"
            >
              Pedir uno nuevo
            </Link>
          </div>
        ) : (
          <FormularioNuevaContrasena token={token} />
        )}

        <p className="text-center text-sm">
          <Link href="/entrar" className="text-muted-foreground hover:text-foreground">
            Volver a entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
