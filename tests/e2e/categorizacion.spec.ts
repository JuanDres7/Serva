import { test, expect, type Page } from '@playwright/test'

/**
 * Escenarios de la spec 002, **sin ningún modelo instalado**.
 *
 * Es deliberado: en integración continua no hay Ollama ni claves de API. Lo que
 * se verifica aquí es el nivel 1 de la cascada —lo que el usuario ya categorizó—
 * y, sobre todo, que la ausencia de modelo no rompe nada.
 */

async function entrarComoNuevoUsuario(page: Page, nombre = 'Juan') {
  const email = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@finzen.local`

  await page.goto('/entrar')
  await page.getByLabel('¿Cómo te llamas?').fill(nombre)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: `Hola, ${nombre}` })).toBeVisible()
}

async function registrar(
  page: Page,
  { monto, descripcion, categoria }: { monto: string; descripcion: string; categoria?: string },
) {
  await page.getByLabel(/¿De cuánto fue/).fill(monto)
  await page.getByLabel('¿En qué?').fill(descripcion)
  // Salir del campo dispara la sugerencia.
  await page.getByLabel(/¿De cuánto fue/).click()

  if (categoria) {
    await page.getByLabel(/Categoría/).click()
    await page.getByRole('option', { name: categoria, exact: true }).click()
    await expect(page.getByLabel(/Categoría/)).toContainText(categoria)
  }

  await page.getByRole('button', { name: 'Registrar y seguir' }).click()
  await expect(page.getByLabel(/¿De cuánto fue/)).toHaveValue('')
}

test('E6 — sin historial ni modelo, no se preselecciona ninguna categoría', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await page.getByLabel('¿En qué?').fill('algo que nunca he escrito')
  await page.getByLabel(/¿De cuánto fue/).click()

  // Ni sugerencia ni marca: el usuario elige.
  await expect(page.getByText('sugerida')).toHaveCount(0)
  await expect(page.getByLabel(/Categoría/)).toContainText('Elige una categoría')
})

test('E1 y E7 — aprende de lo que el usuario categorizó y lo sugiere después', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  // Primera vez: el usuario elige.
  await registrar(page, {
    monto: '15000',
    descripcion: 'almuerzo',
    categoria: 'Comidas fuera',
  })

  // Segunda vez, la misma descripción: ya no hace falta elegir.
  await page.getByLabel('¿En qué?').fill('almuerzo')
  await page.getByLabel(/¿De cuánto fue/).click()

  await expect(page.getByLabel(/Categoría/)).toContainText('Comidas fuera')
  // FR-002: se distingue de una elección propia.
  await expect(page.getByText('sugerida')).toBeVisible()
})

test('E3 — reconoce la misma cosa dicha de otra forma', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await registrar(page, {
    monto: '40000',
    descripcion: 'fui a la tienda y compré un cartón de leche',
    categoria: 'Mercado',
  })

  // Frase distinta, contenido equivalente.
  await page.getByLabel('¿En qué?').fill('compré leche en la tienda')
  await page.getByLabel(/¿De cuánto fue/).click()

  await expect(page.getByLabel(/Categoría/)).toContainText('Mercado')
})

test('E2 — la corrección del usuario manda y se aprende de ella', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  // Se enseña una categoría…
  await registrar(page, { monto: '20000', descripcion: 'uber', categoria: 'Transporte' })

  // …y luego el usuario la corrige.
  await page.getByLabel('¿En qué?').fill('uber')
  await page.getByLabel(/¿De cuánto fue/).click()
  await expect(page.getByLabel(/Categoría/)).toContainText('Transporte')

  await registrar(page, { monto: '25000', descripcion: 'uber eats', categoria: 'Comidas fuera' })

  // La corrección más específica no borra lo anterior, pero sí compite.
  await page.getByLabel('¿En qué?').fill('uber eats')
  await page.getByLabel(/¿De cuánto fue/).click()
  await expect(page.getByLabel(/Categoría/)).toContainText('Comidas fuera')
})

test('Art. II.3 — una sugerencia nunca pisa la elección del usuario', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await registrar(page, { monto: '10000', descripcion: 'café', categoria: 'Comidas fuera' })

  // El usuario elige primero y escribe después.
  await page.getByLabel(/Categoría/).click()
  await page.getByRole('option', { name: 'Mercado', exact: true }).click()
  await page.getByLabel('¿En qué?').fill('café')
  await page.getByLabel(/¿De cuánto fue/).click()

  // La sugerencia diría «Comidas fuera», pero la decisión de la persona manda.
  await expect(page.getByLabel(/Categoría/)).toContainText('Mercado')
  await expect(page.getByText('sugerida')).toHaveCount(0)
})

test('FR-011 — sin modelo, registrar sigue funcionando igual', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await registrar(page, {
    monto: '99000',
    descripcion: 'algo completamente nuevo',
    categoria: 'Compras',
  })

  await page.goto('/')
  await expect(page.getByRole('main').getByText('$ 99.000').first()).toBeVisible()
})

test('D-012 — el historial muestra la versión corta de una frase larga', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await registrar(page, {
    monto: '35000',
    descripcion: 'fui a la tienda de la esquina y compré un cartón de leche deslactosada',
    categoria: 'Mercado',
  })

  await page.goto('/historial')
  // Se recorta para que la lista siga siendo legible de un vistazo.
  await expect(page.getByText(/…$/)).toBeVisible()
})
