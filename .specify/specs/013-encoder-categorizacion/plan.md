# Plan técnico — Feature 013

- **Spec:** [spec.md](./spec.md)
- **Creado:** 2026-09-09
- **Valida contra:** constitución v2.0.0, artículos II, III, IV, VI, VII

---

## 1. La decisión que gobierna todo el diseño

**Por qué no un servicio externo de embeddings (OpenAI, Cohere):** la constitución (Art. VI.3) exige minimizar lo que se le envía al modelo, y Art. VI.7 requiere transparencia sobre terceros. Un servicio externo recibiría las descripciones de transacciones del usuario — datos financieros sensibles. Además, introduce dependencia de red y costo por token. El modelo local (`paraphrase-multilingual-MiniLM-L12-v2` vía ONNX) corre server-side, no envía datos a terceros, cuesta $0 por uso, y la latencia es predecible (~50ms encoding + ~10ms pgvector).

**Por qué no Edge Runtime:** el modelo ocupa ~120MB. Edge Runtime en Vercel tiene límites de memoria y tiempo de ejecución que podrían causar cold starts lentos o errores. Server-side (Node.js con onnxruntime-node) es más estable y permite mantener el modelo en memoria entre requests.

**La decisión:** encoding server-side con ONNX, pgvector con índice HNSW para búsqueda, y el encoder como herramienta del chat + reemplazo del Nivel 1 del cascade.

## 2. Contratos

### Herramienta del chat: `categorizar`

Nueva herramienta en `crearHerramientas()` (lib/ai/tools.ts):

```typescript
categorizar: tool({
  description:
    'Busca la categoría más adecuada para una descripción, comparando con el ' +
    'historial del usuario. Devuelve la categoría sugerida y un score de ' +
    'confianza. Úsala cuando vayas a proponer un movimiento y quieras ' +
    'asegurarte de que la categoría sea correcta.',
  inputSchema: z.object({
    descripcion: z.string().min(1).max(120),
    tipo: z.enum(['expense', 'income']),
  }),
  execute: async ({ descripcion, tipo }) => {
    // 1. Normalizar descripción
    // 2. Generar embedding
    // 3. Buscar en pgvector (filtrado por userId y tipo)
    // 4. Devolver categoría + confianza
  },
})
```

### Función de dominio: `categorizarPorSimilitud`

Separada de la herramienta, para reutilización (registro rápido, tests):

```typescript
// lib/ai/encoder.ts
export async function categorizarPorSimilitud(
  userId: string,
  descripcion: string,
  tipo: MovementKind,
  options?: { limite?: number; umbral?: number }
): Promise<{
  categoria: string | null
  confianza: number
  alternativas: Array<{ categoria: string; confianza: number }>
}>
```

### Cascade actualizado

El Nivel 1 del cascade en `lib/ai/categorize.ts` se cambia de keywords a embedding search. La interfaz no cambia: sigue devolviendo `{ categoria, confianza, mecanismo }`.

## 3. Modelo de datos

### Columna nueva en `categorization_log`

```sql
ALTER TABLE categorization_log
  ADD COLUMN embedding vector(384);
```

- **Anulable:** sí. Las filas existentes no tienen embedding (se generan bajo demanda o se ignoran).
- **Índice:** HNSW con distancia coseno (`vector_cosine_ops`).
- **Datos existentes:** no se migran. Los embeddings se generan gradualmente para transacciones nuevas y, opcionalmente, se backfill con un script.

### Índice pgvector

```sql
CREATE INDEX idx_categorization_log_embedding
  ON categorization_log
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

- `m = 16`: buen balance entre velocidad y precisión para ~10k-100k vectores.
- `ef_construction = 64`: calidad razonable de构建 en tiempo de inserción.

### Script de backfill (opcional)

Un script que genera embeddings para las transacciones existentes sin vector. Se ejecuta una vez después de la migración.

## 4. La pieza crítica: el servicio de encoding

### `lib/ai/encoder.ts`

Módulo que encapsula:
1. **Carga del modelo:** ONNX Runtime con `onnxruntime-node`. Se carga una vez al iniciar el servidor y queda en memoria.
2. **Tokenización:** usa el tokenizador del modelo (WordPiece, max 128 tokens).
3. **Encoding:** convierte texto a vector de 384 floats.
4. **Búsqueda:** consulta pgvector con `<=>` (cosine distance), filtrada por `user_id` y `tipo`.

### Flujo de una búsqueda

```
1. Normalizar descripción (lib/domain/keywords.ts: extraerPalabrasClave)
2. Tokenizar con WordPiece del modelo
3. Ejecutar inferencia ONNX → vector de 384 floats
4. SELECT categoría, 1 - (embedding <=> vector) AS confianza
   FROM categorization_log
   WHERE user_id = $1
     AND suggested_category IS NOT NULL
     AND embedding IS NOT NULL
     AND (tipo = $2 OR $2 IS NULL)
   ORDER BY embedding <=> $3
   LIMIT 5
