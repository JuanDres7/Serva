'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { borrarRecurrente } from '@/lib/actions/recurring'

/**
 * Eliminar un recurrente (FR-012, FR-013).
 *
 * Los movimientos que ya generó permanecen: son gastos que de verdad ocurrieron
 * y borrarlos falsearía el historial.
 */
export function BorrarRecurrente({
  id,
  descripcion,
}: {
  id: string
  descripcion: string
}) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  if (!confirmando) {
    return (
      <Button
        size="xs"
        variant="ghost"
        aria-label={`Eliminar ${descripcion}`}
        onClick={() => setConfirmando(true)}
      >
        Eliminar
      </Button>
    )
  }

  return (
    <span className="flex items-center gap-1">
      <Button
        size="xs"
        variant="destructive"
        disabled={borrando}
        onClick={async () => {
          setBorrando(true)
          const resultado = await borrarRecurrente(id)
          setBorrando(false)

          if (!resultado.ok) {
            toast.error(resultado.error)
            return
          }
          toast('Eliminado. Los movimientos que ya generó siguen en tu historial.')
          router.refresh()
        }}
      >
        Confirmar
      </Button>
      <Button size="xs" variant="ghost" onClick={() => setConfirmando(false)}>
        Cancelar
      </Button>
    </span>
  )
}
