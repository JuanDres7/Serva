import { describe, it, expect } from 'vitest'
import ExcelJS from 'exceljs'
import { construirLibro, nombreDeArchivo } from '@/lib/export/excel'
import type { TransactionRow } from '@/lib/db/schema'

/**
 * Lo que decide si la exportación sirve: que los montos sean números y las
 * fechas, fechas. Si salieran como texto, sumar la columna en Excel daría cero y
 * el archivo no valdría para nada (spec 009, criterio 3).
 *
 * Se construye el libro y se vuelve a leer, que es lo más cerca de abrirlo en
 * Excel que se puede llegar sin abrirlo.
 */

const base = (extra: Partial<TransactionRow>): TransactionRow =>
  ({
    id: crypto.randomUUID(),
    userId: 'u',
    type: 'expense',
    amountCents: 100000,
    currency: 'COP',
    category: 'groceries',
    categorySource: 'user',
    occurredOn: '2026-08-10',
    description: 'mercado',
    descriptionShort: 'Mercado',
    status: 'active',
    voidedAt: null,
    isSample: false,
    savingGoalId: null,
    savingDirection: null,
    createdAt: new Date('2026-08-10T15:00:00Z'),
    updatedAt: new Date('2026-08-10T15:00:00Z'),
    ...extra,
  }) as TransactionRow

/**
 * Lee el libro tal como lo recibiría Excel.
 *
 * Las claves de columna no se guardan en el archivo, así que al releerlo hay que
 * localizar cada columna por su encabezado, exactamente igual que haría una
 * persona abriéndolo.
 */
async function leer(movimientos: TransactionRow[]) {
  const buffer = await construirLibro(movimientos, { locale: 'es-CO', currency: 'COP' })
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(new Uint8Array(buffer) as unknown as ArrayBuffer)
  const hoja = libro.getWorksheet('Movimientos')!

  const encabezados = (hoja.getRow(1).values as unknown[]).map((v) => String(v ?? ''))
  const columna = (titulo: string) => {
    const indice = encabezados.indexOf(titulo)
    if (indice < 0) throw new Error(`No hay columna «${titulo}»`)
    return indice
  }

  return {
    hoja,
    encabezados,
    celda: (fila: number, titulo: string) =>
      hoja.getRow(fila).getCell(columna(titulo)).value,
    filas: hoja.rowCount,
  }
}

describe('exportación a hoja de cálculo', () => {
  it('escribe los montos como números, no como texto', async () => {
    const libro = await leer([base({ amountCents: 1541850 })])
    const monto = libro.celda(2, 'Monto')

    expect(typeof monto).toBe('number')
    expect(monto).toBeCloseTo(15418.5, 2)
  })

  it('la suma de la columna coincide con el total real', async () => {
    // Criterio 3 de la spec: sumar en la hoja debe dar lo mismo que suma Finzen.
    const montos = [1541850, 41833, 999999, 1, 250075]
    const libro = await leer(montos.map((amountCents) => base({ amountCents })))

    let suma = 0
    for (let fila = 2; fila <= libro.filas; fila += 1) {
      suma += Number(libro.celda(fila, 'Monto'))
    }

    const esperado = montos.reduce((a, b) => a + b, 0) / 100
    expect(suma).toBeCloseTo(esperado, 2)
  })

  it('escribe las fechas como fechas', async () => {
    const libro = await leer([base({ occurredOn: '2026-08-10' })])
    const fecha = libro.celda(2, 'Fecha')

    expect(fecha).toBeInstanceOf(Date)
    expect((fecha as Date).toISOString()).toContain('2026-08-10')
  })

  it('traduce tipos, categorías y estados a algo legible', async () => {
    const libro = await leer([
      base({ type: 'income', category: 'salary' }),
      base({ status: 'voided' }),
    ])

    expect(libro.celda(2, 'Tipo')).toBe('Ingreso')
    expect(libro.celda(2, 'Categoría')).toBe('Salario')
    // Los anulados se incluyen, identificados como tales (FR-006).
    expect(libro.celda(3, 'Estado')).toBe('Anulado')
  })

  it('indica cómo se categorizó cada movimiento', async () => {
    const libro = await leer([base({ categorySource: 'model' })])
    expect(libro.celda(2, 'Origen de la categoría')).toBe('Sugerida por IA')
  })

  it('conserva el texto original y el resumido', async () => {
    const libro = await leer([
      base({ description: 'fui a la tienda y compré leche', descriptionShort: 'Leche' }),
    ])

    expect(libro.celda(2, 'Descripción')).toBe('fui a la tienda y compré leche')
    expect(libro.celda(2, 'Descripción corta')).toBe('Leche')
  })

  it('pone encabezados comprensibles sin documentación', async () => {
    const { encabezados } = await leer([base({})])

    expect(encabezados).toContain('Fecha')
    expect(encabezados).toContain('Monto')
    expect(encabezados).toContain('Categoría')
  })

  it('el nombre del archivo lleva la fecha', () => {
    expect(nombreDeArchivo('2026-08-23')).toBe('finzen-movimientos-2026-08-23.xlsx')
  })
})
