'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAISES, PAIS_POR_DEFECTO, buscarPais } from '@/lib/domain/countries'
import { guardarConfiguracionInicial } from '@/lib/actions/onboarding'

/**
 * Configuración inicial (spec 004).
 *
 * Solo nombre y país. Cada campo adicional en esta pantalla es alguien que no
 * llega a usar la aplicación, y no debe pedirse ningún dato que no se use de
 * inmediato (D-023).
 */
export function FormularioBienvenida({ nombreSugerido }: { nombreSugerido: string }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(
    nombreSugerido === 'Hola' ? '' : nombreSugerido,
  )
  const [pais, setPais] = useState(PAIS_POR_DEFECTO.codigo)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const elegido = buscarPais(pais) ?? PAIS_POR_DEFECTO

  return (
    <form
      className="space-y-6 rounded-lg border bg-card p-6 shadow-sm"
      onSubmit={async (evento) => {
        evento.preventDefault()
        setError(null)
        setGuardando(true)

        const resultado = await guardarConfiguracionInicial({
          displayName: nombre,
          country: pais,
        })
        setGuardando(false)

        if (!resultado.ok) {
          setError(resultado.error)
          return
        }
        router.push('/')
        router.refresh()
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="nombre">¿Cómo quieres que te llamemos?</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Juan"
          autoComplete="given-name"
          autoFocus
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pais">¿Dónde vives?</Label>
        <Select value={pais} onValueChange={(v) => setPais(v ?? PAIS_POR_DEFECTO.codigo)}>
          <SelectTrigger id="pais" className="w-full">
            <SelectValue>
              {(valor) => buscarPais(String(valor ?? ''))?.nombre ?? 'Elige tu país'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PAISES.map((p) => (
              <SelectItem key={p.codigo} value={p.codigo}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Tus montos se mostrarán en {elegido.currency}. No se puede cambiar
          después de registrar movimientos.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={guardando}>
        {guardando ? 'Un momento…' : 'Empezar'}
      </Button>
    </form>
  )
}
