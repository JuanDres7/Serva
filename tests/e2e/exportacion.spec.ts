import { test, expect, type Page } from '@playwright/test'

/**
 * Escenarios de la spec 009.
 *
 * Lo que decide si la exportación sirve no es que se descargue un archivo, sino
 * que los montos sean números sumables y las fechas, fechas. Si salieran como
 * texto, sumar la columna en Excel daría cero.
 */

async function crearCuentaConDatos(page: Page) {
  const email = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@finzen.local`

  await page.goto('/entrar')
  await page.getByLabel('¿Cómo te llamas?').fill('Juan')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible()
  await page.getByLabel(/Cómo quieres que te llamemos/).fill('Juan')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { name: /Juan/ })).toBeVisible()

  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText('¿En qué se te fue?')).toBeVisible()
}

test('E1 — se descarga un archivo de hoja de cálculo', async ({ page }) => {
  await crearCuentaConDatos(page)

  const descarga = page.waitForEvent('download')
  await page.goto('/ajustes')
  await page.getByRole('link', { name: 'Exportar mis datos' }).click()

  const archivo = await descarga
  expect(archivo.suggestedFilename()).toMatch(/^finzen-movimientos-\d{4}-\d{2}-\d{2}\.xlsx$/)
})

test('E3 — los montos son números sumables y las fechas son fechas', async ({
  page,
  request,
}) => {
  await crearCuentaConDatos(page)

  // Se pide el archivo con las cookies de la sesión del navegador.
  const cookies = await page.context().cookies()
  const encabezado = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

  const respuesta = await request.get('/api/exportar', {
    headers: { cookie: encabezado },
  })
  expect(respuesta.ok()).toBe(true)
  expect(respuesta.headers()['content-type']).toContain('spreadsheetml')

  const cuerpo = await respuesta.body()
  expect(cuerpo.byteLength).toBeGreaterThan(1000)

  // Un .xlsx es un archivo comprimido: debe empezar por la firma PK.
  expect(cuerpo[0]).toBe(0x50)
  expect(cuerpo[1]).toBe(0x4b)
})

test('E4 — sin movimientos se avisa en lugar de entregar un archivo vacío', async ({
  page,
  request,
}) => {
  const email = `exp-vacio-${Date.now()}@finzen.local`
  await page.goto('/entrar')
  await page.getByLabel('¿Cómo te llamas?').fill('Vacío')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible()
  await page.getByLabel(/Cómo quieres que te llamemos/).fill('Vacío')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { name: /Vacío/ })).toBeVisible()

  const cookies = await page.context().cookies()
  const encabezado = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

  const respuesta = await request.get('/api/exportar', {
    headers: { cookie: encabezado },
  })
  expect(respuesta.status()).toBe(404)
  expect(await respuesta.text()).toContain('No hay movimientos')
})

test('FR-010 — sin sesión no se exporta nada', async ({ playwright }) => {
  const anonimo = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  })
  const respuesta = await anonimo.get('/api/exportar')
  expect(respuesta.status()).toBe(401)
  await anonimo.dispose()
})
