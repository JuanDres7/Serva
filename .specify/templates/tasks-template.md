# Tareas — Feature NNN

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Actualizado:** [FECHA]

**Leyenda:** ⬜ pendiente · 🔄 en curso · ✅ hecha

<!--
GUÍA PARA QUIEN RELLENA ESTA PLANTILLA — borrar este bloque al terminar.

Cada tarea es atómica y trae **su criterio de verificación**. El criterio no es
«funciona»: es la frase que dice qué se observa, o el archivo de prueba que
falla si se rompe. Una tarea sin criterio comprobable no está lista para
escribirse; parte en dos o piensa qué se mira para saber que quedó.

Las fases se ordenan por dependencia, no por comodidad. Si una salvaguarda vive
en la feature, va en la fase 1 y va sola: escribirla al final significa
escribirla para que encaje con lo ya construido, en lugar de al revés.

Numeración: continúa la serie del proyecto, no reinicies en T-001. Mira el
número más alto usado en `specs/*/tasks.md`.

Si una tarea revela que la spec no contemplaba algo, se actualiza la spec y se
baja de nuevo. El código nunca es la fuente de verdad del comportamiento.
-->

---

## Fase 1 — [Nombre de la fase]

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-NNN | [Qué se construye] | [Qué se observa, o qué prueba falla si se rompe] |
| ⬜ T-NNN | [...] | [...] |

## Fase 2 — [...]

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-NNN | [...] | [...] |

## Fase N — Cierre

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-NNN | `npm run verify` en verde sin modelo instalado | Las comprobaciones actuales más las nuevas |
| ⬜ T-NNN | Ninguna spec queda desmentida por el código | Los requisitos que esta feature revoca están actualizados en su spec |

---

## Orden de ataque

[Qué fases son independientes y cuáles no. Si hay una que debe ir primera por
una razón que no es evidente, dila aquí: dentro de un mes nadie la recuerda.]

## Cierre de la feature

| # | Criterio de aceptación | Estado |
|---|---|---|
| 1 | [Copiado de la §6 de la spec] | ⬜ |
| 2 | [...] | ⬜ |

## Lo que no se puede verificar sin ejecutar un modelo

[Enumera lo que queda fuera de `verify` y por qué. Y di explícitamente qué **sí**
queda cubierto: normalmente lo que protege al usuario. Esa división es lo que
permite, el día que el modelo falle más de lo esperado, saber que lo que se rompe
son las métricas y no las salvaguardas.]
