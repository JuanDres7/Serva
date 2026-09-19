/**
 * Escenarios de metas, presupuestos y recurrentes (spec 012, T-570).
 *
 * Se miden igual que las deudas: contra el proveedor real, con `npm run
 * evaluar`, y nunca dentro de `npm run verify` (Art. IV). Lo que importa aquí
 * no es solo el monto: es **la elección de herramienta** y la diferencia entre
 * «propone y espera confirmación», «escribe directamente» y «pregunta en vez
 * de inventar».
 *
 * Desviaciones deliberadas respecto a los escenarios literales de la spec:
 *
 * - **E8** usa «comida» porque el presupuesto que deja E7 está en esa
 *   categoría. La spec dice «transporte», pero lo que E8 existe para medir es
 *   la confirmación de una destrucción, no el nombre de la categoría.
 * - **E12** confirma «arriendo», no «internet»: en los datos de ejemplo el
 *   único recurrente vencido (pendiente de confirmar) es «arriendo»; el de
 *   «internet» está programado para el día 12 y todavía no vence.
 * - **E13** pregunta por «la luz», que no existe como recurrente (solo como
 *   gasto), así que debe responder que no la encontró.
 *
 * El orden del banco es parte de la escenografía, no un capricho: cada
 * escenario deja el mundo listo para el siguiente (E1 deja la meta creada,
 * E2 deja aportes hechos, E10 se consulta antes de que E12 la confirme).
 */

export type Caso012 = {
  /** Lo que diría una persona, tal cual. */
  readonly frase: string
  /**
   * `tarjeta`: Serva debe proponer y pedir confirmación (botón Confirmar).
   * `sin-tarjeta`: no debe estar escribiendo —es consulta o pregunta—.
   */
  readonly espera: 'tarjeta' | 'sin-tarjeta'
  /** Tras medir, confirma la propuesta para dejar el mundo listo. */
  readonly confirmar?: boolean
  /** Debe aparecer en la respuesta del asistente (minúsculas). */
  readonly debeMostrar?: RegExp
  /** Un segundo patrón obligatorio, para escenarios que exigen dos señales. */
  readonly debeMostrarAdemas?: RegExp
  /** En centavos: su forma en unidades debe aparecer en el texto. */
  readonly debeMostrarUnidades?: number
}

export const BANCO_012: readonly Caso012[] = [
  // E9 — sin ciclo de pago, ninguna operación de presupuesto se ejecuta. Va
  // primero a propósito: después se configura el ciclo y ya no se puede medir.
  {
    frase: '¿cómo voy con los presupuestos?',
    espera: 'sin-tarjeta',
    debeMostrar: /ciclo/,
  },
  // E7 — crear presupuesto desde el chat, con ciclo ya configurado.
  {
    frase: 'ponele tope de 300 mil a comida',
    espera: 'tarjeta',
    confirmar: true,
    debeMostrarUnidades: 30000000,
  },
  // E8 — eliminar presupuesto: destruir siempre pide confirmación explícita.
  {
    frase: 'quita el presupuesto de comida',
    espera: 'tarjeta',
  },
  // E6 — consultar presupuestos: tabla, no escritura.
  {
    frase: '¿cómo voy con los presupuestos?',
    espera: 'sin-tarjeta',
    debeMostrarUnidades: 30000000,
  },
  // E1 — crear meta desde el chat, con nombre y objetivo.
  {
    frase: 'quiero ahorrar para un viaje a Japón, serían 2 millones',
    espera: 'tarjeta',
    confirmar: true,
    debeMostrar: /viaje a japón/,
    debeMostrarUnidades: 200000000,
  },
  // E2 — aportar a la meta: encuentra la meta y propone el aporte. El verbo
  // exacto varía («aportar», «depositar», «sumar», «agregué»…); la señal es la
  // propuesta.
  {
    frase: 'ahorra 200 mil para el viaje',
    espera: 'tarjeta',
    confirmar: true,
    debeMostrar: /aport|deposit|sumo|agreg|añad|puse/,
  },
  // E3 — retirar de la meta: propone el retiro y recuerda registrar el gasto.
  {
    frase: 'retira 50 mil del viaje',
    espera: 'tarjeta',
    debeMostrar: /retir/,
  },
  // E4 — consultar el progreso de la meta.
  {
    frase: '¿cómo voy con el viaje?',
    espera: 'sin-tarjeta',
    debeMostrar: /japón/,
  },
  // E5 — meta no encontrada: no escribe, lista las activas.
  {
    frase: 'aporta 100 mil al carro',
    espera: 'sin-tarjeta',
  },
  // E10 — consultar cobros recurrentes: se consulta antes de confirmar el
  // pendiente (E12), porque después «arriendo» ya no está pendiente.
  {
    frase: '¿qué cobros tengo pendientes?',
    espera: 'sin-tarjeta',
    debeMostrar: /arriendo/,
  },
  // E12 — confirmar el cobro pendiente: queda registrado como movimiento.
  {
    frase: 'confirma el arriendo',
    espera: 'sin-tarjeta',
    debeMostrar: /arriendo/,
    debeMostrarAdemas: /registrad|confirmad/,
  },
  // E13 — pendiente no encontrado: no escribe y avisa.
  {
    frase: 'confirma la luz',
    espera: 'sin-tarjeta',
  },
  // E11 — crear un cobro recurrente desde el chat, con día fijo.
  {
    frase: 'register el arriendo de 800 mil cada mes el 1',
    espera: 'tarjeta',
    debeMostrarUnidades: 80000000,
  },
  // E14 — recurrente sin categoría: pregunta antes de crear nada.
  {
    frase: 'register la suscripción de 40 mil cada mes',
    espera: 'sin-tarjeta',
    debeMostrar: /categor/,
  },
  // E15 — aporte sin monto: pregunta, nunca inventa. La pregunta puede ser
  // «¿cuánto?» o «¿quieres aportar?»; lo que no puede hacer es escribir sin
  // monto.
  {
    frase: 'ahorra para el viaje',
    espera: 'sin-tarjeta',
    debeMostrar: /cu[aá]nto|quieres aportar/,
  },
]