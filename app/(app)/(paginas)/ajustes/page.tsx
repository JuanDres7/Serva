import Link from 'next/link'
import { requireUserIdOrRedirect } from '@/lib/session'
import { ensureUserSettings } from '@/lib/db/queries/settings'
import { tieneDatosDeEjemplo } from '@/lib/db/queries/sample-data'
import { countTransactions } from '@/lib/db/queries/transactions'
import { estadisticasAcierto } from '@/lib/db/queries/learning'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { CambiarNombre } from '@/components/cambiar-nombre'
import { EliminarCuenta } from '@/components/eliminar-cuenta'
import { BorrarEjemplo } from '@/components/datos-de-ejemplo'
import { ElegirTema } from '@/components/elegir-tema'

export default async function AjustesPage() {
  const userId = await requireUserIdOrRedirect()
  const [settings, conEjemplos, total, acierto] = await Promise.all([
    ensureUserSettings(userId),
    tieneDatosDeEjemplo(userId),
    countTransactions(userId),
    estadisticasAcierto(userId),
  ])

  return (
    <div className="escalonado mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Ajustes</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu nombre</CardTitle>
        </CardHeader>
        <CardContent>
          <CambiarNombre actual={settings.displayName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cómo se ve</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ElegirTema />
          <p className="text-sm text-muted-foreground">
            Se guarda en este dispositivo. El tema es del momento y del sitio
            donde estés, no de tu cuenta.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moneda y formato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Moneda: <span className="font-medium text-foreground">{settings.currency}</span>{' '}
            · País: <span className="font-medium text-foreground">{settings.country}</span>
          </p>
          <p>
            {total > 0
              ? 'La moneda no se puede cambiar porque ya tienes movimientos registrados: los montos guardados no se convierten solos y el historial quedaría falseado.'
              : 'Podrás elegir país y moneda al configurar tu cuenta.'}
          </p>
        </CardContent>
      </Card>

      {acierto.conSugerencia > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qué tanto acierta la categorización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>
              De {acierto.conSugerencia} sugerencias, aceptaste{' '}
              <span className="font-medium text-foreground">{acierto.aceptadas}</span> sin
              cambiarlas.
            </p>
            {acierto.tasaAcierto !== null && (
              <p className="cifra text-2xl text-foreground">
                {Math.round(acierto.tasaAcierto * 100)}%
              </p>
            )}
            <p>Mejora a medida que corriges: cada corrección le enseña.</p>
          </CardContent>
        </Card>
      )}

      {conEjemplos && <BorrarEjemplo />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tus datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Puedes leer qué guardamos y qué se envía a la inteligencia artificial en
            el{' '}
            <Link href="/privacidad" className="text-primary hover:underline">
              aviso de privacidad
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/api/exportar" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Exportar mis datos
            </a>
            <span className="text-xs text-muted-foreground">
              Todos tus movimientos en una hoja de cálculo.
            </span>
          </div>

          <EliminarCuenta movimientos={total} />
        </CardContent>
      </Card>
    </div>
  )
}
