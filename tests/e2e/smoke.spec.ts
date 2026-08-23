import { test, expect } from '@playwright/test'

/**
 * Prueba de humo de extremo a extremo (T-006).
 *
 * Comprueba que la aplicación arranca y responde. Se reemplaza por los escenarios
 * E1–E9 de la spec cuando exista funcionalidad (T-038).
 */
test('la aplicación arranca y responde', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBeLessThan(400)
  await expect(page.locator('body')).toBeVisible()
})
