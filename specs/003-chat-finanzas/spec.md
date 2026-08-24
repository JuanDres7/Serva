# Spec 003 — Chat sobre tus finanzas

- **Estado:** aprobada
- **Creada:** 2026-08-22
- **Depende de:** 001 y 002 (necesita historial categorizado)
- **Decisiones aplicables:** D-002, D-008, D-011, D-019, D-025, D-034, D-064
- **Revisada:** 2026-08-23 — D-064 sustituye el panel flotante por una pantalla propia

---

## 1. Contexto y motivación

Es el diferenciador del producto (D-002). El problema de las aplicaciones de
finanzas no es guardar datos, sino que el usuario no los alcanza: para responder
*"¿gasté más este mes que el pasado?"* hay que saber qué pantalla abrir, qué filtro
aplicar y cómo leer el resultado.

Aquí se invierte la relación: el usuario pregunta en su idioma y la respuesta llega
calculada sobre su propio historial. La conversación reemplaza a la navegación, y
por eso Serva AI ocupa una pantalla entera y no un recuadro en una esquina
(D-064).

## 2. Alcance

### Dentro

- Pantalla propia de Serva AI, con entrada permanente en la navegación.
- Preguntas en lenguaje natural sobre movimientos, totales, categorías y períodos.
- Respuestas calculadas sobre datos reales, acompañadas de visualizaciones cuando
  ayuden.
- Acceso a los datos mediante un conjunto cerrado de consultas predefinidas.
- Comportamiento definido ante preguntas que no se pueden responder.

### Fuera

- Exposición de los datos a clientes externos (D-019).
- Que el chat registre, modifique o anule movimientos. Solo consulta.
- Asesoría financiera personalizada (Art. II.4).
- Observaciones automáticas no solicitadas: requieren meses de datos (D-035).
- Información traída de páginas web externas.

## 3. Escenarios

### E1 — Pregunta directa

**Dado** que tengo movimientos registrados,
**cuando** pregunto "¿cuánto gasté en comidas fuera este mes?",
**entonces** recibo la cifra exacta calculada sobre mi historial, con el período al
que corresponde.

### E2 — Comparación entre períodos

**Dado** que llevo varios períodos registrando,
**cuando** pregunto "¿gasté más que el mes pasado?",
**entonces** recibo ambas cifras, la diferencia y el porcentaje de variación.

### E3 — Respuesta con visualización

**Dado** que pregunto "¿en qué se me fue la plata este mes?",
**cuando** el sistema responde,
**entonces** la respuesta incluye el desglose por categoría acompañado de su
gráfico, sin que yo tenga que ir a otra pantalla.

### E4 — Consejo basado en mis datos

**Dado** que pregunto "¿cómo puedo ahorrar más?",
**cuando** el sistema responde,
**entonces** señala mis categorías de mayor gasto con cifras concretas y cuánto
representaría reducirlas, sin recomendarme productos financieros ni inversiones.

### E5 — Pregunta que no se puede responder

**Dado** que pregunto algo que los datos no permiten contestar,
**cuando** el sistema lo detecta,
**entonces** me dice que no puede responder eso y por qué, en lugar de inventar una
cifra.

### E6 — Datos insuficientes

**Dado** que llevo tres días usando la aplicación,
**cuando** pregunto por tendencias o comparaciones entre períodos,
**entonces** el sistema me indica que aún no hay historial suficiente, en vez de
responder sobre una muestra que no significa nada.

### E7 — El modelo no está disponible

