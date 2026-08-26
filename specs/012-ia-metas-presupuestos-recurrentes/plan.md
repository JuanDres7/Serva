# Plan técnico — Feature 012

- **Spec:** [spec.md](./spec.md)
- **Creado:** 2026-08-25
- **Valida contra:** constitución v2.0.0, artículos I, II, III, IV, VI, VII, VIII

---

## 1. La decisión que gobierna todo el diseño

**La opción evidente era crear herramientas genéricas tipo ` gestionarEntidad(accion, tipo, datos)`. Se descarta.**

Una herramienta genérica obliga al modelo a acertar la combinación correcta de `accion × tipo × datos`, y el esquema Zod resultante es unión discriminada con múltiples caminos —exactamente el tipo de salida que más falla en modelos de lenguaje (Art. III). Peor: si la herramienta cambia, cambian todas las entidades a la vez, cuando sus reglas de negocio son distintas (las metas no son gastos, los presupuestos necesitan ciclo configurado, los recurrentes pueden confirmarse).

**Lo que se hace:** herramientas individuales por entidad y por operación, igual que ya existen para deudas (`misDeudas`, `proponerDeuda`, `proponerAbono`, `proponerSaldarDeuda`). Cada herramienta tiene un esquema Zod propio, acotado, que el modelo completa con más facilidad. Son 9 herramientas nuevas (3 de lectura, 6 de escritura), que se suman a las 13 existentes.

**Qué se compra con la diferencia:** validación específica por operación (el esquema de `proponerMeta` no acepta categorías; el de `proponerPresupuesto` solo acepta categorías de gasto), mensajes de error concretos por herramienta, y posibilidad de degradar una sin afectar a las demás.

## 2. Herramientas del asistente

### 2.1 Lectura (3 herramientas)

| Herramienta | Parámetros | Retorna | Fuente de datos |
|---|---|---|---|
| `misMetas` | `{}` | Lista de metas activas con progreso: nombre, objetivoCents, aportadoCents, porcentaje, faltaCents, fechaEstimada. Más totalahorradoCents y metasActivas. | `listarMetas()` + `obtenerEstado()` + `ritmoDeMeta()` |
| `misPresupuestos` | `{}` | Lista de presupuestos con gasto real: categoría, topeCents, gastadoCents, restanteCents, nivel (holgado/cerca/excedido), diasRestantes. Más ciclo configurado. | `presupuestosConGasto()` + `estadoDePresupuesto()` |
| `misRecurrentes` | `{}` | Lista separada en pendientes y programados: descripción, montoCents, tipo, categoría, periodicidad, próximaFecha, diasRetraso. | `listarRecurrentes()` + `pendientesDeConfirmar()` |

### 2.2 Escritura (6 herramientas)

| Herramienta | Parámetros | Puerta | Retorna |
|---|---|---|---|
| `proponerMeta` | `{ nombre, monto, fecha? }` | crear | Propuesta de creación de meta |
| `proponerAporteMeta` | `{ meta, monto, direccion: 'aportar' \| 'retirar' }` | crear | Propuesta de aporte/retiro |
| `proponerPresupuesto` | `{ categoria, monto }` | crear | Propuesta de creación/actualización de tope |
| `proponerEliminarPresupuesto` | `{ categoria }` | destruir → siempre confirmar | Propuesta de eliminación |
| `proponerRecurrente` | `{ descripcion, monto, tipo, categoria, periodicidad }` | crear | Propuesta de creación de recurrente |
| `confirmarRecurrente` | `{ descripcion, monto?, permanente? }` | crear | Propuesta de confirmación de cobro pendiente |

### 2.3 Búsqueda por nombre

Siguiendo el patrón de `buscarDeudaPorContraparte` (substrings bidireccionales en minúsculas):

- **Metas:** buscar en el campo `name` de la tabla `savings_goals`.
- **Recurrentes:** buscar en el campo `description` de la tabla `recurring_movements`.
- **Presupuestos:** no hay nombre libre; se busca por clave de categoría. El modelo conoce las categorías porque están en el prompt del sistema.

Patrón: `nombre.toLowerCase().includes(buscado) || buscado.includes(nombre.toLowerCase())`. Si hay varias coincidencias, se listan todas. Si no hay ninguna, se lista lo que existe.

### 2.4 Resolución de periodicidad

El usuario dice «cada mes», «quincenal», «semanal». El modelo resuelve a la periodicidad soportada:

| Dicho del usuario | Periodicidad resultante |
|---|---|
| «cada mes», «mensual», «el 5 de cada mes» | `{ kind: 'monthly', day: N }` |
| «quincenal», «cada 15 días» | `{ kind: 'every-n-days', n: 15 }` |
| «semanal», «cada semana» | `{ kind: 'every-n-days', n: 7 }` |
| «cada N días» | `{ kind: 'every-n-days', n: N }` |

Si el usuario no menciona el día del mes para un mensual, se pregunta. Si no menciona periodicidad, se pregunta.

## 3. Modelo de datos

**No hay tablas nuevas ni columnas nuevas.** Las tres entidades ya existen:

| Entidad | Tabla | Campos relevantes |
|---|---|---|
| Metas | `savings_goals` | `name`, `target_cents`, `target_date`, `achieved_at` |
| Presupuestos | `budgets` | `category` (enum), `limit_cents` |
| Recurrentes | `recurring_movements` | `description`, `amount_cents`, `type`, `category`, `schedule` (JSONB), `next_due_on` |

El campo `created_by` en `savings_goals` ya acepta `'ai'` via el enum `movement_origin`. Las propuestas de meta, presupuesto y recurrente se marcan con `created_by = 'ai'` al pasar por la puerta de decisión.

