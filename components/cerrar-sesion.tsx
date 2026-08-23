'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client'

export function CerrarSesion() {
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut()
        router.push('/entrar')
        router.refresh()
      }}
    >
      Salir
    </Button>
  )
}
