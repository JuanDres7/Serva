import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Un reintento también en local. Las acciones del servidor compiten por un
  // único servidor de desarrollo y alguna prueba agota la espera por
  // contención, no por un defecto: un oráculo que falla al azar deja de servir
  // como señal. Un fallo real falla las dos veces.
  retries: 1,

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
    // Nunca se reutiliza el servidor que el desarrollador tenga levantado: su
    // configuración de IA no debe decidir el resultado de la verificación.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // La verificación corre siempre sin modelo, en cualquier máquina. Es la
      // regla del loop de la feature 002 y lo que hace reproducible el
      // resultado: con un modelo local lento, las pruebas medirían la CPU del
      // desarrollador en lugar del comportamiento de la aplicación.
      AI_PROVIDER: 'none',
    },
  },
})
