/**
 * El tema de la interfaz (spec 004, revisión de 2026-08-23).
 *
 * Tres estados y no dos. «Automático» no es un adorno: es el que respeta lo que
 * la persona ya configuró en su teléfono o en su portátil, y es el que hace que
 * la aplicación se oscurezca sola por la noche si el sistema lo hace. Elegir
 * claro u oscuro a mano significa «ignora al sistema», que es una decisión
 * distinta de no haber elegido nada.
 */

export type Tema = 'automatico' | 'claro' | 'oscuro'

export const TEMAS: readonly { readonly valor: Tema; readonly etiqueta: string }[] = [
  { valor: 'automatico', etiqueta: 'El de mi sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
]

/** Dónde se guarda la preferencia. */
export const CLAVE_TEMA = 'serva-tema'

export function esTema(valor: unknown): valor is Tema {
  return valor === 'automatico' || valor === 'claro' || valor === 'oscuro'
}

/**
 * El script que corre antes de pintar.
 *
 * Va en línea dentro del `<head>` porque tiene que ejecutarse **antes** del
 * primer fotograma. Si el tema se aplicara al hidratar, quien tiene el modo
 * oscuro puesto vería un destello blanco en cada carga, y ese destello de
 * madrugada es exactamente lo que el modo oscuro viene a evitar.
 *
 * Es la única razón por la que este proyecto usa `dangerouslySetInnerHTML`.
 * No lleva ningún dato del usuario dentro: es una constante, no una plantilla.
 */
export const SCRIPT_DE_TEMA = `(function(){try{
var t=localStorage.getItem('${CLAVE_TEMA}');
var oscuro=t==='oscuro'||((!t||t==='automatico')&&matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList.toggle('dark',oscuro);
}catch(e){}})()`
