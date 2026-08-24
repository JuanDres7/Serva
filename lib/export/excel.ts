import ExcelJS from 'exceljs'
import { findCategory } from '@/lib/domain/categories'
import { currencyDecimals } from '@/lib/domain/money'
import type { TransactionRow } from '@/lib/db/schema'

/**
 * Exportación a hoja de cálculo (spec 009).
 *
 * El Artículo VI obliga a que el usuario pueda llevarse sus datos. Cumplirlo con
 * un volcado técnico sería cumplirlo solo en el papel: la gente revisa y hace
 * cuentas en hojas de cálculo, así que se exporta en el formato que de verdad
 * usa.
 *
 * Lo que decide si esto sirve: los montos salen como **números**, no como texto.
 * Si salieran como texto, sumar la columna en Excel daría cero y la exportación
 * no valdría para nada.
 */

const ENCABEZADOS = [
  { clave: 'fecha', titulo: 'Fecha', ancho: 12 },
  { clave: 'tipo', titulo: 'Tipo', ancho: 10 },
  { clave: 'categoria', titulo: 'Categoría', ancho: 20 },
  { clave: 'monto', titulo: 'Monto', ancho: 16 },
  { clave: 'moneda', titulo: 'Moneda', ancho: 9 },
  { clave: 'descripcion', titulo: 'Descripción', ancho: 40 },
  { clave: 'descripcionCorta', titulo: 'Descripción corta', ancho: 24 },
  { clave: 'origen', titulo: 'Origen de la categoría', ancho: 20 },
  { clave: 'estado', titulo: 'Estado', ancho: 12 },
  { clave: 'creado', titulo: 'Registrado', ancho: 18 },
] as const

const TIPOS: Record<string, string> = {
  expense: 'Gasto',
  income: 'Ingreso',
  saving: 'Ahorro',
}

const ORIGENES: Record<string, string> = {
  user: 'Elegida por mí',
  keywords: 'Sugerida por historial',
  similarity: 'Sugerida por similitud',
  model: 'Sugerida por IA',
}

export async function construirLibro(
  movimientos: readonly TransactionRow[],
  opciones: { locale: string; currency: string },
): Promise<Buffer> {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'Serva'
  libro.created = new Date()

  const hoja = libro.addWorksheet('Movimientos')
  hoja.columns = ENCABEZADOS.map((e) => ({ key: e.clave, header: e.titulo, width: e.ancho }))

  hoja.getRow(1).font = { bold: true }
  hoja.views = [{ state: 'frozen', ySplit: 1 }]

  const decimales = currencyDecimals(opciones.currency)
  const factor = 10 ** decimales

  for (const movimiento of movimientos) {
    hoja.addRow({
      // Fecha real, no texto: la hoja de cálculo debe poder ordenar y filtrar
      // por ella.
      fecha: new Date(`${movimiento.occurredOn}T00:00:00Z`),
      tipo: TIPOS[movimiento.type] ?? movimiento.type,
      categoria: movimiento.category
        ? (findCategory(movimiento.category)?.name ?? movimiento.category)
        : 'Ahorro',
      // Número, nunca texto: de esto depende que la columna se pueda sumar.
      monto: movimiento.amountCents / factor,
      moneda: movimiento.currency,
      descripcion: movimiento.description ?? '',
      descripcionCorta: movimiento.descriptionShort ?? '',
      origen: ORIGENES[movimiento.categorySource] ?? movimiento.categorySource,
      estado: movimiento.status === 'voided' ? 'Anulado' : 'Activo',
      creado: movimiento.createdAt,
    })
  }

  hoja.getColumn('fecha').numFmt = 'dd/mm/yyyy'
  hoja.getColumn('creado').numFmt = 'dd/mm/yyyy hh:mm'
  hoja.getColumn('monto').numFmt = decimales === 0 ? '#,##0' : `#,##0.${'0'.repeat(decimales)}`
  hoja.autoFilter = { from: 'A1', to: { row: 1, column: ENCABEZADOS.length } }

  const datos = await libro.xlsx.writeBuffer()
  return Buffer.from(datos)
}

export function nombreDeArchivo(hoy: string): string {
  return `serva-movimientos-${hoy}.xlsx`
}
