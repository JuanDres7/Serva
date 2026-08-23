import { config } from 'dotenv'

// Las pruebas que tocan la base necesitan las variables de entorno locales.
// Las pruebas de dominio no dependen de esto, pero cargarlo es inocuo.
config({ path: '.env.local' })
