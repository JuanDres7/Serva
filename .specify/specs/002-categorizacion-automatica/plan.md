# Plan técnico — Feature 002

- **Spec:** [spec.md](./spec.md)
- **Estado:** aprobado
- **Creado:** 2026-08-23
- **Decisiones:** D-008, D-011, D-013, D-014, D-015, D-042, D-043, D-044, D-049, D-052

---

## 1. Qué decide este plan

Aquí entra la IA por primera vez, y con ella el riesgo que la constitución
anticipa: una respuesta del modelo que llega mal formada, tarde o nunca. Este plan
fija cómo se pide, cómo se valida y qué ocurre cuando falla — que es el caso que
más veces se va a dar en una máquina sin tarjeta gráfica.

**Principio rector:** la categorización es una comodidad, no un requisito. Si la IA
no está disponible, el usuario registra igual. Ninguna ruta del código puede
convertir un fallo del modelo en un fallo del registro.

## 2. Proveedor de modelo (resuelve P-016)

| Entorno | Proveedor | Motivo |
|---|---|---|
| Desarrollo | **Ollama** local | Gratuito, sin límite de peticiones, y ningún dato sale del equipo |
| Producción | **Google Gemini Flash** | La capa gratuita más holgada de las disponibles sin tarjeta (D-043) |
| Sin configurar | **none** | El registro funciona; la categorización se desactiva |

Se implementa sobre el **Vercel AI SDK**, que da una sola interfaz para los tres
casos y define las herramientas con Zod, cumpliendo el Artículo III por
construcción.

**Modelo local recomendado:** uno pequeño de la familia Qwen, por su licencia
Apache 2.0 (D-052). El nombre concreto se configura en `OLLAMA_MODEL` y no se fija
en el código: quien clone el repositorio elegirá según su memoria disponible.

## 3. Arquitectura

```
lib/ai/
├── provider.ts       Resuelve el proveedor según configuración
├── schema.ts         Esquemas Zod de todo lo que devuelve el modelo
├── categorize.ts     La cascada de tres niveles
└── prompt.ts         Construcción del mensaje

lib/domain/
└── keywords.ts       Extracción de términos con contenido (lógica pura)

lib/db/queries/
└── learning.ts       Historial de aprendizaje y búsqueda por palabras clave
```

**`lib/domain/keywords.ts` no conoce la IA ni la base de datos.** Extraer los
términos con contenido de una frase es lógica pura y se prueba en milisegundos,
que es donde está la mayor parte del valor de esta feature.

## 4. La cascada

```
descripción del usuario
        │
        ├─ 1. Palabras clave ──── ¿coincide con lo que ya categorizó? ──► listo
        │                                    (instantáneo, gratis)
        ├─ 2. Similitud ───────── aplazado a una feature posterior (D-044)
        │
        └─ 3. Modelo ─────────── solo lo genuinamente nuevo
                                     (segundos, con costo)
```

**Nivel 1 — palabras clave.** Se normaliza la descripción (minúsculas, sin tildes,
sin palabras vacías) y se buscan sus términos entre los que el usuario ya
categorizó. Una coincidencia con confianza suficiente resuelve sin tocar el modelo.

**Nivel 3 — modelo.** Recibe la descripción y la lista de categorías vigentes.
Devuelve la clave de categoría, un nivel de confianza y una descripción corta.

**Umbral de confianza:** por debajo de 0,6 no se sugiere nada. Es preferible que el
usuario elija a que corrija: una sugerencia equivocada cuesta más que la ausencia
de sugerencia, porque hay que advertirla primero.

## 5. Datos

```
categorization_log          historial de aprendizaje (D-015)
  id                  uuid
  user_id             → users.id
  transaction_id      → transactions.id, NULL si aún no se guardó
  input_text          texto original del usuario
  normalized_text     texto normalizado, para buscar por palabras clave
  keywords            text[]  términos con contenido
  suggested_category  category_key, NULL si no se sugirió nada
  confidence          real    ← ver nota
  mechanism           keywords | similarity | model | none
  final_category      category_key, NULL hasta que el usuario confirma
  was_corrected       boolean
  latency_ms          integer
  created_at          timestamptz
```

