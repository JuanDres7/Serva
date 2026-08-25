import { test, expect, type Page } from '@playwright/test'

/**
 * Escenarios de la spec 000 que dependen de la interfaz.
 *
 * El envío de correo no tiene proveedor configurado en desarrollo, así que lo
 * que se verifica del restablecimiento es el flujo hasta donde llega sin él:
 * que la pantalla existe, que responde igual exista o no la cuenta, y que un
 * enlace inválido no permite cambiar nada.
 */

async function crearCuenta(page: Page, nombre = 'Juan') {
  const email = `cuenta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@serva.local`

  await page.goto('/entrar')
  await page.getByLabel('¿Cómo te llamas?').fill(nombre)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-123')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // Configuración inicial (spec 004): nombre y país antes de entrar.
  await expect(page.getByRole('heading', { name: 'Antes de empezar' })).toBeVisible()
  await page.getByLabel(/Cómo quieres que te llamemos/).fill(nombre)
  await page.getByRole('button', { name: 'Empezar' }).click()

  // El saludo varía con la hora, así que se comprueba por el nombre.
  await expect(page.getByRole('heading', { name: new RegExp(nombre) })).toBeVisible()

  return email
}

test('E2 — los datos de ejemplo llenan la aplicación', async ({ page }) => {
  await crearCuenta(page)

  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText(/movimientos de ejemplo cargados/)).toBeVisible()

  // Lo que el visitante debe ver: cifras, comparación y desglose.
  await expect(page.getByText('¿En qué se te fue?')).toBeVisible()
  await expect(page.getByText(/frente al período anterior/)).toBeVisible()
})

test('E3 — los datos de ejemplo se pueden descartar', async ({ page }) => {
  await crearCuenta(page)
  await page.getByRole('button', { name: 'Ver con datos de ejemplo' }).click()
  await expect(page.getByText('¿En qué se te fue?')).toBeVisible()

  await page.getByRole('button', { name: 'Borrar ejemplos' }).click()
  await expect(page.getByText(/Datos de ejemplo eliminados/)).toBeVisible()

  // Vuelve a la pantalla de bienvenida, sin rastro de los inventados.
  await expect(page.getByText(/Aquí vas a ver a dónde se va tu dinero/)).toBeVisible()
})

test('FR-017 — el aviso de privacidad es accesible sin haber entrado', async ({
  page,
}) => {
  await page.goto('/privacidad')

  await expect(page.getByRole('heading', { name: /Qué hacemos con tus datos/ })).toBeVisible()
  // FR-018: la transferencia fuera del país debe declararse.
  await expect(page.getByText(/servidores ubicados fuera de Colombia/)).toBeVisible()
  // D-050: hay que ser explícito sobre lo que se envía al proveedor de IA.
  await expect(page.getByText(/proveedor externo de inteligencia artificial/)).toBeVisible()
})

test('FR-005 — la pantalla de restablecimiento no revela si el correo existe', async ({
  page,
}) => {
  await page.goto('/restablecer')
  await page.getByLabel('Correo').fill('nadie-tiene-este-correo@serva.local')
  await page.getByRole('button', { name: 'Enviar enlace' }).click()

  // La misma respuesta para un correo inexistente que para uno real: cualquier
  // diferencia permitiría averiguar qué cuentas hay.
  await expect(page.getByText(/Si ese correo tiene una cuenta/)).toBeVisible()
})

test('FR-005 — un enlace de restablecimiento inválido no permite cambiar nada', async ({
  page,
}) => {
  await page.goto('/nueva-contrasena')
  await expect(page.getByText(/Este enlace ya no sirve/)).toBeVisible()
  await expect(page.getByLabel('Contraseña nueva')).toHaveCount(0)
})

test('FR-013 — eliminar la cuenta exige confirmación escrita', async ({ page }) => {
  await crearCuenta(page)
  await page.goto('/ajustes')

  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  const boton = page.getByRole('button', { name: 'Eliminar definitivamente' })

  // Un diálogo de «¿estás seguro?» se acepta por reflejo; escribir una palabra, no.
  await expect(boton).toBeDisabled()
  await page.getByLabel(/Escribe/).fill('ELIMINAR')
  await expect(boton).toBeEnabled()
})

test('FR-013 — al eliminar la cuenta se pierde el acceso', async ({ page }) => {
  await crearCuenta(page)
  await page.goto('/ajustes')

  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click()
  await page.getByLabel(/Escribe/).fill('ELIMINAR')
  await page.getByRole('button', { name: 'Eliminar definitivamente' }).click()

  await expect(page).toHaveURL(/\/entrar/)

  // Y las páginas con datos dejan de ser accesibles.
  await page.goto('/historial')
  await expect(page).toHaveURL(/\/entrar/)
})

test('el nombre se puede cambiar y el saludo lo refleja', async ({ page }) => {
  await crearCuenta(page, 'Juan')
  await page.goto('/ajustes')

  await page.getByLabel('Tu nombre').fill('Juana')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Nombre actualizado')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Juana/ })).toBeVisible()
})

/*
 * El menú de cuenta (D-077).
 *
 * Lo que se protege no es el aspecto sino el camino: cerrar sesión dejó de
 * estar a la vista y ahora vive dentro de un menú. Si el menú se rompe, no hay
 * forma de salir de la aplicación, y eso no puede depender de que alguien lo
 * pruebe a mano.
 */
test('el nombre abre el menú de cuenta, y desde ahí se sale', async ({ page }) => {
  await crearCuenta(page, 'Ana')

  // El nombre es un botón de verdad, no un div con un clic encima: eso es lo
  // que hace que el teclado llegue hasta él.
  const disparador = page.getByRole('button', { name: /Ana/ })
  await expect(disparador).toBeVisible()

  // Cerrado, lo de dentro no existe todavía.
  await expect(page.getByRole('menuitem', { name: 'Ajustes' })).toHaveCount(0)

  await disparador.click()

  await expect(page.getByRole('menuitem', { name: 'Ajustes' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible()

  await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

  await expect(page).toHaveURL(/\/entrar/)
})

test('desde el menú se llega a Ajustes', async ({ page }) => {
  await crearCuenta(page, 'Ana')

  await page.getByRole('button', { name: /Ana/ }).click()
  await page.getByRole('menuitem', { name: 'Ajustes' }).click()

  await expect(page).toHaveURL(/\/ajustes/)
})

test('Escape cierra el menú sin hacer nada', async ({ page }) => {
  await crearCuenta(page, 'Ana')

  await page.getByRole('button', { name: /Ana/ }).click()
  await expect(page.getByRole('menuitem', { name: 'Ajustes' })).toBeVisible()

  await page.keyboard.press('Escape')

  await expect(page.getByRole('menuitem', { name: 'Ajustes' })).toHaveCount(0)
  // Sigue dentro: cerrar el menú no es cerrar la sesión.
  await expect(page.getByRole('button', { name: /Ana/ })).toBeVisible()
})
