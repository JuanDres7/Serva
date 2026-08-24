import { defineConfig, devices } from '@playwright/test'

/**
 * Evaluación contra el modelo real (spec 010, T-441).
 *
 * Configuración aparte de la principal por una razón concreta: aquella se
 * niega a reutilizar el servidor del desarrollador y fuerza `AI_PROVIDER=none`,
 * justamente para que el oráculo no dependa de qué tenga cada máquina. Esta
 * hace lo contrario a propósito, y por eso no forma parte de `npm run verify`.
 */
export default defineConfig({
  testDir: './tests/evaluacion',
  workers: 1,
  retries: 0,
  reporter: 'list',
  expect: { timeout: 25_000 },
  use: { baseURL: 'http://localhost:3000', trace: 'off' },
  projects: [{ name: 'escritorio', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
