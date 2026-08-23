import { test, expect } from '@playwright/test'

/**
 * T-008 — Autenticación mínima.
 *
 * Verifica el mecanismo, no la interfaz: la pantalla de acceso llega en T-023.
 * Lo que aquí se comprueba es que una cuenta se crea, que la sesión persiste y
 * —lo más importante— que sin sesión no hay acceso a datos (Art. VI.1).
 */

const unique = () => `prueba-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

test('crea una cuenta e inicia sesión', async ({ request }) => {
  const email = `${unique()}@finzen.local`

  const registro = await request.post('/api/auth/sign-up/email', {
    data: { email, password: 'contrasena-larga-123', name: 'Juan Andrés' },
  })
  expect(registro.ok()).toBe(true)

  const sesion = await request.get('/api/auth/get-session')
  expect(sesion.ok()).toBe(true)
  const cuerpo = await sesion.json()
  expect(cuerpo?.user?.email).toBe(email)
})

test('la sesión persiste entre peticiones', async ({ request }) => {
  const email = `${unique()}@finzen.local`
  await request.post('/api/auth/sign-up/email', {
    data: { email, password: 'contrasena-larga-123', name: 'Persistente' },
  })

  for (let i = 0; i < 3; i += 1) {
    const sesion = await request.get('/api/auth/get-session')
    const cuerpo = await sesion.json()
    expect(cuerpo?.user?.email).toBe(email)
  }
})

test('rechaza contraseñas demasiado cortas', async ({ request }) => {
  const respuesta = await request.post('/api/auth/sign-up/email', {
    data: { email: `${unique()}@finzen.local`, password: 'corta', name: 'Corta' },
  })
  expect(respuesta.ok()).toBe(false)
})

test('no revela si un correo ya está registrado', async ({ request }) => {
  // FR-009 de la spec 000: el mensaje de error no debe permitir averiguar qué
  // correos tienen cuenta.
  const email = `${unique()}@finzen.local`
  await request.post('/api/auth/sign-up/email', {
    data: { email, password: 'contrasena-larga-123', name: 'Existente' },
  })

  const conocido = await request.post('/api/auth/sign-in/email', {
    data: { email, password: 'contrasena-equivocada' },
  })
  const desconocido = await request.post('/api/auth/sign-in/email', {
    data: { email: `${unique()}@finzen.local`, password: 'contrasena-equivocada' },
  })

  expect(conocido.status()).toBe(desconocido.status())
  expect(await conocido.text()).toBe(await desconocido.text())
})

test('sin sesión no se obtienen datos de usuario', async ({ playwright }) => {
  // Contexto limpio, sin las cookies de las pruebas anteriores.
  const anonimo = await playwright.request.newContext({
    baseURL: 'http://localhost:3000',
  })
  const sesion = await anonimo.get('/api/auth/get-session')
  const cuerpo = await sesion.json()
  expect(cuerpo?.user).toBeFalsy()
  await anonimo.dispose()
})
