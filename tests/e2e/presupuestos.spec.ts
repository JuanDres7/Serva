import { test, expect, type Page } from '@playwright/test'

/**
 * Escenarios de la spec 005.
 *
 * Lo que se verifica: que la primera visita pregunta el ciclo, que las
 * sugerencias parten del historial real y que superar un tope informa sin
 * impedir nada.
 */

async function entrar(page: Page, nombre = 'Juan') {
  const email = `pre-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@serva.local`

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

/** Configura el ciclo y deja la sección lista para usar. */
async function configurarCiclo(page: Page) {
  await page.goto('/presupuestos')
  await expect(page.getByRole('heading', { name: /¿Cada cuánto te pagan\?/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText(/Tus períodos se miden así/)).toBeVisible()
}

test('E1 — la primera visita pregunta el ciclo de pago', async ({ page }) => {
  await entrar(page)
  await page.goto('/presupuestos')

  // D-027: aquí la pregunta llega con contexto; en el primer arranque habría
  // interpelado a alguien que aún no sabe para qué sirve la respuesta.
  await expect(page.getByRole('heading', { name: /¿Cada cuánto te pagan\?/ })).toBeVisible()
  await expect(page.getByText(/tu mes va del 15 al 14/)).toBeVisible()
})

test('E1 — el ciclo admite las formas del motor de períodos', async ({ page }) => {
  await entrar(page)
  await page.goto('/presupuestos')

  for (const opcion of [
    /Del 1 al último día del mes/,
    /Una vez al mes, un día fijo/,
    /Dos veces al mes/,
    /Cada semana/,
    /Cada cierto número de días/,
  ]) {
    await expect(page.getByText(opcion)).toBeVisible()
  }
})

test('E1 — avisa de la regla del último día del mes', async ({ page }) => {
  await entrar(page)
  await page.goto('/presupuestos')

  await page.getByRole('radio', { name: /Una vez al mes/ }).check()
  await expect(page.getByText(/se usa el último día del mes/)).toBeVisible()
  await expect(page.getByText(/no se mueven por fines de semana/)).toBeVisible()
})

test('E1 — un ciclo quincenal con días iguales no se acepta', async ({ page }) => {
  await entrar(page)
  await page.goto('/presupuestos')

  await page.getByRole('radio', { name: /Dos veces al mes/ }).check()
  await page.getByLabel('Primer día').fill('15')
  await page.getByLabel('Segundo día').fill('15')
  await page.getByRole('button', { name: 'Continuar' }).click()

  await expect(page.getByText(/deben ser distintos/)).toBeVisible()
})

test('E2 — propone topes a partir del gasto real', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText(/movimientos de ejemplo cargados/)).toBeVisible()

  await configurarCiclo(page)

  // FR-002: sin esto el usuario tendría que inventarse un número, que es
  // exactamente por lo que los presupuestos se abandonan.
  await expect(page.getByText('Con tus datos')).toBeVisible()
  await expect(page.getByText(/gastas .* en promedio/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^Poner / }).first()).toBeVisible()
})

test('E2 — aceptar la sugerencia deja el tope puesto', async ({ page }) => {
  await entrar(page)
  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText(/movimientos de ejemplo cargados/)).toBeVisible()
  await configurarCiclo(page)

  await page.getByRole('button', { name: /^Poner / }).first().click()

  // Lo que importa no es el aviso efímero sino que el tope quede puesto y
  // midiéndose.
  await expect(page.getByText(/Te quedan|Vas .* por encima/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Quitar el tope de/ }).first()).toBeVisible()
})

test('E3 — se puede definir un tope a mano', async ({ page }) => {
  await entrar(page)
  await configurarCiclo(page)

  await page.getByRole('button', { name: '+ Poner tope a otra categoría' }).click()
  await page.getByLabel('Categoría').click()
  await page.getByRole('option', { name: 'Comidas fuera', exact: true }).click()
  await page.getByLabel(/¿Cuánto como máximo\?/).fill('350000')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText('Tope guardado')).toBeVisible()
  await expect(page.getByText('Comidas fuera')).toBeVisible()
})

test('E4 y E6 — superar el tope informa sin impedir registrar', async ({ page }) => {
  await entrar(page)
  await configurarCiclo(page)

  // Un tope pequeño para poder superarlo en la prueba.
  await page.getByRole('button', { name: '+ Poner tope a otra categoría' }).click()
  await page.getByLabel('Categoría').click()
  await page.getByRole('option', { name: 'Comidas fuera', exact: true }).click()
  await page.getByLabel(/¿Cuánto como máximo\?/).fill('10000')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Tope guardado')).toBeVisible()

  // FR-009: superar un tope nunca impide registrar movimientos.
  await page.goto('/registro')
  await page.getByLabel(/¿De cuánto fue/).fill('50000')
  await page.getByLabel('¿En qué?').fill('almuerzo')
  await page.getByLabel(/Categoría/).click()
  await page.getByRole('option', { name: 'Comidas fuera', exact: true }).click()
  await page.getByRole('button', { name: 'Registrar y seguir' }).click()
  await expect(page.getByLabel(/¿De cuánto fue/)).toHaveValue('')

  await page.goto('/presupuestos')
  await expect(page.getByText(/por encima/)).toBeVisible()
  // FR-010: informa, no regaña.
  await expect(page.getByText(/excediste|demasiado|cuidado|mal/i)).toHaveCount(0)
})

test('E7 — el tope se puede quitar', async ({ page }) => {
  await entrar(page)
  await configurarCiclo(page)

  await page.getByRole('button', { name: '+ Poner tope a otra categoría' }).click()
  await page.getByLabel('Categoría').click()
  await page.getByRole('option', { name: 'Compras', exact: true }).click()
  await page.getByLabel(/¿Cuánto como máximo\?/).fill('200000')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Tope guardado')).toBeVisible()

  await page.getByRole('button', { name: /Quitar el tope de Compras/ }).click()
  await expect(page.getByText('Tope eliminado')).toBeVisible()
})
