import Link from 'next/link'

export const metadata = {
  title: 'Privacidad · Serva',
}

/**
 * Aviso de privacidad (spec 000, FR-017 y FR-018 · D-050).
 *
 * Accesible sin sesión, porque debe poder leerse antes de crear la cuenta.
 */
export default function PrivacidadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <article className="entra space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Qué hacemos con tus datos
          </h1>
          <p className="text-muted-foreground">
            Escrito para que se entienda, no para cubrirnos las espaldas.
          </p>
        </header>

        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-medium">Serva es una aplicación de demostración.</p>
          <p className="mt-1">
            No la uses para llevar tus finanzas reales ni introduzcas información
            financiera verdadera. Es un proyecto para mostrar cómo está construido,
            no un servicio con garantías de continuidad.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Qué se guarda</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Tu correo y una versión cifrada e irreversible de tu contraseña.</li>
            <li>El nombre con el que quieres que te salude la aplicación.</li>
            <li>
              Los movimientos que registres: monto, fecha, categoría y lo que
              escribas como descripción.
            </li>
            <li>
              Qué categoría propuso el sistema y con cuál te quedaste, para que
              acierte más la próxima vez.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            No se pide ni se guarda nada más: ni documento de identidad, ni
            teléfono, ni datos bancarios. Serva no se conecta a ningún banco.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Lo que se envía a la inteligencia artificial</h2>
          <p className="text-sm text-muted-foreground">
            Para proponerte una categoría, la descripción que escribes puede
            enviarse a un proveedor externo de inteligencia artificial. Se envía
            únicamente ese texto y la lista de categorías disponibles: nunca tu
            correo, ni tu nombre, ni los montos, ni tu historial.
          </p>
          <p className="text-sm text-muted-foreground">
            Ten esto en cuenta al escribir. Una descripción como «consulta con el
            psiquiatra» contiene información sensible, y saldría de aquí igual que
            cualquier otra.
          </p>
          <p className="text-sm text-muted-foreground">
            Según cómo esté configurada la aplicación, ese proveedor puede usar lo
            que recibe para entrenar sus modelos. Es otra razón para no registrar
            información real.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Dónde están</h2>
          <p className="text-sm text-muted-foreground">
            Los datos se almacenan en servidores ubicados fuera de Colombia, y
            viajan cifrados entre tu navegador y la aplicación.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Quién puede verlos</h2>
          <p className="text-sm text-muted-foreground">
            Solo tú. Cada cuenta ve exclusivamente sus propios movimientos, y hay
            comprobaciones automáticas que fallan si alguna consulta pudiera
            devolver datos de otra persona.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Cómo te los llevas o los borras</h2>
          <p className="text-sm text-muted-foreground">
            Desde <span className="font-medium">Ajustes</span> puedes exportar todos
            tus movimientos a una hoja de cálculo y eliminar tu cuenta con todo lo
            que contiene. El borrado es inmediato y no se puede deshacer.
          </p>
        </section>

        <footer className="border-t pt-6 text-sm">
          <Link href="/entrar" className="text-primary hover:underline">
            Volver
          </Link>
        </footer>
      </article>
    </div>
  )
}
