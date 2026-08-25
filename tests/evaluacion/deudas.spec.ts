import { test, expect } from '@playwright/test'
import { BANCO_DE_DEUDAS } from './banco-de-frases'

/**
 * Evaluación de las deudas contra el modelo real (spec 011, T-539).
 *
 * `npm run evaluar`. Nunca dentro de `verify`: necesita proveedor configurado.
 *
 * Lo que mide no es la extracción del monto sino **la elección de herramienta**.
 * Que Serva no confunda un préstamo con un ingreso es lo que la feature existe
 * para garantizar, y es lo único de eso que no se puede comprobar sin modelo.
 */

test('el banco de frases de deudas', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000)

  const email = `evd-${Date.now()}@serva.local`
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

  // Una deuda de partida, para poder abonar y saldar sobre algo.
  await page.goto('/deudas')
  await page.getByRole('button', { name: '+ Nueva deuda' }).click()
  await page.getByLabel('¿A quién le debes?').fill('mi hermana')
  await page.getByLabel('¿De cuánto?').fill('500000')
  await page.getByRole('button', { name: 'Registrar deuda' }).click()
  await expect(page.getByText('Deuda registrada')).toBeVisible()

  const resultados: { frase: string; bien: boolean; nota: string }[] = []

  /*
   * El plan gratuito de Gemini admite quince peticiones por minuto, y cada
   * frase gasta dos o tres —proponer, escribir, responder—. Sin esta pausa la
   * evaluación mide la cuota en lugar de medir el modelo, y sus fallos dicen
   * «no respondió» en vez de decir algo útil.
   */
  const PAUSA_POR_CUOTA = 12_000

  for (const caso of BANCO_DE_DEUDAS) {
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
      await expect(page.getByText('Consultando tus datos…')).toHaveCount(0, { timeout: 90_000 })
    } catch {
      resultados.push({ frase: caso.frase, bien: false, nota: 'no respondió' })
      continue
    }
    await page.waitForTimeout(1500)

    const texto = await page.getByRole('main').innerText()
    const hayTarjeta = (await page.getByRole('button', { name: 'Confirmar' }).count()) > 0

    // Sin respuesta no hay nada que medir, y contarlo como acierto sería peor
    // que contarlo como fallo: daría por bueno un modelo que no contestó.
    const respondio = texto.includes('SERVA AI')
    if (!respondio) {
      resultados.push({ frase: caso.frase, bien: false, nota: 'no respondió (¿cuota?)' })
      continue
    }

    if (caso.espera === 'misDeudas') {
      // Consultar no escribe, pero sí tiene que decir algo.
      resultados.push({
        frase: caso.frase,
        bien: !hayTarjeta,
        nota: hayTarjeta ? 'propuso escribir ante una consulta' : 'solo consultó, correcto',
      })
      continue
    }

    if (caso.espera === 'proponerSaldarDeuda') {
      resultados.push({
        frase: caso.frase,
        bien: hayTarjeta,
        nota: hayTarjeta ? 'pidió confirmación, correcto' : 'no propuso nada',
      })
      continue
    }

    const unidades = caso.montoCents ? String(Math.round(caso.montoCents / 100)) : ''
    const montoBien = unidades === '' || texto.replace(/\./g, '').includes(unidades)

    resultados.push({
      frase: caso.frase,
      bien: montoBien,
      nota: montoBien ? 'monto correcto' : 'el monto no aparece',
    })
  }

  const aciertos = resultados.filter((r) => r.bien).length
  console.log('\n─── Evaluación de deudas ───')
  for (const r of resultados) {
    console.log(`${r.bien ? '✓' : '✗'} ${r.nota.padEnd(34)} ${r.frase.slice(0, 55)}`)
  }
  console.log(`\n${aciertos} de ${resultados.length}\n`)

  expect(resultados.length).toBe(BANCO_DE_DEUDAS.length)
})
