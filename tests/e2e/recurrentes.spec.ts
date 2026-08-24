import { test, expect, type Page } from '@playwright/test'

/**
 * Escenarios de la spec 007.
 *
 * Serva no está conectada a ningún banco, así que lo que se verifica es el
 * mecanismo de preguntar: definir, confirmar, ajustar el monto, reprogramar y
 * eliminar sin perder el historial.
 */

async function entrar(page: Page, nombre = 'Juan') {
  const email = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@serva.local`

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

/**
 * Carga los datos de ejemplo, que incluyen un recurrente vencido.
 *
 * Crear uno desde la interfaz nunca produce un cobro pendiente —se programa para
 * la próxima vez que llegue su día, que es lo correcto—, así que sin esto no
 * habría forma de probar la confirmación sin esperar a una fecha.
 */
async function conRecurrentePendiente(page: Page) {
  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText(/movimientos de ejemplo cargados/)).toBeVisible()
  await page.goto('/recurrentes')
  await expect(page.getByText(/cobro por confirmar/)).toBeVisible()
}

test('E1 — se define un recurrente y aparece con su próxima fecha', async ({ page }) => {
  await entrar(page)
  await page.goto('/recurrentes')

  await page.getByRole('button', { name: '+ Nuevo movimiento recurrente' }).click()
  await page.getByLabel('¿De qué se trata?').fill('arriendo')
  await page.getByLabel('¿De cuánto?').fill('1200000')
  await page.getByLabel('Categoría').click()
  await page.getByRole('option', { name: 'Vivienda', exact: true }).click()
  await page.getByLabel('Día del mes').fill('1')
  await page.getByRole('button', { name: 'Crear' }).click()

  await expect(page.getByText('Movimiento recurrente creado')).toBeVisible()
  await expect(page.getByText('arriendo')).toBeVisible()
  await expect(page.getByText(/El 1 de cada mes/)).toBeVisible()
})

test('FR-003 — avisa de la regla del último día del mes', async ({ page }) => {
  await entrar(page)
  await page.goto('/recurrentes')

  await page.getByRole('button', { name: '+ Nuevo movimiento recurrente' }).click()
  await page.getByLabel('Día del mes').fill('31')

  // La regla que el usuario no tiene por qué adivinar.
  await expect(page.getByText(/último día del mes/)).toBeVisible()
})

test('E2 — confirmar un cobro lo registra como movimiento normal', async ({ page }) => {
  await entrar(page)
  await conRecurrentePendiente(page)

  await page.getByRole('button', { name: 'Sí', exact: true }).click()
  await expect(page.getByText('Cobro confirmado')).toBeVisible()

  // FR-008: queda en el historial como cualquier otro movimiento, y deja de
  // estar pendiente.
  await expect(page.getByText(/cobro por confirmar/)).toHaveCount(0)
  await page.goto('/historial')
  await expect(page.getByText('arriendo').first()).toBeVisible()
})

test('E3 — al cambiar el monto se pregunta si es permanente', async ({ page }) => {
  await entrar(page)
  await conRecurrentePendiente(page)

  await page.getByRole('button', { name: /Cambiar el monto/ }).click()
  await page.getByLabel(/Monto de arriendo/).fill('1300000')

  // FR-010: es lo único que el sistema no puede inferir.
  await expect(page.getByText(/¿Este cambio es…\?/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'De ahora en adelante' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Solo esta vez' })).toBeVisible()

  await page.getByRole('button', { name: 'De ahora en adelante' }).click()
  await expect(page.getByText('Cobro confirmado')).toBeVisible()

  // El nuevo monto queda para las próximas veces.
  await page.goto('/recurrentes')
  await expect(page.getByText(/1\.300\.000/)).toBeVisible()
})

test('E4 — un cobro que no ocurrió se reprograma', async ({ page }) => {
  await entrar(page)
  await conRecurrentePendiente(page)

  await page.getByRole('button', { name: 'No', exact: true }).click()
  await expect(page.getByText(/¿Cuándo se hará efectivo\?/)).toBeVisible()

  const futuro = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
  await page.getByLabel(/¿Cuándo se hará efectivo\?/).fill(futuro)
  await page.getByRole('button', { name: 'Reprogramar' }).click()

  await expect(page.getByText('Cobro reprogramado')).toBeVisible()
  // Deja de estar pendiente y no se registró nada.
  await expect(page.getByText(/cobro por confirmar/)).toHaveCount(0)
})

test('E5 — eliminar no borra los movimientos que ya generó', async ({ page }) => {
  await entrar(page)
  await conRecurrentePendiente(page)

  await page.getByRole('button', { name: 'Sí', exact: true }).click()
  await expect(page.getByText('Cobro confirmado')).toBeVisible()

  // Al confirmar, el recurrente pasa de «pendiente» a «programado» y la lista se
  // vuelve a dibujar: esperar a ese cambio evita pulsar un botón que ya no está.
  await expect(page.getByText(/cobro por confirmar/)).toHaveCount(0)
  await page.getByRole('button', { name: /Eliminar arriendo/ }).click()
  await page.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText(/siguen en tu historial/)).toBeVisible()

  // El recurrente se fue; el gasto que ocurrió de verdad, no.
  await page.goto('/historial')
  await expect(page.getByText('arriendo').first()).toBeVisible()
})

test('FR-014 — el saludo indica cuántos cobros hay por confirmar', async ({ page }) => {
  await entrar(page)
  await conRecurrentePendiente(page)

  await page.goto('/')
  await expect(page.getByText(/cobro por confirmar/)).toBeVisible()
})

test('FR-007 — los pendientes no bloquean el uso de la aplicación', async ({ page }) => {
  await entrar(page)
  await conRecurrentePendiente(page)

  // Se pueden ignorar y seguir usando todo lo demás.
  await page.goto('/registro')
  await expect(page.getByLabel(/¿De cuánto fue/)).toBeVisible()

  await page.goto('/historial')
  await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible()
})
