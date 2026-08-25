/**
 * El banco de frases (spec 010, T-441).
 *
 * **Esto no corre dentro de `npm run verify`, y es deliberado.** El Artículo IV
 * exige que la verificación funcione en cualquier máquina sin IA instalada, y lo
 * único que no se puede comprobar sin modelo es justamente esto: si de una frase
 * corriente salen los movimientos que la persona esperaba.
 *
 * Se ejecuta con `npm run evaluar`, contra el proveedor real, y su resultado se
 * registra como decisión, igual que se hizo con el asistente en D-057.
 *
 * La tentación de meterlo en `verify` con un modelo simulado hay que
 * resistirla: un simulador que devuelve la propuesta correcta no prueba la
 * extracción, prueba el simulador.
 */

export type CasoDeFrase = {
  /** Lo que diría una persona, tal cual. */
  readonly frase: string
  /** Qué debería quedar registrado. */
  readonly espera: readonly {
    readonly montoCents: number
    readonly categoria: string
    readonly tipo: 'expense' | 'income'
    /** Si debe quedar programado para el futuro en lugar de registrado. */
    readonly programado?: boolean
  }[]
  /** Cuántos movimientos deberían quedar incompletos a la espera del monto. */
  readonly faltantes?: number
  /** Si la frase no debe escribir nada en absoluto. */
  readonly noEscribe?: boolean
}

export const BANCO: readonly CasoDeFrase[] = [
  {
    frase:
      'hoy salí de fiesta y me tomé tres cervezas que me costaron 18 mil, y luego cogí el carro y me cobró 50 mil hasta mi casa',
    espera: [
      { montoCents: 1800000, categoria: 'entertainment', tipo: 'expense' },
      { montoCents: 5000000, categoria: 'transport', tipo: 'expense' },
    ],
  },
  {
    frase: 'me gasté 45 mil en el almuerzo',
    espera: [{ montoCents: 4500000, categoria: 'eating_out', tipo: 'expense' }],
  },
  {
    frase: 'pagué el arriendo, 1 millón 200 mil',
    espera: [{ montoCents: 120000000, categoria: 'housing', tipo: 'expense' }],
  },
  {
    frase: 'me entraron 3 millones del sueldo',
    espera: [{ montoCents: 300000000, categoria: 'salary', tipo: 'income' }],
  },
  {
    frase: 'ayer hice mercado por 180 mil',
    espera: [{ montoCents: 18000000, categoria: 'groceries', tipo: 'expense' }],
  },
  {
    frase: 'gasté 12 mil en el bus y 30 mil en el veterinario del perro',
    espera: [
      { montoCents: 1200000, categoria: 'transport', tipo: 'expense' },
      { montoCents: 3000000, categoria: 'pets', tipo: 'expense' },
    ],
  },
  {
    // FR-003: el caso que más importa. Sin monto no se inventa nada.
    frase: 'me tomé unas cervezas anoche',
    espera: [],
    faltantes: 1,
  },
  {
    // FR-015: preguntar no escribe.
    frase: '¿cuánto llevo gastado este mes?',
    espera: [],
    noEscribe: true,
  },
  {
    // E5: lo que cae en el futuro se programa.
    frase: 'tengo que pagar 200 mil el 7 de septiembre',
    espera: [{ montoCents: 20000000, categoria: 'debt', tipo: 'expense', programado: true }],
  },
  {
    // D-075: «mañana» estuvo dos features sin resolverse.
    frase: 'tengo que pagar 120 mil mañana',
    espera: [{ montoCents: 12000000, categoria: 'debt', tipo: 'expense', programado: true }],
  },
  {
    frase: 'pagué 75 mil de internet y 43 mil de Netflix',
    espera: [
      { montoCents: 7500000, categoria: 'utilities', tipo: 'expense' },
      { montoCents: 4300000, categoria: 'subscriptions', tipo: 'expense' },
    ],
  },
]

/**
 * Frases de deuda (spec 011, T-539).
 *
 * Van aparte porque se miden distinto: aquí no se comprueba qué movimiento
 * salió, sino que Serva llamara a la herramienta de deudas y no a la de
 * movimientos. Confundirlas es el error que importa: registrar un préstamo como
 * ingreso es exactamente lo que la feature existe para evitar.
 */
export type CasoDeDeuda = {
  readonly frase: string
  /** Qué herramienta debería elegir. */
  readonly espera: 'proponerDeuda' | 'proponerAbono' | 'proponerSaldarDeuda' | 'misDeudas'
  readonly montoCents?: number
}

export const BANCO_DE_DEUDAS: readonly CasoDeDeuda[] = [
  { frase: 'me prestaron 200 mil, tengo que devolverlos el 7 de septiembre', espera: 'proponerDeuda', montoCents: 20000000 },
  { frase: 'le presté 80 mil a un amigo', espera: 'proponerDeuda', montoCents: 8000000 },
  // El caso real que destapó D-075: el vencimiento dicho como «mañana».
  { frase: 'mi hermana me prestó 50 mil y se los debo pagar mañana', espera: 'proponerDeuda', montoCents: 5000000 },
  { frase: 'le debo 500 mil a mi hermana', espera: 'proponerDeuda', montoCents: 50000000 },
  { frase: 'le aboné 50 mil a mi hermana', espera: 'proponerAbono', montoCents: 5000000 },
  { frase: 'ya le pagué todo a mi hermana', espera: 'proponerSaldarDeuda' },
  { frase: '¿cuánto debo?', espera: 'misDeudas' },
  { frase: '¿quién me debe plata?', espera: 'misDeudas' },
]

/**
 * El umbral que decide si la extracción es de fiar.
 *
 * Nueve de diez, como dice la métrica de la spec §7. Por debajo, la feature no
 * debería escribir sola: habría que volver a la confirmación siempre.
 */
export const UMBRAL_DE_ACIERTO = 0.9
