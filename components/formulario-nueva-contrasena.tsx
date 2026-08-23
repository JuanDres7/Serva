'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function FormularioNuevaContrasena({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  return (
    <form
      onSubmit={async (evento) => {
        evento.preventDefault()
        setError(null)

        const datos = new FormData(evento.currentTarget)
        const nueva = String(datos.get('password') ?? '')
        const repetida = String(datos.get('password2') ?? '')

        if (nueva !== repetida) {
          setError('Las dos contraseñas no coinciden')
          return
        }

        setEnviando(true)
        const resultado = await authClient.resetPassword({ newPassword: nueva, token })
        setEnviando(false)

        if (resultado.error) {
          setError('El enlace ya no sirve. Pide uno nuevo desde «Olvidé mi contraseña».')
          return
        }

        toast.success('Contraseña actualizada')
        router.push('/entrar')
      }}
      className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password2">Repítela</Label>
        <Input
          id="password2"
          name="password2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  )
}
