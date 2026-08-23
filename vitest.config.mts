import { defineConfig } from 'vitest/config'
import path from 'node:path'


export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/domain/**/*.test.ts', 'tests/db/**/*.test.ts'],
    // Las pruebas de dominio no tocan la base de datos y deben correr en
    // milisegundos: es lo que hace viable el ciclo de trabajo (Art. IV.3).
    globals: false,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
})