**Migración necesaria:** Ninguna. drizzle-kit no generará cambios porque no hay cambios en el schema.

## 4. La pieza crítica: búsqueda y resolución de entidades

La búsqueda por nombre es la salvaguarda más importante de esta feature. Si el modelo busca mal, el usuario pierde confianza. Si busca bien pero no informa, el usuario no sabe qué se encontró.

**Regla:** toda operación sobre una entidad existente (aportar, retirar, eliminar, confirmar) pasa por una función `buscarYValidar` que:

1. Normaliza la entrada del modelo (trim, lowercase).
2. Busca coincidencias con el patrón bidireccional.
3. Retorna `encontrada:_exacta`, `encontradas:varias` o `no_encontrada`.
4. En caso de varias, lista las opciones con nombre y estado relevante.
5. En caso de ninguna, lista lo que existe.

Esta función es pura (no toca la base de datos) y se prueba con una tabla de verdad:

| Entrada | Entidades existentes | Resultado |
|---|---|---|
| «viaje» | [«Viaje a Japón»] | exacta (substring bidireccional) |
| «viaje» | [«Viaje a Japón», «Viaje Europa»] | varias |
| «carro» | [] | no_encontrada + lista de metas activas |
| «internet» (pendientes) | [«Internet monthly» vencido] | exacta |

## 5. Degradación

| Escenario | Comportamiento |
|---|---|
| Sin modelo configurado | El chat no puede hacer estas operaciones. La UI de metas, presupuestos y recurrentes sigue funcionando igual. El chat responde con texto indicando que no hay proveedor. |
| Modelo devuelve JSON inválido contra el esquema Zod | La herramienta no se ejecuta. El chat informa al usuario que no entendió y le pide reformular. No se escribe nada a medias (Art. III.2). |
| Modelo busca una entidad que no existe | La herramienta retorna `no_encontrada` con la lista de entidades disponibles. El chat la muestra y pide que el usuario especifique. |
| Ciclo de pago no configurado (presupuestos) | Las herramientas de presupuesto verifican `cycleConfiguredAt` antes de ejecutar. Si es null, retornan un mensaje específico que el chat transmite al usuario. |
| Monto no numérico o negativo | El esquema Zod rechaza antes de llegar a la base de datos. El chat dice que el monto no es válido. |

## 6. Verificación sin modelo

| Capa | Qué se prueba | ¿Necesita modelo? |
|---|---|---|
| Búsqueda por nombre (buscarYValidar) | Tabla de verdad: exacta, varias, ninguna | No |
| Resolución de periodicidad | Conversión de texto a schedule | No |
| Puerta de decisión | Ejecutar/confirmar/rechazar según parámetros | No |
| Creación de meta | Inserta en savings_goals, created_by = 'ai' | No |
| Creación de presupuesto | Inserta en budgets, validación solo gasto | No |
| Creación de recurrente | Inserta en recurring_movements con nextDueOn correcto | No |
| Confirmación de recurrente | Crea transacción, actualiza nextDueOn, archiva si es once | No |
| Aporte/retiro de meta | Crea transacción saving, actualiza progreso derivado | No |
| Degradación sin ciclo | Verificar que presupuestos no se ejecutan | No |
| User isolation | Verificar que userId filtra en todas las queries | No |
| Extracción de herramientas por el modelo | Que el modelo elige la herramienta correcta | **Sí** |

La última fila es la única que necesita modelo y se verifica aparte con `npm run evaluar`, como se hizo en D-057.

## 7. Lo que este plan valida contra la constitución

| Artículo | Cómo se cumple |
|---|---|
| I — Dinero entero | Todos los montos en las herramientas son enteros en centavos. `proponerMeta` recibe `monto` como number interpretado como pesos, y lo convierte a centavos en `prepararMeta()`. `proponerPresupuesto` recibe `monto` directamente como centavos. Nunca hay float. |
| II — La IA sugiere | Toda operación de escritura pasa por la puerta de decisión. El modelo propone; el sistema valida con Zod y decide ejecutar, confirmar o rechazar. `created_by = 'ai'` en todas las filas escritas. |
| III — Salida validada | Cada herramienta tiene su propio esquema Zod. `metaSchema`, `presupuestoSchema`, `recurrenteSchema` ya existen en las queries; se reutilizan o se adaptan para las herramientas del chat. |
| IV — Verificabilidad | Todas las capas se prueban sin modelo. La extracción del modelo se prueba con `evaluar`. `npm run verify` sigue pasando. |
| VI — Custodia | Cada query filtra por `userId`. Las herramientas reciben `userId` del closure, nunca del modelo. |
| VII — Historial inmutable | Confirmar un recurrente crea una transacción nueva. No se modifica ni borra el recurrente; se actualiza `nextDueOn`. Los `once` se archivan, no se borran. |
| VIII — Simplicidad | No hay tablas nuevas, no hay migraciones, no hay dependencias nuevas. Solo se añaden herramientas al chat y funciones de búsqueda en las queries existentes. |

## 8. Lo que este plan deja abierto para `tasks.md`

- El orden exacto de implementación de las herramientas (se asume: lectura primero, escritura después).
- Cómo se presentan visualmente las tablas de metas, presupuestos y recurrentes en el chat (componentes new York minimal, estilo existente).
- El prompt del sistema: qué instrucciones se agregan para que el modelo entienda las nuevas herramientas.
- Los tests de integración: cuántos escenarios E1–E15 se cubren con pruebas automáticas vs. evaluación con modelo.
- La rehidratación de conversaciones guardadas: cómo se serializan las nuevas propuestas para que las tarjetas muestren el estado correcto al volver.
