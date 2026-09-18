# Tareas - Feature 013

- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)
- **Actualizado:** 2026-09-09

**Leyenda:** ? pendiente · ?? en curso · ? hecha

---

## Fase 1 — Infraestructura del encoder

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-120 | Agregar `onnxruntime-node` y `@huggingface/transformers` a `package.json` | `npm install` sin errores, imports resuelven |
| ? T-121 | Crear `lib/ai/encoder.ts` con carga del modelo ONNX (`paraphrase-multilingual-MiniLM-L12-v2`) y funci\u00f3n `codificar(texto: string): Promise<Float32Array>` | Test unitario: `codificar("hola")` devuelve array de 384 floats |
| ? T-122 | Crear `lib/domain/normalize.ts` con `normalizarParaEncoding(texto: string): string` (min\u00fasculas, sin acentos, sin puntuaci\u00f3n, singularizado) | Test unitario: "Compra en \u00c9xito!!!" \u2192 "compra en exito" |
| ? T-123 | Crear migraci\u00f3n de Drizzle para agregar columna `embedding vector(384)` anulable a `categorization_log` + \u00edndice HNSW | `drizzle-kit generate` produce migraci\u00f3n v\u00e1lida, columna existe en schema |

## Fase 2 — B\u00fasqueda sem\u00e1ntica

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-124 | Crear `lib/db/queries/embeddings.ts` con `buscarSimilares(userId, texto, tipo, opciones?)` que genera embedding, busca en pgvector, y devuelve `{ categoria, confianza, alternativas }` | Test con mock de pgvector: devuelve categor\u00eda con confianza > 0.7 |
| ? T-125 | Crear `lib/db/queries/embeddings.ts` \u2014 funci\u00f3n `guardarEmbedding(logId, embedding)` que actualiza la fila del log con el vector | Test: despu\u00e9s de guardar, `buscarSimilares` encuentra la fila |
| ? T-126 | Crear `lib/ai/categorize.ts` \u2014 reemplazar Nivel 1 (keywords) por b\u00fasqueda sem\u00e1ntica via `buscarSimilares` | Test: cascade con mock de encoder devuelve categor\u00eda correcta |

## Fase 3 — Integraci\u00f3n con el chat

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-127 | Agregar herramienta `categorizar` a `crearHerramientas()` en `lib/ai/tools.ts` con schema Zod de entrada y salida | `npm run verify` pasa, herramienta aparece en el conjunto |
| ? T-128 | Actualizar system prompt en `lib/ai/prompt.ts` para indicar al LLM que use `categorizar` antes de `proponerMovimientos` cuando no est\u00e9 seguro de la categor\u00eda | El prompt incluye instrucci\u00f3n sobre la herramienta |

## Fase 4 — Generaci\u00f3n de embeddings al guardar

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-129 | Modificar `lib/actions/transactions.ts` \u2014 despu\u00e9s de guardar, generar embedding y llamar `guardarEmbedding` | Test: transacci\u00f3n guardada tiene embedding en el log |
| ? T-130 | Modificar `lib/actions/categorize.ts` \u2014 despu\u00e9s de categorizar, generar embedding del input y guardarlo | Test: categorizaci\u00f3n tiene embedding asociado |

## Fase 5 — Degradaci\u00f3n y robustez

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-131 | Crear `lib/ai/encoder-state.ts` con flag `encoderDisponible` y funci\u00f3n `verificarEncoder()` que se llama al iniciar el servidor | Si el modelo no carga, `encoderDisponible = false` y el sistema funciona sin encoding |
| ? T-132 | Actualizar `buscarSimilares` para devolver `{ categoria: null, confianza: 0 }` cuando encoder no est\u00e1 disponible | Test: con encoder deshabilitado, la b\u00fasqueda no lanza excepci\u00f3n |
| ? T-133 | Actualizar herramienta `categorizar` para manejar fallos del encoder gracefulmente (informar al LLM que no pudo sugerir) | Test: LLM recibe respuesta de fallback, no error |

## Fase 6 — Tests de integraci\u00f3n

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-134 | Crear `tests/domain/encoder.test.ts` \u2014 tests de normalizaci\u00f3n, encoding, y b\u00fasqueda con mocks | Todos los tests pasan sin modelo instalado |
| ? T-135 | Crear `tests/db/embeddings.test.ts` \u2014 tests de guardado y b\u00fasqueda de embeddings en la DB real | Tests pasan contra DB de test |
| ? T-136 | Crear `tests/domain/categorize-encoder.test.ts` \u2014 test del cascade completo con encoder mockeado | Cascade devuelve categor\u00eda con mecanismo 'similarity' |

## Fase 7 — Cierre

| | Tarea | Criterio de verificaci\u00f3n |
|---|---|---|
| ? T-137 | `npm run verify` en verde sin modelo instalado | Las comprobaciones actuales m\u00e1s las nuevas pasan |
| ? T-138 | Actualizar `CLAUDE.md` con la nueva feature 013 y sus decisiones | Documento refleja el estado actual del proyecto |

---

## Orden de ataque

**Fase 1** es prerrequisito de todo: sin encoder ni migraci\u00f3n no hay nada que buscar.

**Fase 2** depende de Fase 1: la b\u00fasqueda sem\u00e1ntica necesita el encoder y la columna.

**Fase 3** y **Fase 4** son independientes entre s\u00ed pero ambas dependen de Fase 2.

**Fase 5** puede ir en cualquier momento despu\u00e9s de Fase 1 (es degradaci\u00f3n, no funcionalidad nueva).

**Fase 6** va al final, despu\u00e9s de que todo funcione.

**Fase 7** es cierre y documentaci\u00f3n.

## Cierre de la feature

| # | Criterio de aceptaci\u00f3n | Estado |
|---|---|---|
| 1 | Los 7 escenarios E1\u2013E7 se ejecutan correctamente en pruebas automatizadas | ? |
| 2 | La latencia de b\u00fasqueda sem\u00e1ntica es menor a 200ms en el 95% de las consultas | ? |
| 3 | La precisi\u00f3n de categorizaci\u00f3n con el encoder es \u2265 85% en conjunto de prueba | ? |
| 4 | Ninguna prueba de la suite requiere un modelo de lenguaje instalado | ? |
| 5 | Las pruebas de aislamiento (E7) verifican que la b\u00fasqueda nunca cruza usuarios | ? |
| 6 | La degradaci\u00f3n (E6) se prueba con el modelo deshabilitado | ? |

## Lo que no se puede verificar sin ejecutar un modelo

- **Precisi\u00f3n real del encoder sobre descripciones de finanzas personales en espa\u00f1ol** (FR-003, m\u00e9trica de \u00e9xito). Se verifica con `npm run evaluar-encoder` contra un conjunto de 100 descripciones etiquetadas.
- **Latencia real en producci\u00f3n** (FR-011). Se mide con el modelo cargado en el servidor real, no en un test unitario.

**Lo que S\u00ed queda cubierto por `verify`:**
- Normalizaci\u00f3n de texto (protege al usuario de inconsistencias)
- Filtrado por usuario (protege la privacidad, Art. VI.1)
- Degradaci\u00f3n ante fallos (protege la disponibilidad)
- Validaci\u00f3n de schema (protege contra datos inv\u00e1lidos)
- L\u00f3gica del cascade (protege la integridad del proceso)
