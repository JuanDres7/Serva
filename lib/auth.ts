import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import {
  enviarCorreo,
  correoDeRestablecimiento,
  correoDeVerificacion,
} from '@/lib/email'

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

    // No se exige el correo verificado para entrar: siendo una aplicación de
    // demostración, bloquear el acceso a quien viene a probarla la haría
    // inservible como portafolio (D-045). La verificación existe y se envía.
    requireEmailVerification: false,

    // FR-005: enlace temporal, de un solo uso y con caducidad.
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user: destinatario, url }) {
      await enviarCorreo({ para: destinatario.email, ...correoDeRestablecimiento(url) })
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    async sendVerificationEmail({ user: destinatario, url }) {
      await enviarCorreo({ para: destinatario.email, ...correoDeVerificacion(url) })
    },
  },

  // FR-010: limitar intentos por unidad de tiempo. Sin esto, probar contraseñas
  // a fuerza bruta contra una cuenta conocida no tiene ningún coste.
  rateLimit: {
    // Activo solo en producción: en desarrollo y en las pruebas todas las
    // peticiones salen de la misma dirección y el límite las bloquearía sin
    // que haya nada que proteger.
    enabled: process.env.NODE_ENV === 'production',
    window: 60,
    max: 20,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/request-password-reset': { window: 300, max: 3 },
      '/forget-password': { window: 300, max: 3 },
    },
  },

  user: {
    deleteUser: {
      // FR-013: el usuario puede llevarse y borrar todo lo suyo (Art. VI.6).
      enabled: true,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
})

export type Session = typeof auth.$Infer.Session
