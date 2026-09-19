import { test, expect, type Page } from '@playwright/test'
import { BANCO_012, type Caso012 } from './banco-012'

/**
 * Evaluación de metas, presupuestos y recurrentes contra el modelo real
 * (spec 012, T-570).
 *
 * `npm run evaluar`. Nunca dentro de `npm run verify`: necesita proveedor
 * configurado y una base de datos con datos de ejemplo (Art. IV).
 *
 * Mide la elección de herramienta y la diferencia de comportamiento que la
 * feature existe para garantizar: proponer y esperar confirmación cuando hay
 * que escribir, escribir directamente cuando el cobro pendiente se confirma, y
 * **preguntar** cuando falta un dato o no se encuentra la entidad, en lugar de
 * inventar. Nada de eso se puede comprobar con el oráculo sin modelo.
 */

test('escenarios E1–E15 de metas, presupuestos y recurrentes', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000)

  const email = `eva012-${Date.now()}@serva.local`
  await page.goto('/entrar')
  await page.getByLabel('¿Cómo te llamas?').fill('Juan')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible()
  await page.getByLabel(/Cómo quieres que te llamemos/).fill('Juan')
  await page.getByRole('button', { name: 'Empezar' }).click()
  await expect(page.getByRole('heading', { name: /Juan/ })).toBeVisible()

  /*
   * Un full reload antes de pulsar: el primer toque del día contra `next dev`
   * compila la página y el clic llega antes de que React adjunte su handler.
   * En una suite aislada como esta no hay pruebas anteriores que la calienten.
   */
  await page.reload()
  await expect(page.getByRole('heading', { name: /Juan/ })).toBeVisible()

  // Los datos de ejemplo aportan el recurrente vencido («arriendo») que la
  // interfaz no puede crear, y el gasto por categorías que alimenta a E6/E7.
  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText(/movimientos de ejemplo cargados/)).toBeVisible()

  /*
   * El plan gratuito de Gemini admite quince peticiones por minuto, y cada
   * frase gasta dos o tres. Sin esta pausa la evaluación mide la cuota en
   * lugar de medir el modelo. Igual que en la evaluación de deudas.
   */
  const PAUSA_POR_CUOTA = 12_000

  const resultados: { frase: string; bien: boolean; nota: string }[] = []

  async function medir(caso: Caso012) {
    await page.waitForTimeout(PAUSA_POR_CUOTA)
    await page.goto('/asistente')
    const nueva = page.getByRole('button', { name: 'Nueva conversación' })
    if ((await nueva.count()) > 0) {
      await nueva.click()
      await page.waitForTimeout(700)
    }

    await page.getByLabel('Tu pregunta').fill(caso.frase)
    await page.getByRole('button', { name: 'Enviar' }).click()

    try {
      await expect(page.getByText('Consultando tus datos…')).toHaveCount(0, {
        timeout: 90_000,
      })
    } catch {
      resultados.push({ frase: caso.frase, bien: false, nota: 'no respondió' })
      return
    }
    await page.waitForTimeout(1500)

    const texto = ((await page.getByRole('main').innerText()) ?? '').toLowerCase()
    const unidades = (await page.getByRole('main').innerText()).replace(/\./g, '')

    /*
     * El monto se acepta tanto en cifras como en palabras. Gemini tiende a
     * escribir «300 mil» o «2 millones» en vez del número, y lo que se mide es
     * que el dato llegue a la tarjeta, no el formato tipográfico.
     */
    function montoVisible(c: number): boolean {
      const u = c / 100
      const variantes = [String(u)]
      if (u % 1000 === 0) variantes.push(`${u / 1000} mil`)
      if (u % 1_000_000 === 0) {
        variantes.push(`${u / 1_000_000} millón`)
        variantes.push(`${u / 1_000_000} millones`)
      }
      return variantes.some((v) => unidades.includes(v))
    }
    const hayTarjeta = (await page.getByRole('button', { name: 'Confirmar' }).count()) > 0

    const senal = caso.espera === 'tarjeta' ? hayTarjeta : !hayTarjeta
    const patron = !caso.debeMostrar || caso.debeMostrar.test(texto)
    const patronDoble =
      !caso.debeMostrarAdemas || caso.debeMostrarAdemas.test(texto)
    const monto = caso.debeMostrarUnidades == null || montoVisible(caso.debeMostrarUnidades)

    const bien = senal && patron && patronDoble && monto
    const fallo =
      !senal
        ? hayTarjeta
          ? 'propuso escribir donde no debía'
          : 'no propuso nada'
        : !patron || !patronDoble
          ? `no dijo lo esperado: «${texto.slice(0, 160).trim()}»`
          : !monto
            ? `el monto no aparece: «${texto.slice(0, 160).trim()}»`
            : null

    resultados.push({
      frase: caso.frase,
      bien,
      nota: fallo ?? (senal ? 'correcto' : ''),
    })

    // Deja el mundo listo para el siguiente escenario. Si la confirmación
    // falla no se altera el resultado de este caso: se cuece en los siguientes.
    if (caso.confirmar && hayTarjeta) {
      await page.getByRole('button', { name: 'Confirmar' }).click().catch(() => {})
      try {
        await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0, {
          timeout: 20_000,
        })
      } catch {
        console.warn(`(setup) no se pudo confirmar: ${caso.frase}`)
      }
    }
  }

  // E9 va antes de configurar el ciclo: después ya no se puede medir.
  await medir(BANCO_012[0])

  await page.goto('/presupuestos')
  await expect(page.getByRole('heading', { name: /¿Cada cuánto te pagan\?/ })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByText(/Tus períodos se miden así/)).toBeVisible()

  for (const caso of BANCO_012.slice(1)) {
    await medir(caso)
  }

  const aciertos = resultados.filter((r) => r.bien).length
  console.log('\n─── Evaluación de metas, presupuestos y recurrentes ───')
  for (const r of resultados) {
    console.log(`${r.bien ? '✓' : '✗'} ${(r.nota || 'correcto').slice(0, 220)}`)
  }
  console.log(`\n${aciertos} de ${resultados.length}\n`)

  expect(resultados.length).toBe(BANCO_012.length)
})