5. Filtrar por confianza ≥ umbral (0.7)
6. Devolver la categoría con mayor confianza
```

### `lib/domain/normalize.ts`

Función pura que normaliza texto para encoding:
- Minúsculas
- Remover acentos (NFD + regex)
- Remover puntuación
- Singularizar (reutilizar de keywords.ts si es posible)

Esta misma normalización se usa para el encoding de almacenamiento y de búsqueda, garantizando consistencia.

## 5. Degradación

| Fallo | Comportamiento |
|---|---|
| Modelo no carga (memoria insuficiente) | `encoderDisponible = false`. Nivel 1 del cascade se salta. Chat no muestra herramienta `categorizar`. Nivel 3 (LLM) sigue funcionando. |
| Modelo falla durante inferencia | Se devuelve `{ categoria: null, confianza: 0 }`. La herramienta informa al LLM que no pudo sugerir. |
| pgvector no disponible (extensión no instalada) | El encoder se deshabilita. El sistema opera como antes de la feature 013. |
| Timeout de búsqueda (>200ms) | Se devuelve resultado parcial o sin sugerencia. No se bloquea el registro. |
| Embedding generado es inválido (NaN, Inf) | Se rechaza silenciosamente y se continúa sin embedding. |

**Principio:** el sistema nunca depende del encoder para funcionar. Es una mejora, no un requisito.

## 6. Verificación sin modelo

| Capa | Qué se prueba | ¿Necesita modelo? |
|---|---|---|
| `normalize.ts` | Normalización de texto (acentos, puntuación, singularización) | No |
| `encoder.ts` — mock | Lógica de búsqueda, filtrado por usuario, threshold de confianza | No (mock del embedding) |
| `categorize.ts` — cascade | Integración del encoder en el cascade, degradación | No (mock) |
| `tools.ts` — herramienta | Validación de parámetros, respuesta al LLM | No |
| `categorization_log` schema | Columna embedding existe, índice HNSW | No (migración verificable) |
| Integración con encoder real | Encoding + búsqueda end-to-end | **Sí** (comando aparte, como D-057) |

El comando de integración se ejecuta con `npm run evaluar-encoder` (no dentro de `verify`).

## 7. Lo que este plan valida contra la constitución

| Artículo | Cómo se cumple |
|---|---|
| II — La IA sugiere | El encoder sugiere categoría con score de confianza. El usuario siempre puede corregir. La categoría se marca con `mechanism: 'similarity'` en el log. |
| III — Salida validada | La herramienta `categorizar` valida su salida con Zod antes de devolverla al LLM. Si el embedding falla, devuelve `{ categoria: null, confianza: 0 }` (Art. III.2). |
| IV — Verificabilidad | Todas las capas excepto la integración con el modelo real se prueban con mocks en `npm run verify`. La integración real va a un comando aparte. |
| VI — Custodia | El modelo corre server-side. Las descripciones nunca salen del servidor. No se usan servicios externos de embeddings. El embedding no contiene datos identificables. |
| VII — Historial inmutable | Los embeddings se agregan a `categorization_log` sin modificar filas existentes. Las filas sin embedding siguen funcionando. |

## 8. Lo que este plan deja abierto para `tasks.md`

- Número exacto de resultados a devolver del búsqueda (3, 5, o configurable)
- Si el backfill de embeddings existentes se hace como parte de la feature o como script manual
- Si se agrega un botón "re-categorizar" en la UI para mejorar el historial gradualmente
- El nombre exacto del archivo de tests de integración con el encoder real
