import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // Un único servidor de desarrollo atendiendo a muchos trabajadores es el
  // cuello de botella: las acciones del servidor empiezan a encolarse y las
  // esperas se agotan por contención, no por un defecto de la aplicación.
  workers: 2,
  reporter: process.env.CI ? 'github' : 'list',

  // Las sugerencias de categoría viajan por acciones del servidor y, con varios
  // trabajadores en paralelo, pueden pasar del plazo por defecto de 5 s. Se
  // amplía el margen en lugar de relajar ninguna comprobación.
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Levanta la aplicación automáticamente si no está corriendo, para que
  // `npm run verify` funcione con un solo comando.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
