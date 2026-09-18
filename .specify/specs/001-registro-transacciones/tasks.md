# Tareas — Feature 001

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Actualizado:** 2026-08-22

---

## Cómo se usa este archivo

Cada tarea es una unidad del loop: se implementa, se verifica con su criterio y se
marca. **El estado del proyecto vive aquí, no en la memoria de ninguna
conversación** — cualquier sesión nueva debe poder retomar leyendo este archivo.

Si una tarea no se verifica en un ciclo, es demasiado grande: se parte. Si falla
tres veces seguidas, el problema no está en el código sino en la spec o en el
diseño, y se sube un nivel en lugar de seguir iterando.

**Leyenda:** ⬜ pendiente · 🔄 en curso · ✅ hecha

---

## Fase 0 — Andamiaje

Nada de esto es funcionalidad de producto. Es lo que hace posible el ciclo de
trabajo, y va primero porque sin oráculo no hay loop (Art. IV.1).

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-001 | Proyecto Next.js con TypeScript en modo estricto | `tsc --noEmit` pasa; `strict: true` en la configuración |
| ✅ T-002 | Tailwind y componentes base de shadcn/ui | Una página de prueba renderiza un componente de la librería |
| ✅ T-003 | Postgres con pgvector en contenedor para desarrollo local | `docker compose up -d` levanta la base y `CREATE EXTENSION vector` funciona |
| ✅ T-004 | Drizzle conectado a la base | Una consulta trivial devuelve resultado desde la aplicación |
| ✅ T-005 | Vitest configurado | Una prueba de ejemplo pasa y otra deliberadamente rota falla |
| ✅ T-006 | Playwright configurado | Una prueba que abre la página de inicio pasa |
| ✅ T-007 | **`npm run verify`** encadenando tipos, lint, pruebas y navegador | El comando corre entero y pasa sobre el proyecto vacío |
| ✅ T-008 | Autenticación mínima con Better Auth: registro, inicio y cierre de sesión | Se crea una cuenta, se inicia sesión y la sesión persiste al recargar |
| 🔄 T-009 | `.env.example` y README con los pasos de instalación | Alguien ajeno levanta el proyecto siguiendo solo el README |

> **Sobre T-008.** La feature 000 es previa a esta (D-048), pero su spec completa
> —verificación de correo, restablecimiento, datos de ejemplo, avisos legales— es
> más de lo que la 001 necesita. Aquí se construye únicamente la autenticación
> mínima que permite que los movimientos tengan dueño desde el primer día, sin
> deuda técnica: la spec 000 se completa después, sobre esta base.

## Fase 1 — Dominio

Lógica pura, sin base de datos ni red. Es lo más delicado del proyecto y lo más
barato de verificar.

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-010 | `money.ts`: tipo `Money`, suma, resta y comparación | Sumar `Money` con un número corriente no compila; la aritmética es exacta en casos con decimales |
| ✅ T-011 | Conversión de entrada del usuario a centavos, según configuración regional | `"15.000"` y `"15.000,50"` en formato colombiano dan 1500000 y 1500050; nunca se usa `parseFloat` |
| ✅ T-012 | Formateo de `Money` para mostrar | Tres monedas distintas se formatean correctamente, incluyendo separadores invertidos |
| ✅ T-013 | `cycle.ts`: `periodFor`, `previousPeriod`, `nextPeriod` para mes calendario | Períodos correctos en meses de 28, 29, 30 y 31 días |
| ✅ T-014 | Resto de formas de ciclo: mensual por día, dos veces al mes, semanal, cada N días | Día 31 en febrero cae en el último día del mes; períodos consecutivos sin solapes ni huecos |
| ✅ T-015 | `categories.ts`: catálogo fijo con nombre, tipo y color | Las categorías de gasto no aparecen como opción para ingresos ni al revés |

## Fase 2 — Datos

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-016 | Esquema de la tabla de movimientos, con las columnas de ahorro previstas | Ningún tipo de coma flotante en el esquema; existen las restricciones de monto positivo y fecha no futura |
| ✅ T-017 | Migraciones e índices del plan | Los tres índices existen; las migraciones corren desde cero en base vacía |
| ✅ T-018 | ~~Semilla del catálogo~~ → Enumerado en la base, coherente con el catálogo de código | Una prueba falla si el enumerado de la base y `CATEGORIES` dejan de coincidir |
| ✅ T-019 | Consultas de movimientos, todas con `userId` obligatorio | Ninguna función exportada del módulo permite consultar sin usuario |
| ✅ T-020 | **Prueba de aislamiento entre usuarios** | Con dos usuarios y datos cruzados, ninguna consulta devuelve datos ajenos |
| ✅ T-021 | `balance.ts`: totales y desglose por categoría según RN-002 | Los totales coinciden con la suma manual; los anulados y los de ahorro quedan excluidos |
| ✅ T-022 | Agregados en SQL para el desglose por categoría | El desglose se resuelve en una consulta, sin traer los movimientos al servidor |

