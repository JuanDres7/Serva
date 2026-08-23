import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'Falta DATABASE_URL. Copia .env.example como .env.local y levanta la base con: npm run db:up',
  )
}

/**
 * Cliente de Postgres.
 *
 * `max` limita las conexiones abiertas. Es la protección contra el fallo clásico
 * de combinar funciones sin estado con Postgres: cada invocación abre una conexión
 * y la base termina saturada (D-041.1). En producción sobre Neon se usa además su
 * agrupador de conexiones.
 */
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client)
export { client }
