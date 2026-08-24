import { test, expect } from '@playwright/test'
import { BANCO, UMBRAL_DE_ACIERTO } from './banco-de-frases'

/**
 * Evaluación de la extracción contra el modelo real (spec 010, T-441).
 *
 * `npm run evaluar`. **Nunca dentro de `npm run verify`**: necesita un
 * proveedor configurado, y el Artículo IV exige que la verificación corra en
 * cualquier máquina sin IA.
 *
 * No falla el commit de nadie. Su trabajo es dar un número —cuántas frases de
 * diez salieron bien— para poder decidir con datos si Serva puede escribir sola
 * o hay que volver a confirmarlo todo.
 */

test('el banco de frases contra el proveedor real', async ({ page }) => {
  test.setTimeout(20 * 60 * 1000)

  const email = `eval-${Date.now()}@serva.local`
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

  const resultados: { frase: string; bien: boolean; nota: string }[] = []

  for (const caso of BANCO) {
    // Cada frase en su propia conversación: el contexto de la anterior
    // cambiaría lo que el modelo entiende, y aquí se mide la frase suelta.
    await page.goto('/asistente')
    const nueva = page.getByRole('button', { name: 'Nueva conversación' })
    if ((await nueva.count()) > 0) {
      await nueva.click()
      await page.waitForTimeout(800)
    }

    await page.getByLabel('Tu pregunta').fill(caso.frase)
    await page.getByRole('button', { name: 'Enviar' }).click()

    try {
      await expect(page.getByText('Consultando tus datos…')).toHaveCount(0, {
        timeout: 90_000,
      })
    } catch {
      resultados.push({ frase: caso.frase, bien: false, nota: 'el modelo no respondió' })
      continue
    }
    await page.waitForTimeout(1500)

    const confirmar = page.getByRole('button', { name: 'Confirmar' })
    const hayTarjeta = (await confirmar.count()) > 0

    if (caso.noEscribe) {
      resultados.push({
        frase: caso.frase,
        bien: !hayTarjeta,
        nota: hayTarjeta ? 'propuso escribir ante una pregunta' : 'no escribió, correcto',
      })
      continue
    }

    if (caso.espera.length === 0) {
      const texto = await page.getByRole('main').innerText()
      const pregunta = /cuánto|cuanto/i.test(texto)
      resultados.push({
        frase: caso.frase,
        bien: !hayTarjeta && pregunta,
        nota: pregunta ? 'preguntó el monto, correcto' : 'no preguntó el monto',
      })
      continue
    }

    if (!hayTarjeta) {
      resultados.push({ frase: caso.frase, bien: false, nota: 'no propuso nada' })
      continue
    }

    const tarjeta = await page.getByRole('main').innerText()
    const faltan = caso.espera.filter((esperado) => {
      const unidades = Math.round(esperado.montoCents / 100)
      return !tarjeta.replace(/\./g, '').includes(String(unidades))
    })

    resultados.push({
      frase: caso.frase,
      bien: faltan.length === 0,
      nota: faltan.length === 0 ? 'montos correctos' : `faltaron ${faltan.length} montos`,
    })
  }

  const aciertos = resultados.filter((r) => r.bien).length
  const proporcion = aciertos / resultados.length

  console.log('\n─── Evaluación de la extracción ───')
  for (const r of resultados) {
    console.log(`${r.bien ? '✓' : '✗'} ${r.nota.padEnd(38)} ${r.frase.slice(0, 60)}`)
  }
  console.log(
    `\n${aciertos} de ${resultados.length} (${Math.round(proporcion * 100)}%), umbral ${Math.round(UMBRAL_DE_ACIERTO * 100)}%\n`,
  )

  // Informa, no bloquea: es una medida del modelo, no de la aplicación.
  expect(resultados.length).toBe(BANCO.length)
})