**Sobre `confidence` como `real`:** es el único campo de coma flotante del sistema y
es correcto que lo sea. El Artículo I prohíbe la coma flotante **para montos**,
porque un céntimo perdido corrompe el historial. Una confianza es una estimación
aproximada por naturaleza: 0,7341 y 0,7342 son indistinguibles en su significado.
Aplicarle la regla del dinero sería obedecer la letra ignorando la razón.

**Índices:** `(user_id, normalized_text)` para la búsqueda del nivel 1, y
`(user_id, created_at)` para medir el acierto en el tiempo.

## 6. Validación y degradación

Toda respuesta del modelo pasa por un esquema Zod antes de tocar nada:

```ts
const SugerenciaSchema = z.object({
  categoria: z.enum(CLAVES_DE_CATEGORIA),
  confianza: z.number().min(0).max(1),
  descripcionCorta: z.string().trim().max(80),
})
```

Que la categoría sea un `enum` y no un `string` es deliberado: un modelo pequeño
inventa categorías con facilidad —«comida», «restaurante»— y el esquema las rechaza
antes de que lleguen a la base de datos.

**Comportamiento ante fallo**, en todos los casos el mismo: no se sugiere nada, el
usuario elige, y el registro continúa.

| Fallo | Respuesta |
|---|---|
| El modelo no responde en 4 segundos | Se abandona la sugerencia |
| Devuelve algo que no valida | Se descarta y se registra |
| Devuelve una categoría inexistente | El esquema lo rechaza |
| No hay proveedor configurado | Nivel 1 solo; sin nivel 3 |

**El tiempo máximo de espera es lo que hace usable la IA local.** Un modelo en CPU
puede tardar varios segundos; sin límite, el usuario esperaría mirando un
formulario congelado.

## 7. Integración con Registro Fácil

La sugerencia se pide **mientras el usuario escribe**, no al enviar: cuando termina
de escribir la descripción y pasa al siguiente campo, la categoría ya está puesta.
Pedirla al confirmar añadiría una espera justo en el momento en que el usuario
quiere terminar.

- Se dispara al salir del campo de descripción, con un retardo que evita disparar
  en cada tecla.
- La categoría sugerida se marca visiblemente como tal (FR-002).
- Si el usuario ya eligió categoría a mano, **no se pisa** (Art. II.3).

## 8. El oráculo

El reto de esta feature es verificarla **sin depender de un modelo**, porque en
integración continua no hay Ollama ni claves.

1. **Lógica pura** (`keywords.ts`): se prueba directamente, sin nada más.
2. **Cascada con proveedor falso:** se inyecta un proveedor que devuelve respuestas
   controladas —válidas, inválidas, lentas, vacías— y se comprueba que la cascada
   reacciona como manda la spec.
3. **Medición del acierto:** un conjunto de descripciones con su categoría esperada,
   que se ejecuta contra el nivel 1 y produce un porcentaje. Es lo que permite
   saber si un cambio mejoró o empeoró las cosas.
4. **Prueba de degradación:** con el proveedor apagado, registrar sigue funcionando.

Ninguna prueba de este plan requiere un modelo instalado.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| El modelo local inventa categorías | Esquema con enumerado cerrado |
| Latencia alta arruina el registro rápido | Límite de 4 s y sugerencia asíncrona |
| El aprendizaje refuerza un error del usuario | La última corrección manda; el usuario siempre puede cambiarla |
| Las descripciones se envían a un tercero | Solo descripción y categorías; nunca identificadores (Art. VI.3) |
| Sin datos, el nivel 1 nunca acierta | Es esperado: las primeras semanas dependen del nivel 3 |
