/**
 * Estado vacío.
 *
 * Una pantalla sin datos es la primera que ve casi todo el mundo, así que dice
 * qué falta, por qué vale la pena y cómo empezar. Un recuadro con una frase
 * gris y nada que tocar deja a la persona donde estaba.
 */
export function Vacio({
  titulo,
  children,
  accion,
}: {
  readonly titulo: string
  readonly children: React.ReactNode
  readonly accion?: React.ReactNode
}) {
  return (
    <div className="entra-escala superficie border-dashed bg-transparent px-6 py-14 text-center">
      <p className="text-base font-medium">{titulo}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-balance">
        {children}
      </p>
      {accion && <div className="mt-6 flex justify-center">{accion}</div>}
    </div>
  )
}