## Fase 3 — Interfaz

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-023 | Estructura de páginas y navegación de la aplicación autenticada | Sin sesión, ninguna página con datos es accesible |
| ✅ T-024 | Registro Fácil: monto con foco automático y formateo progresivo | Al abrir, el cursor está en el monto; escribir `15000` muestra `$ 15.000` |
| ✅ T-025 | Selector de tipo con ambas opciones visibles y gasto preseleccionado | No existe ningún control que alterne entre estados |
| ✅ T-026 | Categoría y fecha, con «Hoy» por defecto y calendario | No se aceptan fechas futuras |
| ✅ T-027 | Validación y mensajes de error sin perder lo escrito | Un monto inválido informa el motivo y conserva el resto del formulario |
| ✅ T-028 | Guardado, confirmación visible y deshacer | Deshacer inmediatamente después de guardar elimina el movimiento |
| ✅ T-029 | Encadenar registros con contador y total de la sesión | Tras tres registros, el contador muestra tres y la suma correcta |
| ✅ T-030 | Historial-tabla ordenado y con carga incremental | Con muchos movimientos, la primera carga no los trae todos |
| ✅ T-031 | Edición en línea sobre la tabla | Editar el monto actualiza los totales del período |
| ✅ T-032 | Alta de movimientos desde la tabla | Un movimiento creado aquí es idéntico a uno creado en Registro Fácil |
| ✅ T-033 | Anulación y restauración | Un movimiento anulado desaparece de los totales y puede restaurarse |
| ✅ T-034 | Filtros por período, tipo y categoría | Los totales se recalculan según el filtro aplicado |
| ✅ T-035 | Pantalla de inicio: totales, desglose y acceso a Registro Fácil | Las cifras coinciden con las de la fase 2 |
| ✅ T-036 | Estado inicial sin movimientos | La pantalla explica qué hace la aplicación y cuál es la siguiente acción |
| ✅ T-037 | Revisión de que nada se rompe al reducir el ancho de ventana | La aplicación es usable en ancho de móvil |

## Fase 4 — Escenarios completos

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-038 | Pruebas de extremo a extremo de E1 a E9 | Los nueve escenarios pasan en `npm run verify` |
| ✅ T-039 | Revisión final contra los criterios de aceptación de la spec | Los ocho criterios se cumplen y están verificados automáticamente donde corresponde |

---

## Reglas del loop para esta feature

1. **T-007 antes que nada más.** Sin el comando de verificación funcionando, ninguna
   otra tarea puede darse por terminada.
2. **Ninguna tarea está hecha sin su criterio verificado.** El criterio no es una
   descripción: es algo que se ejecuta.
3. **Prohibido debilitar una aserción** para que una tarea pase (Art. IV.4).
4. **Lo que aparezca fuera del alcance se anota, no se implementa.**


---

## Cierre de la feature (T-039)

Verificación de los ocho criterios de aceptación de la spec, con el lugar donde
cada uno queda comprobado automáticamente.

| # | Criterio | Dónde se verifica |
|---|---|---|
| 1 | Los nueve escenarios E1–E9 se ejecutan de principio a fin | `tests/e2e/registro.spec.ts` |
| 2 | Registrar un gasto requiere a lo sumo monto, descripción, categoría y confirmar | E1, más el foco automático en el monto |
| 3 | Los totales coinciden con la suma manual, con decimales | `tests/db/transactions.test.ts` |
| 4 | Ningún monto se representa con coma flotante en ninguna capa | `tests/db/schema.test.ts` — inspecciona los tipos de todas las columnas |
| 5 | Anular no elimina y es reversible | `tests/db/transactions.test.ts` y E5 |
| 6 | Verificación automática de RN-002, RN-004 y RN-006 | `balance.test.ts`, `money.test.ts` y `cycle.test.ts` |
| 7 | Los períodos funcionan en meses de 28, 29, 30 y 31 días | `tests/domain/cycle.test.ts` |
| 8 | Un movimiento creado por cada vía es indistinguible | E8, y ambas vías comparten acción y validaciones |

**Estado:** 175 comprobaciones automáticas en verde (155 de dominio y datos, 20 de
navegador).

### Fuera de esta feature, pendiente de las siguientes

- **Categorización automática (002).** Hoy, un movimiento sin categoría elegida cae
  en «Otros». Cuando exista la cascada, la categoría llegará sugerida.
- **Configuración inicial (004).** La moneda, el idioma y la zona horaria se crean
  con valores colombianos por defecto; la pantalla para elegirlos es la 004.
- **Gráficos (008).** El desglose por categoría ya se muestra como barras
  horizontales ordenadas, pero la evolución y el ritmo del período llegan con su
  propia feature.
