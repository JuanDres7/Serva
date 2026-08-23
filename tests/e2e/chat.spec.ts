import { test, expect } from '@playwright/test'

/**
 * El asistente en la interfaz (spec 003), **sin modelo configurado**.
 *
 * Es la configuración por defecto y la de integración continua, así que lo que
 * se verifica aquí es la degradación: que la ausencia de modelo no rompe nada y
 * que no se ofrece algo que no puede funcionar.
 */

test('sin proveedor de IA, el asistente no se ofrece', async ({ page }) => {
  const email = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@finzen.local`

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

  // Mejor que el botón no exista a que exista y no funcione.
  await expect(page.getByRole('button', { name: 'Abrir el asistente' })).toHaveCount(0)

  // Y el resto de la aplicación sigue intacta.
  await expect(page.getByRole('link', { name: 'Historial' })).toBeVisible()
})

test('el punto de entrada del chat responde que no está disponible', async ({
  request,
}) => {
  const respuesta = await request.post('/api/chat', {
    data: { messages: [] },
  })

  // Sin sesión, 401; con sesión y sin modelo, 503. En ninguno de los dos casos
  // se cae ni se queda colgado.
  expect([401, 503]).toContain(respuesta.status())
})

test('sin sesión no se puede hablar con el asistente', async ({ playwright }) => {
  const anonimo = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  })

  const respuesta = await anonimo.post('/api/chat', {
    data: { messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'hola' }] }] },
  })
  expect(respuesta.status()).toBe(401)

  await anonimo.dispose()
})
