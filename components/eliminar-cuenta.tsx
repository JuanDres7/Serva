'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

const CONFIRMACION = 'ELIMINAR'

/**
 * Eliminación de cuenta (spec 000, FR-013 y FR-019 · Art. VI.6).
 *
 * Se pide escribir una palabra en lugar de un simple «¿estás seguro?»: es
 * irreversible, y un diálogo de confirmación se acepta por reflejo.
 */
export function EliminarCuenta({ movimientos }: { movimientos: number }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [borrando, setBorrando] = useState(false)

  if (!abierto) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setAbierto(true)}>
        Eliminar mi cuenta
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <div className="space-y-2 text-sm">
        <p className="font-medium text-foreground">
          Esto elimina tu cuenta y {movimientos}{' '}
          {movimientos === 1 ? 'movimiento' : 'movimientos'}, sin vuelta atrás.
        </p>
        <p className="text-muted-foreground">
          Si quieres conservar tus datos, expórtalos antes desde el historial.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmar">
          Escribe <span className="font-mono font-medium">{CONFIRMACION}</span> para
          confirmar
        </Label>
        <Input
          id="confirmar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoComplete="off"
          className="max-w-xs"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={texto !== CONFIRMACION || borrando}
          onClick={async () => {
            setBorrando(true)
            const resultado = await authClient.deleteUser()
            setBorrando(false)

            if (resultado.error) {
              toast.error('No se pudo eliminar la cuenta')
              return
            }
            router.push('/entrar')
            router.refresh()
          }}
        >
          {borrando ? 'Eliminando…' : 'Eliminar definitivamente'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAbierto(false)
            setTexto('')
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