**Dado** que el modelo no responde,
**cuando** envío una pregunta,
**entonces** recibo un aviso claro de que el asistente no está disponible, y el
resto de la aplicación sigue funcionando con normalidad.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | Serva AI debe tener una pantalla propia, alcanzable desde la navegación con ese nombre, que ocupe el alto disponible y mantenga el campo de escritura visible mientras se lee la conversación (D-064). |
| FR-002 | El sistema debe responder preguntas sobre montos, totales, categorías, períodos y comparaciones, calculadas sobre el historial real del usuario. |
| FR-003 | Toda cifra de una respuesta debe provenir de una consulta a los datos. El modelo no puede calcular ni estimar cifras por su cuenta. |
| FR-004 | El acceso a los datos debe realizarse mediante un conjunto cerrado de consultas con parámetros tipados. El modelo nunca ejecuta consultas arbitrarias (Art. III.3). |
| FR-005 | Los parámetros que el modelo propone para cada consulta deben validarse antes de ejecutarla. |
| FR-006 | Las respuestas deben incluir visualizaciones cuando la pregunta sea sobre distribución, evolución o comparación. |
| FR-007 | El sistema debe indicar a qué período corresponde cada cifra que reporta. |
| FR-008 | Ante una pregunta que no puede responder con los datos disponibles, el sistema debe decirlo explícitamente y explicar por qué. |
| FR-009 | Cuando el historial sea insuficiente para una comparación o tendencia, el sistema debe advertirlo en lugar de responder. |
| FR-010 | El chat no debe poder crear, modificar ni anular movimientos. Es de solo lectura. |
| FR-011 | El sistema no debe recomendar productos financieros, inversiones ni decisiones de inversión. Las sugerencias de ahorro se limitan a describir el gasto propio del usuario. |
| FR-012 | Si el modelo no está disponible o falla, el chat debe informarlo sin afectar al resto de la aplicación. Sin proveedor configurado, la sección no debe ofrecerse en la navegación. |
| FR-013 | El usuario debe poder ver la conversación anterior mientras permanezca en la pantalla del asistente. |
| FR-014 | El proveedor del modelo debe poder cambiarse por configuración (D-008). |
| FR-015 | Cada consulta al modelo debe registrarse con su entrada, su salida, su latencia y su costo. |
| FR-016 | Debe enviarse al modelo únicamente lo necesario para resolver la pregunta, nunca el historial completo por defecto (Art. VI.2). |

## 5. Reglas de negocio

- **RN-001** — El modelo decide *qué* consultar y cómo redactar la respuesta. Los
  números los produce siempre el sistema, nunca el modelo.
- **RN-002** — Si una consulta devuelve un conjunto vacío, la respuesta lo refleja
  como ausencia de datos, nunca como un cero calculado.
- **RN-003** — Los movimientos anulados y los de tipo ahorro se excluyen de los
  cálculos de gasto, igual que en el resto del sistema (RN-003 de la spec 001).
- **RN-004** — Serva describe y estima; no aconseja qué hacer con el dinero
  (Art. II.4).
- **RN-005** — El chat opera sobre el ciclo configurado del usuario, no sobre el
  mes calendario, cuando ambos difieran (D-025).

## 6. Criterios de aceptación

1. Los siete escenarios E1–E7 se ejecutan correctamente.
2. Existe un conjunto de preguntas de prueba con respuestas conocidas, verificable
   automáticamente, que falla si alguna cifra no coincide con el cálculo directo
   sobre los datos.
3. El modelo no puede, por construcción, ejecutar una consulta fuera del conjunto
   cerrado ni con parámetros no validados.
4. Ante una pregunta sin datos suficientes, el sistema advierte en lugar de
   responder con cifras.
5. Con el modelo apagado, el resto de la aplicación funciona sin degradación.
6. Ninguna respuesta del sistema recomienda inversiones ni productos financieros.

## 7. Métricas de éxito

- El usuario obtiene una respuesta útil sin tocar un filtro ni construir una consulta.
- Cero cifras incorrectas en las respuestas: toda cifra reportada coincide con el
  cálculo directo sobre el historial.
- El usuario descubre algo sobre sus gastos que no sabía antes de preguntar.

## 8. Riesgo conocido

Los modelos locales pequeños son notablemente más débiles decidiendo *qué* consulta
hacer y con qué parámetros, y su fallo es silencioso: responden con seguridad sobre
datos incorrectos. Antes de concluir que alguna capacidad de esta feature no es
viable, debe evaluarse contra un modelo de nube (D-008). La arquitectura de
consultas cerradas y validación de parámetros existe precisamente para acotar el
daño de esos fallos.
