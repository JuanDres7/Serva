import { test, expect, type Page } from '@playwright/test'

/**
 * Escenarios de la spec 006.
 *
 * Lo que se verifica: que el progreso avanza con aportes explícitos, que el
 * ahorro descuenta del saldo sin contar como gasto, y que la secuencia correcta
 * para usar el dinero —retirar y luego gastar— está a la vista.
 */

async function entrar(page: Page, nombre = 'Juan') {
  const email = `meta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@finzen.local`

  await page.goto('/entrar')
  await page.getByLabel('¿Cómo te llamas?').fill(nombre)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible()
  await page.getByLabel(/Cómo quieres que te llamemos/).fill(nombre)
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { name: new RegExp(nombre) })).toBeVisible()
}

async function crearMeta(page: Page, nombre: string, objetivo: string, fecha?: string) {
  await page.goto('/metas')
  await page.getByRole('button', { name: '+ Nueva meta' }).click()
  await page.getByLabel(/¿Para qué estás ahorrando\?/).fill(nombre)
  await page.getByLabel(/¿Cuánto necesitas reunir\?/).fill(objetivo)
  if (fecha) await page.getByLabel(/¿Para cuándo\?/).fill(fecha)
  await page.getByRole('button', { name: 'Crear meta' }).click()
  await expect(page.getByText('Meta creada')).toBeVisible()
}

async function aportar(page: Page, nombre: string, monto: string) {
  await page.getByRole('button', { name: 'Aportar', exact: true }).first().click()
  await page.getByLabel(new RegExp(`¿Cuánto le abonas a ${nombre}\\?`)).fill(monto)
  await page.getByRole('button', { name: 'Aportar', exact: true }).last().click()
}

test('E1 — se crea una meta y empieza en cero', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Moto', '6000000')

  await expect(page.getByRole('heading', { name: 'Moto' })).toBeVisible()
  await expect(page.getByText('0%')).toBeVisible()
  await expect(page.getByText(/Registra un aporte/)).toBeVisible()
})

test('E2 — aportar avanza el progreso sin contar como gasto', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Moto', '1000000')

  await aportar(page, 'Moto', '250000')
  await expect(page.getByText('Aporte registrado')).toBeVisible()
  await expect(page.getByText('25%')).toBeVisible()

  // D-028: el ahorro descuenta del saldo pero no infla el gasto. Si lo hiciera,
  // la aplicación diría «gastaste mucho» justo cuando el usuario ahorró.
  await page.goto('/')
  const principal = page.getByRole('main')
  await expect(principal.getByText('$ 0').first()).toBeVisible()
  await expect(principal.getByText('-$ 250.000').first()).toBeVisible()
})

test('E3 — con aportes, proyecta cuándo se alcanzaría', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Viaje', '1000000')
  await aportar(page, 'Viaje', '100000')

  // Lo que motiva son los datos, no las frases genéricas.
  await expect(page.getByText(/Al ritmo actual/)).toBeVisible()
})

test('E4 — con fecha objetivo dice cuánto aportar al mes', async ({ page }) => {
  await entrar(page)

  const enDosMeses = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10)
  await crearMeta(page, 'Computador', '4000000', enDosMeses)

  await expect(page.getByText(/Aportando esto al mes/)).toBeVisible()
})

test('E5 — retirar devuelve el dinero y baja el progreso', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Moto', '1000000')
  await aportar(page, 'Moto', '400000')
  await expect(page.getByText('40%')).toBeVisible()

  await page.getByRole('button', { name: 'Retirar', exact: true }).first().click()
  // E7 y RN-003: la secuencia correcta está a la vista, para no descontar el
  // mismo dinero dos veces.
  await expect(page.getByText(/retíralo aquí y registra el gasto aparte/)).toBeVisible()

  await page.getByLabel(/¿Cuánto sacas de Moto\?/).fill('150000')
  await page.getByRole('button', { name: 'Retirar', exact: true }).last().click()

  await expect(page.getByText('Retiro registrado')).toBeVisible()
  await expect(page.getByText('25%')).toBeVisible()
})

test('FR-008 — no se puede retirar más de lo aportado', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Moto', '1000000')
  await aportar(page, 'Moto', '100000')

  await page.getByRole('button', { name: 'Retirar', exact: true }).first().click()
  await page.getByLabel(/¿Cuánto sacas de Moto\?/).fill('500000')
  await page.getByRole('button', { name: 'Retirar', exact: true }).last().click()

  await expect(page.getByText(/más de lo que has aportado/)).toBeVisible()
})

test('E6 — al completarla se celebra y pasa a logradas', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Audífonos', '300000')
  await aportar(page, 'Audífonos', '300000')

  await expect(page.getByText(/¡Lo lograste!/)).toBeVisible()
  await expect(page.getByText('Metas logradas')).toBeVisible()
  // Se archiva, no se borra: el historial de lo conseguido motiva.
  await expect(page.getByText('Lograda', { exact: true }).first()).toBeVisible()
})

test('varias metas conviven', async ({ page }) => {
  await entrar(page)
  await crearMeta(page, 'Moto', '6000000')
  await crearMeta(page, 'Viaje', '3000000')

  await expect(page.getByRole('heading', { name: 'Moto' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Viaje' })).toBeVisible()
})
