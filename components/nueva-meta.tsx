'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatWhileTyping, parseAmount } from '@/lib/domain/money-format'
import { nuevaMeta } from '@/lib/actions/goals'

export function NuevaMeta({
  currency,
  locale,
  etiquetaBoton = '+ Nueva meta',
}: {
  currency: string
  locale: string
  etiquetaBoton?: string
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  if (!abierto) {
    return <Button onClick={() => setAbierto(true)}>{etiquetaBoton}</Button>
  }

  return (
    <form
      className="space-y-5 rounded-lg border bg-card p-5"
      onSubmit={async (evento) => {
        evento.preventDefault()
        setError(null)

        let parseado
        try {
          parseado = parseAmount(objetivo, currency, locale)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Monto inválido')
          return
        }
        if (!parseado || parseado.cents <= 0) {
          setError('Escribe cuánto necesitas reunir')
          return
        }

        const datos = new FormData(evento.currentTarget)
        datos.set('nombre', nombre)
        datos.set('objetivoCents', String(parseado.cents))
        datos.set('fechaObjetivo', fecha)

        setGuardando(true)
        const resultado = await nuevaMeta(datos)
        setGuardando(false)

        if (!resultado.ok) {
          setError(resultado.error)
          return
        }

        toast.success('Meta creada')
        setAbierto(false)
        setNombre('')
        setObjetivo('')
        setFecha('')
        router.refresh()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="meta-nombre">¿Para qué estás ahorrando?</Label>
        <Input
          id="meta-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="una moto, un viaje…"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta-objetivo">¿Cuánto necesitas reunir?</Label>
        <Input
          id="meta-objetivo"
          value={objetivo}
          onChange={(e) => setObjetivo(formatWhileTyping(e.target.value, locale))}
          inputMode="decimal"
          placeholder="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta-imagen">Una foto de lo que quieres</Label>
        <Input
          id="meta-imagen"
          name="imagen"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Opcional, pero ayuda: cuando dudes si gastar, verla pesa más que ver un
          número.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta-fecha">¿Para cuándo? (opcional)</Label>
        <Input
          id="meta-fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-auto"
        />
        <p className="text-xs text-muted-foreground">
          Con fecha te decimos cuánto aportar al mes. Sin ella, cuándo llegarías
          al ritmo actual.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={guardando}>
          {guardando ? 'Creando…' : 'Crear meta'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
