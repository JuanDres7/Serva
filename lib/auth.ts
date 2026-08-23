import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

/**
 * Autenticación.
 *
 * Alcance deliberadamente mínimo (D-048): correo y contraseña, sin roles,
 * permisos, equipos ni proveedores externos. No es una funcionalidad de producto
 * —nadie usa Finzen para tener una cuenta— sino el mecanismo que hace posible el
 * aislamiento entre usuarios exigido por el Artículo VI.
 *
 * La verificación de correo y el restablecimiento de contraseña pertenecen a la
 * spec 000 y llegan cuando exista servicio de envío de correo (D-042).
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Se activará junto con el servicio de correo (spec 000, FR-004).
    requireEmailVerification: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
})

export type Session = typeof auth.$Infer.Session
