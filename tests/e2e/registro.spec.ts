import { test, expect, type Page } from '@playwright/test'

/**
 * La zona que la aplicación asigna a una cuenta nueva (Colombia, por defecto).
 * Las fechas civiles se calculan ahí, no en UTC.
 */
const ZONA_DEL_USUARIO = 'America/Bogota'

/**
 * T-038 — Escenarios E1 a E9 de la spec 001.
 *
 * Cada prueba crea su propia cuenta: así no dependen entre sí ni del orden, y de
 * paso se ejercita el aislamiento en cada ejecución.
 */

async function entrarComoNuevoUsuario(page: Page, nombre = 'Juan') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@serva.local`

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

async function registrar(
  page: Page,
  { monto, descripcion, categoria, tipo = 'Gasto' }: {
    monto: string
    descripcion?: string
    categoria?: string
    tipo?: 'Gasto' | 'Ingreso'
  },
) {
  if (tipo === 'Ingreso') {
    await page.getByRole('button', { name: 'Ingreso', exact: true }).click()
  }
  await page.getByLabel(/¿De cuánto fue/).fill(monto)
  if (descripcion) await page.getByLabel('¿En qué?').fill(descripcion)
  if (categoria) {
    await page.getByLabel('Categoría').click()
    await page.getByRole('option', { name: categoria, exact: true }).click()
    // Esperar a que el desplegable se cierre: si sigue abierto, tapa el botón
    // de guardar y el clic siguiente se pierde.
    await expect(page.getByLabel('Categoría')).toContainText(categoria)
  }
  await page.getByRole('button', { name: 'Registrar y seguir' }).click()

  // El formulario se vacía al guardar. Esperarlo es la señal fiable de que el
  // movimiento quedó registrado, y es lo que permite encadenar varios.
  await expect(page.getByLabel(/¿De cuánto fue/)).toHaveValue('')
}

test('E9 — la primera pantalla explica qué hacer, en lugar de estar vacía', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)

  await expect(page.getByText(/Aquí vas a ver a dónde se va tu dinero/)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Registrar mi primer movimiento' }),
  ).toBeVisible()
})

test('E1 — registrar un gasto y verlo reflejado', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  // FR-010: el cursor ya está en el monto al abrir.
  await expect(page.getByLabel(/¿De cuánto fue/)).toBeFocused()

  await registrar(page, {
    monto: '15000',
    descripcion: 'almuerzo',
    categoria: 'Comidas fuera',
  })

  // FR-012: confirmación visible con opción de deshacer.
  await expect(page.getByText('Gasto registrado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByText('$ 15.000').first()).toBeVisible()
})

test('FR-009 — el monto se agrupa en miles mientras se escribe', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  const monto = page.getByLabel(/¿De cuánto fue/)
  await monto.pressSequentially('1200000')
  await expect(monto).toHaveValue('1.200.000')
})

test('E2 — encadenar varios registros muestra el avance de la sesión', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await registrar(page, { monto: '10000', descripcion: 'café', categoria: 'Comidas fuera' })
  await registrar(page, { monto: '20000', descripcion: 'taxi', categoria: 'Transporte' })
  await registrar(page, { monto: '30000', descripcion: 'pan', categoria: 'Mercado' })

  await expect(page.getByText(/Llevas 3 registros/)).toBeVisible()
  // El formateador separa el símbolo con un espacio duro, que las
  // expresiones regulares no normalizan como sí hace el texto literal.
  await expect(page.getByText(/60\.000/)).toBeVisible()
})

test('E3 — al cambiar a ingreso cambian las categorías y el signo', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await page.getByRole('button', { name: 'Ingreso', exact: true }).click()
  await expect(page.getByLabel(/¿De cuánto fue el ingreso/)).toBeVisible()

  // FR-004: las categorías de gasto ya no están disponibles.
  await page.getByLabel('Categoría').click()
  await expect(page.getByRole('option', { name: 'Salario' })).toBeVisible()
  await expect(page.getByRole('option', { name: 'Mercado' })).toHaveCount(0)
  await page.getByRole('option', { name: 'Salario' }).click()

  await page.getByLabel(/¿De cuánto fue/).fill('3000000')
  await page.getByRole('button', { name: 'Registrar y seguir' }).click()
  await expect(page.getByText('Ingreso registrado')).toBeVisible()

  await page.goto('/')
  await expect(page.getByText('$ 3.000.000').first()).toBeVisible()
})

test('E6 — los totales del período cuadran con lo registrado', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await registrar(page, { monto: '50000', descripcion: 'mercado', categoria: 'Mercado' })
  await registrar(page, {
    monto: '200000',
    descripcion: 'sueldo',
    categoria: 'Salario',
    tipo: 'Ingreso',
  })

  await page.goto('/')
  const principal = page.getByRole('main')
  await expect(principal.getByText('$ 200.000').first()).toBeVisible()
  await expect(principal.getByText('$ 50.000').first()).toBeVisible()
  await expect(principal.getByText('$ 150.000').first()).toBeVisible()
})

test('E4 — corregir el monto actualiza los totales', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')
  await registrar(page, { monto: '10000', descripcion: 'error', categoria: 'Mercado' })

  await page.goto('/historial')
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Monto', { exact: true }).fill('25000')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText('Movimiento actualizado')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('main').getByText('$ 25.000').first()).toBeVisible()
})

test('E5 — anular quita el movimiento de los totales sin borrarlo', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')
  await registrar(page, { monto: '40000', descripcion: 'nunca pasó', categoria: 'Compras' })

  await page.goto('/historial')
  await page.getByRole('button', { name: 'Anular' }).click()
  await expect(page.getByText('Movimiento anulado')).toBeVisible()

  // Desaparece del historial activo…
  await page.goto('/historial')
  await expect(page.getByText('nunca pasó')).toHaveCount(0)

  // …pero sigue existiendo y puede restaurarse (Art. VII).
  await page.getByText('Mostrar anulados').click()
  await expect(page.getByText('nunca pasó')).toBeVisible()
  await page.getByRole('button', { name: 'Restaurar' }).click()
  await expect(page.getByText('Movimiento restaurado')).toBeVisible()
})

test('E7 — cambiar de período recalcula todo', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')
  await registrar(page, { monto: '75000', descripcion: 'de este mes', categoria: 'Mercado' })

  await page.goto('/historial')
  await expect(page.getByText('de este mes')).toBeVisible()

  await page.getByRole('link', { name: '← Anterior' }).click()
  await expect(page.getByText('de este mes')).toHaveCount(0)
  await expect(page.getByText(/No hay movimientos/)).toBeVisible()
})

test('FR-006 — sin descripción y sin categoría, el registro no procede', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  await page.getByLabel(/¿De cuánto fue/).fill('5000')
  await page.getByRole('button', { name: 'Registrar y seguir' }).click()

  await expect(page.getByText(/Escribe en qué fue/)).toBeVisible()
  // FR-011: lo que el usuario ya escribió no se pierde.
  await expect(page.getByLabel(/¿De cuánto fue/)).toHaveValue('5.000')
})

test('FR-008 — no se aceptan fechas futuras', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')

  // El «hoy» del oráculo tiene que calcularse en la misma zona que usa la
  // aplicación, que es la del usuario y no la del reloj UTC. Con
  // `toISOString()` esta comprobación pasaba diecinueve horas al día y fallaba
  // las cinco restantes: entre las 19:00 de Bogotá y la medianoche, UTC ya está
  // en el día siguiente y la aplicación —correctamente— no.
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_DEL_USUARIO }).format(
    new Date(),
  )
  await expect(page.getByLabel('¿Cuándo?')).toHaveAttribute('max', hoy)
})

test('E8 — registrar desde la tabla produce lo mismo que Registro Fácil', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)

  // Uno por cada vía, con el mismo monto y la misma categoría.
  await page.goto('/registro')
  await registrar(page, { monto: '33000', descripcion: 'por el flujo rápido', categoria: 'Mercado' })

  await page.goto('/historial')
  await page.getByRole('button', { name: '+ Agregar movimiento' }).click()
  await page.getByLabel('Descripción del nuevo movimiento').fill('por la tabla')
  await page.getByLabel('Categoría del nuevo movimiento').click()
  await page.getByRole('option', { name: 'Mercado', exact: true }).click()
  await page.getByLabel('Monto del nuevo movimiento').fill('33000')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText('Movimiento registrado')).toBeVisible()
  await expect(page.getByText('por la tabla')).toBeVisible()

  // Ambos cuentan igual: el total del período es la suma de los dos.
  await page.goto('/')
  await expect(page.getByRole('main').getByText('$ 66.000').first()).toBeVisible()
})

test('FR-019 — la tabla aplica las mismas validaciones que Registro Fácil', async ({
  page,
}) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/historial')

  await page.getByRole('button', { name: '+ Agregar movimiento' }).click()
  await page.getByLabel('Monto del nuevo movimiento').fill('5000')
  await page.getByRole('button', { name: 'Guardar' }).click()

  // Sin descripción ni categoría, no procede: misma regla que FR-006.
  await expect(page.getByText(/Escribe en qué fue/)).toBeVisible()
})

test('T-037 — la aplicación no se rompe en pantalla estrecha', async ({ page }) => {
  await entrarComoNuevoUsuario(page)
  await page.goto('/registro')
  await registrar(page, { monto: '25000', descripcion: 'almuerzo', categoria: 'Comidas fuera' })

  await page.setViewportSize({ width: 390, height: 844 })

  for (const ruta of ['/', '/registro', '/historial']) {
    await page.goto(ruta)
    // Nada debe desbordar el ancho de la ventana: el desbordamiento horizontal
    // es lo que hace que una página se sienta rota en pantallas pequeñas.
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(desborde, `La página ${ruta} desborda horizontalmente`).toBe(false)
  }
})
