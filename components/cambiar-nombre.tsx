'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cambiarNombre } from '@/lib/actions/settings'

export function CambiarNombre({ actual }: { actual: string }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(actual)
  const [guardando, setGuardando] = useState(false)

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (evento) => {
        evento.preventDefault()
        setGuardando(true)
        const resultado = await cambiarNombre(nombre)
        setGuardando(false)

        if (!resultado.ok) {
          toast.error(resultado.error)
          return
        }
        toast.success('Nombre actualizado')
        router.refresh()
      }}
    >
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        aria-label="Tu nombre"
        className="max-w-xs"
      />
      <Button type="submit" disabled={guardando || nombre.trim() === actual}>
        {guardando ? 'Guardando…' : 'Guardar'}
      </Button>
    </form>
  )
}
