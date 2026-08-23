'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

export function FormularioRestablecer() {
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  if (enviado) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <p>
          Si ese correo tiene una cuenta, le acaba de llegar un enlace para elegir
          una contraseña nueva. Caduca en una hora.
        </p>
        <p className="mt-3 text-muted-foreground">
          Revisa también la carpeta de correo no deseado.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={async (evento) => {
        evento.preventDefault()
        setEnviando(true)

        const datos = new FormData(evento.currentTarget)
        await authClient.requestPasswordReset({
          email: String(datos.get('email') ?? ''),
          redirectTo: '/nueva-contrasena',
        })

        // Se confirma siempre igual, exista o no la cuenta: responder distinto
        // permitiría averiguar qué correos están registrados (FR-009).
        setEnviando(false)
        setEnviado(true)
      }}
      className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
        />
      </div>

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar enlace'}
      </Button>
    </form>
  )
}
