# Spec 013 — Encoder para categorización semántica

- **Estado:** borrador
- **Creada:** 2026-09-09
- **Depende de:** 002 (categorización automática), 003 (chat sobre finanzas), 010 (acciones conversacionales)
- **Decisiones aplicables:** D-044 (similitud vectorial diferida)

---

## 1. Contexto y motivación

La categorización automática actual (spec 002) usa un cascade de tres niveles: keywords, similitud vectorial (diferida), y LLM. El Nivel 1 (keywords) es frágil: "Rappi" no matchea con "comida", "domicilio" no con "comida", "Netflix" no con "suscripción". Todo eso cae al LLM, que es lento (2-4s) y cuesta dinero. Además, cuando el usuario habla con el asistente (spec 003), el LLM adivina la categoría sin contexto del historial, y si acierta es por suerte.

El usuario necesita que las categorías sean correctas desde el primer registro, tanto en el formulario de registro rápido como en el chat con el asistente. Un historial con categorías incorrectas alimenta presupuestos inútiles, gráficos engañosos y peores respuestas del chat.

## 2. Alcance

### Dentro

- Un modelo de embeddings corre en el servidor y genera vectores de 384 dimensiones a partir de descripciones de transacciones
- Cada transacción nueva recibe su embedding al guardarse
- El asistente tiene una herramienta nueva para buscar categorías por similitud semántica en el historial del usuario
- La búsqueda usa pgvector para encontrar las descripciones más similares y devolver la categoría asociada
- El Nivel 1 del cascade de categorización (keywords) se reemplaza por la búsqueda semántica

### Fuera

- Fine-tuning del modelo de embeddings sobre las 18 categorías de Serva (el modelo genérico es suficiente para descripciones de finanzas personales)
- Búsqueda semántica en el chat para recuperar conversaciones pasadas (feature futura)
- Uso del encoder para clasificación de intención del LLM (feature futura)
- Cambios al Nivel 3 del cascade (LLM) — sigue funcionando igual

## 3. Escenarios

### E1 — Categorización en registro rápido con historial

**Dado** que el usuario ya registró "uber" categorizado como "transporte" y "mercado" como "alimentos",
**cuando** escribe "domicilio rappi" en el campo de descripción,
**entonces** el sistema sugiere "alimentos" (o la categoría más similar del historial) con un score de confianza visible, en menos de 200ms.

### E2 — Categorización sin historial previo

**Dado** que el usuario nunca registró algo similar a "suscripción spotify",
**cuando** escribe "spotify" en el campo de descripción,
**entonces** el sistema no sugiere categoría (confianza por debajo del umbral) y el usuario selecciona manualmente.

### E3 — Asistente usa el encoder para categorizar

**Dado** que el usuario tiene historial con categorías correctas,
**cuando** dice "gasté 50 en uber" al asistente,
**entonces** el asistente llama la herramienta de categorización, obtiene "transporte" con alta confianza, y propone el movimiento con esa categoría.

### E4 — Asistente sin historial similar

**Dado** que el usuario no tiene nada similar en su historial,
**cuando** dice "pagué la cuota del gym" al asistente,
**entonces** el asistente propone el movimiento sin categoría (la deja en null o en "otros") y el usuario puede corregirlo.

### E5 — Búsqueda semántica vs literal

**Dado** que el usuario registró "compra Éxito" categorizado como "alimentos",
**cuando** escribe "supermercado" en el campo de descripción,
**entonces** el sistema sugiere "alimentos" porque "supermercado" y "compra Éxito" son semánticamente similares, aunque no compartan palabras clave.

### E6 — Degradación ante ausencia del modelo

**Dado** que el modelo de embeddings no está disponible (error de carga, memoria insuficiente),
**cuando** el usuario registra o categoriza una transacción,
**entonces** el sistema funciona sin sugerencias (igual que cuando el LLM falla en la spec 002), sin bloquear el registro.

### E7 — Aislamiento entre usuarios

