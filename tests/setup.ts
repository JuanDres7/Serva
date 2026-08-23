import { config } from 'dotenv'

// Las pruebas que tocan la base necesitan las variables de entorno locales.
// Las pruebas de dominio no dependen de esto, pero cargarlo es inocuo.
config({ path: '.env.local' })

// Las pruebas se ejecutan siempre sin modelo, sea cual sea la configuración
// local: ninguna comprobación puede exigir un modelo instalado (plan 002, §8).
process.env.AI_PROVIDER = 'none'
