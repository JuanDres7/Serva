'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn, signUp } from '@/lib/auth-client'

type Modo = 'entrar' | 'crear'

export function FormularioAcceso() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('crear')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    const datos = new FormData(evento.currentTarget)
    const email = String(datos.get('email') ?? '')
    const password = String(datos.get('password') ?? '')
    const name = String(datos.get('name') ?? '').trim()

    try {
      const resultado =
        modo === 'crear'
          ? await signUp.email({ email, password, name: name || 'Hola' })
          : await signIn.email({ email, password })

      if (resultado.error) {
        setError(
          modo === 'crear'
            ? 'No se pudo crear la cuenta. Revisa el correo y que la contraseña tenga al menos 8 caracteres.'
            : // FR-009: el mensaje no revela si el correo está registrado.
              'Correo o contraseña incorrectos.',
        )
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      {modo === 'crear' && (
        <div className="space-y-2">
          <Label htmlFor="name">¿Cómo te llamas?</Label>
          <Input id="name" name="name" autoComplete="given-name" placeholder="Juan" />
        </div>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
        />
        {modo === 'crear' && (
          <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
        )}
      </div>

      {modo === 'crear' && (
        // FR-016: autorización explícita, nunca marcada de antemano.
        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="autorizacion"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-input"
          />
          <span>
            Autorizo el tratamiento de mis datos para el funcionamiento de la
            aplicación. Las descripciones que escriba pueden enviarse a un proveedor
            externo de inteligencia artificial para categorizarlas.
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? 'Un momento…' : modo === 'crear' ? 'Crear cuenta' : 'Entrar'}
      </Button>

      <button
        type="button"
        onClick={() => {
          setModo(modo === 'crear' ? 'entrar' : 'crear')
          setError(null)
        }}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {modo === 'crear' ? '¿Ya tienes cuenta? Entrar' : 'Crear una cuenta nueva'}
      </button>
    </form>
  )
}
