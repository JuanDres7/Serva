'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cargarDatosDeEjemplo, borrarDatosDeEjemplo } from '@/lib/actions/sample-data'

export function CargarEjemplo() {
  const router = useRouter()
  const [cargando, setCargando] = useState(false)

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full"
      disabled={cargando}
      onClick={async () => {
        setCargando(true)
        const resultado = await cargarDatosDeEjemplo()
        setCargando(false)

        if (!resultado.ok) {
          toast.error(resultado.error)
          return
        }
        toast.success(`${resultado.movimientos} movimientos de ejemplo cargados`)
        router.refresh()
      }}
    >
      {cargando ? 'Preparando…' : 'Ver con datos de ejemplo'}
    </Button>
  )
}

export function BorrarEjemplo() {
  const router = useRouter()
  const [borrando, setBorrando] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Estás viendo datos de ejemplo. Bórralos cuando quieras empezar con los
        tuyos.
      </p>
      <Button
        variant="ghost"
        size="sm"
        disabled={borrando}
        onClick={async () => {
          setBorrando(true)
          const resultado = await borrarDatosDeEjemplo()
          setBorrando(false)

          if (!resultado.ok) {
            toast.error(resultado.error)
            return
          }
          toast('Datos de ejemplo eliminados')
          router.refresh()
        }}
      >
        {borrando ? 'Borrando…' : 'Borrar ejemplos'}
      </Button>
    </div>
  )
}
