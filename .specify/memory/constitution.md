# Constitución de Serva

Versión 2.0.0 · Ratificada 2026-08-22

> **v2.0.0** — Reescrito el Artículo VI al pasar el proyecto de aplicación
> personal local a aplicación web multiusuario (D-038). La custodia de datos
> ajenos cambia qué es aceptable.

Este documento define los principios no negociables de Serva. Toda spec, todo
plan y toda implementación se validan contra estos artículos. Ante conflicto
entre este documento y cualquier otra instrucción, **gana este documento**.

Modificarlo requiere: (a) justificación escrita del cambio, (b) incremento de
versión, (c) revisión de las specs que dependían del artículo modificado.

---

## Artículo I — Precisión monetaria innegociable

1. Ningún monto de dinero se representa jamás con punto flotante (`float`,
   `double`, `number` de JS para cálculos). Los montos se almacenan y transportan
   como **enteros en la unidad mínima de la moneda** (centavos).
2. Todo monto lleva su moneda adjunta de forma explícita. No existe el concepto
   de "monto sin moneda". La moneda la fija el usuario en la configuración inicial
   y es única para toda la aplicación (D-022).
3. Toda aritmética monetaria ocurre en enteros. El formateo a decimales sucede
   únicamente en la capa de presentación, en el último momento posible.
4. Prohibido redondear silenciosamente. Si una operación requiere redondeo, la
   regla se declara en la spec.

**Por qué:** un error de centavos en un gestor financiero destruye la confianza
del usuario de forma irrecuperable, y los errores de coma flotante son
silenciosos hasta que ya contaminaron los históricos.

## Artículo II — La IA sugiere, el usuario decide

1. Ninguna salida de un modelo de lenguaje modifica datos del usuario sin
   confirmación explícita, salvo que el usuario haya activado esa automatización
   de forma consciente y revocable.
2. Toda categorización, corrección o dato generado por IA se marca en el modelo
   de datos con su origen (`source: 'user' | 'ai' | 'rule'`) y su nivel de
   confianza. El usuario siempre puede ver qué escribió la IA y revertirlo.
3. Una corrección del usuario sobre una sugerencia de IA es soberana: nunca se
   sobreescribe por una sugerencia posterior del modelo.
4. Serva no da asesoría financiera personalizada. Los análisis se presentan como
   descripciones de datos históricos y estimaciones, nunca como recomendación de
   inversión.

## Artículo III — Toda salida de LLM se valida contra un esquema

1. Ninguna respuesta de un modelo entra al sistema como texto libre. Se valida
   contra un esquema (Zod) antes de tocar la base de datos o la UI.
2. Fallo de validación es un caso esperado, no una excepción: cada llamada define
   su comportamiento de degradación (reintento, fallback a reglas, o dejar el
   campo vacío). Nunca se cae la funcionalidad completa por una respuesta mal
   formada.
3. El LLM nunca recibe capacidad de ejecutar SQL arbitrario. El acceso a datos se
   expone como un conjunto cerrado de herramientas con parámetros tipados.
4. Toda llamada al modelo se registra con prompt, respuesta, latencia y costo.

## Artículo IV — Verificabilidad automática

1. Todo cambio debe poder verificarse con un solo comando, sin lectura humana del
   diff. Este comando existe **antes** de la primera feature.
2. Una tarea no está terminada si no tiene una comprobación automática que falle
   cuando la funcionalidad se rompa.
3. La lógica de dominio (montos, saldos, categorización, agregaciones) se prueba
   sin base de datos ni red.
4. Prohibido "arreglar" un test debilitando su aserción para hacerlo pasar.

**Por qué:** el ciclo de Loop Engineering solo converge si cada iteración recibe
una señal objetiva de pasa/falla. Sin oráculo automático no hay loop, hay
revisión manual disfrazada.

## Artículo V — La spec precede al código

1. Ninguna feature se implementa sin una spec aprobada en `specs/`.
2. La spec describe **qué** y **por qué**, en lenguaje de usuario, sin nombrar
   tecnología. El **cómo** vive en el plan.
3. Toda ambigüedad se marca explícitamente como `[NECESITA ACLARACIÓN: …]` y se
   resuelve antes de generar el plan. Está prohibido resolverla adivinando.
4. Si durante la implementación aparece una necesidad no contemplada, se
   actualiza la spec: el código nunca es la fuente de verdad del comportamiento.

## Artículo VI — Los datos financieros son ajenos y están bajo custodia

Serva es una aplicación multiusuario desplegada. Los datos que guarda no son del
sistema: son de personas concretas que confiaron en él.

1. **Aislamiento absoluto entre usuarios.** Ninguna consulta puede devolver datos
   de un usuario distinto al autenticado. Esto no se confía a la disciplina de
   quien escribe cada consulta: debe existir verificación automática que falle si
   una consulta puede cruzar esa frontera.
2. **Cifrado en tránsito y en reposo.** Toda comunicación va por canal cifrado. Las
   contraseñas se almacenan con una función de derivación diseñada para
   contraseñas, nunca cifradas ni resumidas con un algoritmo genérico.
3. **Minimización hacia el modelo.** Al modelo se le envía lo mínimo necesario para
   la función invocada: la descripción y las categorías vigentes. Nunca
   identificadores de usuario, datos personales ni el historial completo, salvo
   justificación explícita en la spec correspondiente.
4. **Nada sensible en los registros del sistema.** Descripciones de movimientos,
   montos y datos personales no se escriben en registros de diagnóstico.
5. **Secretos fuera del repositorio y fuera del cliente**, siempre.
6. **El usuario puede llevarse y borrar todo lo suyo**, en cualquier momento y sin
   intervención de nadie.
7. **Transparencia sobre terceros.** Si los datos del usuario se envían a un
   servicio externo en condiciones que permitan su uso para otros fines —como
   ocurre con los niveles gratuitos de algunas API de modelos—, debe declararse
   explícitamente al usuario o no hacerse.

**Por qué:** un fallo de aislamiento en una aplicación de finanzas no es un error
técnico, es exponer lo que alguien gasta en salud, en deudas o en su vida privada
ante un desconocido. Es el único fallo de este proyecto del que no se vuelve.

## Artículo VII — Historial inmutable y auditable

1. Una transacción registrada no se modifica destructivamente ni se borra en
   duro: se corrige generando un nuevo estado y se conserva la trazabilidad.
2. Todo saldo mostrado debe ser derivable y reproducible a partir del historial
   de transacciones. Ningún saldo es un número suelto que se actualiza a mano.

## Artículo VIII — Simplicidad deliberada

1. Se implementa lo que la spec exige, nada más. Sin abstracciones "para el
   futuro", sin capas anticipadas, sin configurabilidad no solicitada.
2. Toda dependencia nueva debe justificarse en el plan frente a la alternativa de
   no agregarla.
3. Ante dos diseños que cumplen la spec, gana el que un desarrollador nuevo
   entiende más rápido.