**Dado** que dos usuarios distintos tienen descripciones similares,
**cuando** uno busca categorías por similitud,
**entonces** solo ve resultados de su propio historial, nunca del otro.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe generar un embedding de 384 dimensiones para cada descripción de transacción al guardarse |
| FR-002 | El sistema debe almacenar el embedding junto con la categoría asignada en la tabla de log de categorización |
| FR-003 | El sistema debe buscar las N descripciones más similares a un texto dado, dentro del historial del usuario, usando distancia coseno |
| FR-004 | El sistema debe devolver la categoría y el score de confianza de cada resultado similar |
| FR-005 | El asistente debe tener una herramienta `categorizar` que reciba una descripción y devuelva la categoría sugerida |
| FR-006 | El sistema debe usar pgvector con índice HNSW para búsquedas eficientes |
| FR-007 | El sistema debe degradarse graceful cuando el modelo no esté disponible: continuar sin sugerencias |
| FR-008 | La búsqueda debe considerar solo transacciones del usuario autenticado (Art. VI.1) |
| FR-009 | El embedding generado no debe contener información identificable del usuario más allá de la descripción textu (Art. VI.3) |
| FR-010 | El sistema debe reemplazar el Nivel 1 del cascade (keywords) por la búsqueda semántica |
| FR-011 | La latencia de la búsqueda semántica debe ser menor a 200ms en condiciones normales |
| FR-012 | El modelo de embeddings debe correr server-side, sin exponerlo al cliente |

## 5. Reglas de negocio

- **RN-001** — Cada transacción con descripción no vacía recibe exactamente un embedding. Las transacciones sin descripción no se codifican.
- **RN-002** — La búsqueda semántica filtra por el usuario actual: nunca devuelve resultados de otro usuario (Art. VI.1).
- **RN-003** — El score de confianza es la distancia coseno invertida (1 - distancia), en rango [0, 1]. Un score ≥ 0.7 se considera alta confianza.
- **RN-004** — Si hay menos de 3 transacciones en el historial del usuario, la búsqueda semántica se omite y se devuelve sin sugerencia.
- **RN-005** — El modelo se carga una sola vez al iniciar el servidor y queda en memoria. Si la carga falla, el sistema opera sin capacidades de encoding.
- **RN-006** — Las correcciones de categoría del usuario sobre sugerencias del encoder se registran en el log de categorización, igual que con el cascade actual (spec 002).
- **RN-007** — El embedding se genera a partir de la descripción normalizada (minúsculas, sin acentos, sin puntuación), usando la misma normalización que las keywords (spec 002).

## 6. Criterios de aceptación

1. Los 7 escenarios E1–E7 se ejecutan correctamente en pruebas automatizadas.
2. La latencia de búsqueda semántica (encoding + pgvector search) es menor a 200ms en el 95% de las consultas.
3. La precisión de categorización con el encoder es ≥ 85% en un conjunto de prueba de 100 descripciones comunes de finanzas personales en español.
4. Ninguna prueba de la suite requiere un modelo de lenguaje instalado (Art. IV).
5. Las pruebas de aislamiento (E7) verifican que la búsqueda nunca cruza usuarios.
6. La degradación (E6) se prueba con el modelo deshabilitado: el sistema funciona sin sugerencias.

## 7. Métricas de éxito

- ≥ 80% de las categorizaciones del registro rápido son correctas sin intervención del usuario (vs ~60% actual con keywords)
- ≤ 10% de transacciones caen a "Otros" por falta de categoría (vs ~25% actual)
- La latencia percibida del registro rápido no aumenta (menor a 200ms para la sugerencia)
- El asistente propone categorías correctas en ≥ 85% de las transacciones que describe el usuario

## 8. Riesgo conocido

- **Modelo genérico vs dominio:** El modelo `paraphrase-multilingual-MiniLM-L12-v2` fue entrenado para paraphrase detection, no para clasificación de finanzas. Puede fallar con descripciones muy específicas o ambiguas. Mitigación: el umbral de confianza filtra los malos resultados, y el usuario siempre puede corregir.
- **Primera ejecución sin historial:** Un usuario nuevo no tiene embeddings previos, así que el encoder no puede sugerir nada hasta que acumule ~5-10 transacciones. Mitigación: el sistema funciona igual que ahora ( keywords o LLM) hasta que haya suficiente historial.
- **Memoria del servidor:** El modelo ONNX consume ~120MB de RAM. En un servidor con poca memoria podría competir con otras processos. Mitigación: configurar un límite de memoria y deshabilitar el encoder si no hay suficiente.

## 9. Pendiente de aclaración

No hay ambigüedades abiertas. Las decisiones clave (modelo, dimensionalidad, almacenamiento, integración con el chat) están resueltas por el contexto del proyecto y las preferencias del usuario.
