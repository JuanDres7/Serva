import { HuecoEncabezado, HuecoTotales, HuecoLista } from '@/components/hueco'

/**
 * Espera del resumen y del historial.
 *
 * Solo estas dos pantallas la tienen, y por eso viven en su propio grupo de
 * rutas: son las que lanzan muchas consultas antes de poder dibujar nada. Las
 * demás resuelven de inmediato, y ahí un esqueleto no ayuda —hace que se sientan
 * más lentas de lo que son—.
 *
 * En Registro Fácil, además, hacía daño: el campo del monto recibe el foco al
 * montarse, y lo que se tecleara antes de que el contenido sustituyera al
 * esqueleto se perdía. Ambas comparten silueta, así que una sola espera basta.
 */
export default function Cargando() {
  return (
    <div className="space-y-8">
      <HuecoEncabezado />
      <HuecoTotales />
      <HuecoLista />
    </div>
  )
}
