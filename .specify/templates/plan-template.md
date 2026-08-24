# Plan técnico — Feature NNN

- **Spec:** [spec.md](./spec.md)
- **Creado:** [FECHA]
- **Valida contra:** constitución v[X.Y.Z], artículos [los que toca]

---

<!--
GUÍA PARA QUIEN RELLENA ESTA PLANTILLA — borrar este bloque al terminar.

El plan responde CÓMO. Aquí sí hay tecnología: esquema, contratos, migraciones,
límites. Lo que no hay es código; eso viene en la implementación.

Las secciones de abajo son un punto de partida, no un molde. Un plan de una
feature pequeña puede tener cuatro secciones y uno grande doce. Lo que **no** es
opcional son las dos últimas: la validación contra la constitución y lo que se
deja abierto.

Regla de oro de los planes de Serva: **empieza por la decisión que gobierna todo
lo demás.** Casi siempre hay una, y casi siempre es la que descarta la opción
evidente. Si no la nombras primero, el resto del plan se lee como una lista de
tareas en vez de como un diseño.

No se empieza a planificar con un [NECESITA ACLARACIÓN] abierto en la spec.
-->

## 1. La decisión que gobierna todo el diseño

[La opción evidente, por qué se descarta, y qué se hace en su lugar.

Si la alternativa descartada era más corta de escribir —normalmente lo es—, di
qué se compra con la diferencia. «Es más seguro» no basta: di contra qué fallo
concreto protege y cómo se comprobaría que protege.]

## 2. [Contratos / herramientas / interfaces]

[Qué expone esta feature y con qué forma. Si hay algo que el modelo de lenguaje
puede invocar, enumera el conjunto cerrado y sus parámetros: el Artículo III.3
exige que sea cerrado y tipado.]

## 3. Modelo de datos

[Tablas y columnas nuevas, con su tipo y su porqué. Para cada una:

  · ¿es anulable o tiene valor por defecto? Si no, la migración reescribe filas
  · ¿qué pasa con los datos que ya existen?
  · montos siempre en enteros de la unidad menor (Art. I)
  · fechas civiles cuando representan un día, no un instante

Recuerda: `drizzle-kit generate` produce un borrador, no una migración. Se lee
antes de aplicarla — ya ocurrió una vez que generara un ALTER sin USING.]

## 4. [La pieza crítica]

[Si la feature tiene una salvaguarda —algo que protege al usuario de un error del
sistema o del modelo—, aíslala aquí y hazla una función pura. Una salvaguarda que
vive dentro de un componente o de un prompt no se puede probar; una que es una
función con su tabla de verdad, sí.]

## 5. Degradación

[Qué pasa sin modelo, sin red, con una respuesta inválida o a medias. Cada
llamada define su comportamiento de degradación (Art. III.2): reintento,
alternativa por reglas, o dejar el campo vacío. Nunca cae la funcionalidad
entera por una respuesta mal formada.]

## 6. Verificación sin modelo

[**La sección que decide si la feature se puede mantener.** El Artículo IV exige
que `npm run verify` corra en cualquier máquina sin IA instalada.

Parte la feature en capas y di cuál necesita modelo:

| Capa | Qué se prueba | ¿Necesita modelo? |
|---|---|---|
| [...] | [...] | No / Sí |

Lo que necesite modelo va a un comando aparte y se verifica a mano, como se hizo
en D-057. Y resiste la tentación de meterlo en `verify` con un modelo simulado:
un simulador que devuelve la respuesta correcta no prueba el modelo, prueba el
simulador.]

## 7. Lo que este plan valida contra la constitución

| Artículo | Cómo se cumple |
|---|---|
| I — Dinero entero | [...] |
| II — La IA sugiere | [...] |
| III — Salida validada | [...] |
| IV — Verificabilidad | [...] |
| VI — Custodia | [...] |
| VII — Historial inmutable | [...] |

<!-- Solo los artículos que la feature toca. Si ninguno aplica, revisa: casi
     siempre aplica alguno, y creer que no es la señal de haberlo pasado por alto. -->

## 8. Lo que este plan deja abierto para `tasks.md`

- [Decisiones de orden, de aspecto o de detalle que no cambian el diseño]
