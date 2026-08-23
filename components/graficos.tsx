'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PuntoAcumulado } from '@/lib/domain/series'
import { formatMoney } from '@/lib/domain/money-format'

/**
 * Los gráficos de la spec 008.
 *
 * Cada uno responde una pregunta que el usuario se hace de verdad; si no se
 * puede nombrar la pregunta, el gráfico no se construye (D-034).
 */

/**
 * Se reciben la moneda y la configuración regional, no una función de formato:
 * las funciones no pueden cruzar de un componente de servidor a uno de cliente.
 */
type Formato = {
  readonly currency: string
  readonly locale: string
}

/** Los ejes muestran miles: la cifra exacta se lee en el detalle emergente. */
function abreviar(cents: number): string {
  const unidades = cents / 100
  if (Math.abs(unidades) >= 1_000_000) return `${Math.round(unidades / 1_000_000)}M`
  if (Math.abs(unidades) >= 1_000) return `${Math.round(unidades / 1_000)}k`
  return String(Math.round(unidades))
}

export function GraficoEvolucion({
  datos,
  currency,
  locale,
}: {
  datos: readonly { etiqueta: string; ingresos: number; gastos: number }[]
} & Formato) {
  const formatear = (cents: number) => formatMoney({ cents, currency }, locale)

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...datos]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={(v: number) => abreviar(v)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={44}
          />
          <Tooltip
            formatter={(valor) => formatear(Number(valor))}
            contentStyle={{ fontSize: 13, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoRitmo({
  datos,
  currency,
  locale,
}: {
  datos: readonly PuntoAcumulado[]
} & Formato) {
  const formatear = (cents: number) => formatMoney({ cents, currency }, locale)

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={[...datos]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            label={{ value: 'día del período', position: 'insideBottom', offset: -4, fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => abreviar(v)}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={44}
          />
          <Tooltip
            formatter={(valor) => formatear(Number(valor))}
            labelFormatter={(dia) => `Día ${dia}`}
            contentStyle={{ fontSize: 13, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {/* El período anterior va detrás y apagado: es la referencia, no el
              protagonista. */}
          <Line
            type="monotone"
            dataKey="anterior"
            name="Período anterior"
            stroke="#94a3b8"
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Este período"
            stroke="#2563eb"
            dot={false}
            strokeWidth={2.5}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
