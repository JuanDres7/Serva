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
 *
 * Los colores vienen del sistema visual, no de la paleta por defecto de
 * Recharts: un rojo de semáforo junto a un verde de semáforo convierte el
 * resumen del mes en un veredicto, que es justo el tono que Finzen evita.
 * Aquí el gasto es terracota apagada y el ingreso salvia, los mismos tonos que
 * llevan las categorías en el resto de la aplicación.
 */
const TINTA = {
  ingresos: '#5f9e7d',
  gastos: '#cf8b6f',
  actual: '#4f7a63',
  anterior: '#b6b3a6',
  rejilla: '#ddd9cd',
  eje: '#7d7f74',
} as const

/** Detalle emergente: la misma tarjeta crema que el resto de superficies. */
const EMERGENTE = {
  fontSize: 13,
  borderRadius: 14,
  border: '1px solid #ddd9cd',
  backgroundColor: '#fdfcf8',
  boxShadow: '0 4px 16px rgb(60 60 40 / 8%)',
} as const

const EJE = { fill: TINTA.eje, fontSize: 12 } as const

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
          <CartesianGrid stroke={TINTA.rejilla} vertical={false} />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={EJE} />
          <YAxis
            tickFormatter={(v: number) => abreviar(v)}
            tickLine={false}
            axisLine={false}
            tick={EJE}
            width={44}
          />
          <Tooltip
            formatter={(valor) => formatear(Number(valor))}
            cursor={{ fill: '#00000008' }}
            contentStyle={EMERGENTE}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: TINTA.eje }} />
          <Bar dataKey="ingresos" name="Ingresos" fill={TINTA.ingresos} radius={[6, 6, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill={TINTA.gastos} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Se reciben la moneda y la configuración regional, no una función de formato:
 * las funciones no pueden cruzar de un componente de servidor a uno de cliente.
 */
type Formato = {
  readonly currency: string
  readonly locale: string
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
          <CartesianGrid stroke={TINTA.rejilla} vertical={false} />
          <XAxis
            dataKey="dia"
            tickLine={false}
            axisLine={false}
            tick={EJE}
            label={{
              value: 'día del período',
              position: 'insideBottom',
              offset: -4,
              fontSize: 11,
              fill: TINTA.eje,
            }}
          />
          <YAxis
            tickFormatter={(v: number) => abreviar(v)}
            tickLine={false}
            axisLine={false}
            tick={EJE}
            width={44}
          />
          <Tooltip
            formatter={(valor) => formatear(Number(valor))}
            labelFormatter={(dia) => `Día ${dia}`}
            contentStyle={EMERGENTE}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: TINTA.eje }} />
          {/* El período anterior va detrás y apagado: es la referencia, no el
              protagonista. */}
          <Line
            type="monotone"
            dataKey="anterior"
            name="Período anterior"
            stroke={TINTA.anterior}
            strokeDasharray="4 4"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Este período"
            stroke={TINTA.actual}
            dot={false}
            strokeWidth={2.5}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
