# Spec NNN — [NOMBRE DE LA FEATURE]

- **Estado:** borrador
- **Creada:** [FECHA]
- **Depende de:** [features previas, o «ninguna»]
- **Decisiones aplicables:** [D-NNN, D-NNN…]

---

<!--
GUÍA PARA QUIEN RELLENA ESTA PLANTILLA — borrar este bloque al terminar.

Formato de la casa. Las specs de Serva se escriben así desde la 001 y se lee un
conjunto coherente; no cambies la estructura sin una razón, y si la cambias,
cámbiala en la plantilla para las siguientes.

En español, y sin tecnología. Esta spec responde QUÉ y POR QUÉ. El cómo va en
`plan.md`: nada de stack, tablas, endpoints ni nombres de archivo.

Equivalencias con los pasos de Spec Kit, por si vienes de sus instrucciones:

  User Scenarios & Testing  → §3 Escenarios
  Functional Requirements   → §4 Requisitos funcionales
  Key Entities              → §5 Reglas de negocio, o una §  propia si hace falta
  Success Criteria          → §6 Criterios de aceptación y §7 Métricas de éxito
  Assumptions               → §8 Riesgo conocido, o §9 si son preguntas abiertas
  [NEEDS CLARIFICATION]     → [NECESITA ACLARACIÓN — etiqueta]

**La puerta de control:** no se pasa a `plan.md` mientras quede un
[NECESITA ACLARACIÓN] sin resolver. Ese marcador es lo que impide inventar
requisitos. Máximo tres, y solo para decisiones donde equivocarse cambia el
producto: alcance, privacidad, o algo que el usuario tendría que deshacer a mano.
Para lo demás, elige el valor razonable y anótalo en §8.

Toda spec se valida contra `.specify/memory/constitution.md`, que gana ante
cualquier cosa escrita aquí.
-->

## 1. Contexto y motivación

[Qué problema real resuelve, en las palabras de quien lo sufre. Si no se puede
nombrar a quién le duele y cuándo, la feature no está lista para escribirse.

Si esta feature cambia algo que otra spec ya declaró, dilo aquí y nombra el
requisito que queda revocado. Una spec desmentida en silencio por otra es peor
que una spec sin escribir.]

## 2. Alcance

### Dentro

- [Lo que esta feature hace, en frases que el usuario reconocería]

### Fuera

- [Lo que deliberadamente no hace, y a qué feature futura pertenece si aplica]
- [Lo que la constitución prohíbe, con el artículo]

## 3. Escenarios

### E1 — [Título corto y concreto]

**Dado** que [situación de partida],
**cuando** [lo que hace la persona],
**entonces** [lo que observa, en términos verificables].

### E2 — [...]

<!--
Cubre siempre, además del camino feliz:
  · qué pasa cuando falta un dato
  · qué pasa cuando el usuario se equivoca
  · qué pasa cuando el modelo o la red no están disponibles
Un escenario que no se puede convertir en prueba está mal escrito.
-->

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | [El sistema debe… — comprobable, sin decir cómo] |
| FR-002 | [...] |

## 5. Reglas de negocio

- **RN-001** — [Invariante que se cumple siempre, independiente de la pantalla]
- **RN-002** — [...]

## 6. Criterios de aceptación

1. Los N escenarios E1–EN se ejecutan correctamente.
2. [Criterio comprobable automáticamente]
3. Ninguna prueba de la suite requiere un modelo instalado (Art. IV).

## 7. Métricas de éxito

- [Cómo se sabrá, mirando el producto en uso, que esto salió bien]
- [Y el umbral a partir del cual habría que revisar el diseño]

## 8. Riesgo conocido

[Lo que puede salir mal y no se detecta solo. Los supuestos que se asumieron sin
poder confirmarlos. Si el mayor riesgo es que la feature acierte casi siempre y
nadie la revise, dilo: es el más difícil de ver después.]

## 9. Pendiente de aclaración

<!-- Borrar esta sección cuando no quede ninguna. Con una sola abierta, la spec
     no baja a plan.md. -->

- **[NECESITA ACLARACIÓN — etiqueta corta]** [La pregunta, y por qué las
  respuestas posibles llevan a productos distintos.]
