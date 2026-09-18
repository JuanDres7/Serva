# Tareas - Feature 012

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Actualizado:** 2026-08-25

**Leyenda:** ○ pendiente · ◉ en curso · ✓ hecha

---

## Fase 1 — Fundamentos de búsqueda

Las herramientas de escritura dependen de encontrar entidades por nombre. Sin búsqueda, no hay aporte, retiro, eliminación ni confirmación.

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-544 | Crear `buscarMetaPorNombre` en `lib/db/queries/goals.ts`: recibe userId + texto, normaliza, compara bidireccional con `name`, retorna `{ resultado: 'exacta' \| 'varias' \| 'ninguna', metas? }` | Test unitario: busca «viaje» contra meta «Viaje a Japón» → exacta; busca «carro» sin metas → ninguna + lista |
| ✓ T-545 | Crear `buscarRecurrentePorDescripcion` en `lib/db/queries/recurring.ts`: recibe userId + texto, normaliza, compara bidireccional con `description`, retorna `{ resultado: 'exacta' \| 'varias' \| 'ninguna', recurrentes? }` | Test unitario: busca «internet» contra «Internet monthly» → exacta; busca «luz» sin pendientes → ninguna |
| ✓ T-546 | Crear `buscarPresupuestoPorCategoria` en `lib/db/queries/budgets.ts`: recibe userId + texto del modelo, resuelve a clave de categoría usando la lista del prompt, retorna `{ resultado: 'exacta' \| 'ninguna', presupuesto? }` | Test unitario: busca «comida» → resuelve a `food` y encuentra; busca «viaje» (no es categoría) → ninguna |
| ✓ T-547 | Test de integración para las tres funciones de búsqueda en `tests/db/busqueda-entidades.test.ts`: prueba bidireccional, varias coincidencias, ninguna, y user isolation | Tests pasan contra BD real, cada usuario solo ve las suyas |

## Fase 2 — Herramientas de lectura (solo chat)

Lectura pura: no escriben nada. El modelo las llama para responder preguntas.

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-548 | [US1] Agregar tool `misMetas` en `lib/ai/tools.ts`: llama `listarMetas`, calcula estado y ritmo, retorna tabla con nombre, objetivo, aportado, porcentaje, falta, fechaEstimada | Llamada al chat con «¿cómo voy con las metas?» muestra tabla en el chat |
| ✓ T-549 | [US2] Agregar tool `misPresupuestos` en `lib/ai/tools.ts`: llama `presupuestosConGasto`, calcula estado, retorna categoría, tope, gastado, restante, nivel, díasRestantes. Verifica `cycleConfiguredAt` antes de ejecutar | Llamada al chat con «¿cómo van los presupuestos?» muestra tabla, o «configura tu ciclo» si no está configurado |
| ✓ T-550 | [US3] Agregar tool `misRecurrentes` en `lib/ai/tools.ts`: llama `listarRecurrentes` + `pendientesDeConfirmar`, retorna separados en pendientes y programados con descripción, monto, periodicidad, próximaFecha | Llamada al chat con «¿qué cobros tengo pendientes?» muestra lista |

## Fase 3 — Herramientas de escritura: metas

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-551 | [US1] Crear esquema `metaChatSchema` en `lib/ai/tools.ts`: `{ nombre: string 1-60, monto: number > 0, fecha?: string }`. Crear función `prepararMeta` que convierte monto a centavos, resuelve fecha, capitaliza nombre | Test unitario: monto 2000000 → 200000000 centavos; fecha «el martes» se resuelve; nombre «viaje a Japón» → «Viaje a Japón» |
| ✓ T-552 | [US1] Agregar tool `proponerMeta` en `lib/ai/tools.ts`: usa `metaChatSchema`, busca meta existente por nombre (T-544), si no existe prepara creación, pasa por `decidir()`, retorna propuesta con `propuestaId` | Crear meta desde chat produce fila en `savings_goals` con `created_by = 'ai'` |
| ✓ T-553 | [US1] Agregar tool `proponerAporteMeta` en `lib/ai/tools.ts`: busca meta por nombre (T-544), valida monto, valida retiro no exceda aportado, pasa por `decidir()`, retorna propuesta de aporte o retiro | Aportar produce transacción `type: 'saving'`, `direction: 'contribution'`; retirar produce `direction: 'withdrawal'` con nota de que registre el gasto aparte |
| ✓ T-554 | [US1] Agregar `proponerMeta` y `proponerAporteMeta` al switch de `components/chat-visuales.tsx`: ambos usan `TarjetaDeAccion` existente | La tarjeta aparece en el chat al confirmar creación de meta o aporte |

## Fase 4 — Herramientas de escritura: presupuestos

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-555 | [US2] Agregar tool `proponerPresupuesto` en `lib/ai/tools.ts`: resuelve categoría del texto a clave (T-546), valida que sea de gasto, valida monto, verifica ciclo configurado, pasa por `decidir()` | Crear presupuesto produce fila en `budgets` con el tope correcto |
| ✓ T-556 | [US2] Agregar tool `proponerEliminarPresupuesto` en `lib/ai/tools.ts`: busca por categoría (T-546), siempre confirma (destruir), retorna propuesta con `propuestaId` | Eliminar presupuesto borra la fila de `budgets` |
| ✓ T-557 | [US2] Agregar `proponerPresupuesto` y `proponerEliminarPresupuesto` al switch de `components/chat-visuales.tsx`: ambos usan `TarjetaDeAccion` | La tarjeta aparece en el chat al confirmar creación o eliminación de presupuesto |

## Fase 5 — Herramientas de escritura: recurrentes

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-558 | [US3] Crear función `resolverPeriodicidad` en `lib/domain/recurrence.ts`: traduce texto del modelo a `Periodicidad` soportada. «cada mes» → `{ kind: 'monthly', day }`, «semanal» → `{ kind: 'every-n-days', n: 7 }`, «quincenal» → `{ kind: 'every-n-days', n: 15 }`. Sin día → retorna `necesitaDia: true` | Test unitario: «cada mes el 5» → monthly/5; «semanal» → every-n-days/7; «cada mes» sin día → necesitaDia |
| ✓ T-559 | [US3] Agregar tool `proponerRecurrente` en `lib/ai/tools.ts`: resuelve periodicidad (T-558), resuelve categoría, valida monto y tipo, pasa por `decidir()`, retorna propuesta | Crear recurrente produce fila en `recurring_movements` con `nextDueOn` calculado correctamente |
| ✓ T-560 | [US3] Agregar tool `confirmarRecurrente` en `lib/ai/tools.ts`: busca por descripción (T-545) entre pendientes, acepta monto opcional y flag `permanente`, pasa por `decidir()`, retorna propuesta | Confirmar produce transacción en `transactions` y actualiza `nextDueOn` del recurrente |
| ✓ T-561 | [US3] Agregar `proponerRecurrente` y `confirmarRecurrente` al switch de `components/chat-visuales.tsx`: ambos usan `TarjetaDeAccion` | La tarjeta aparece en el chat al confirmar creación o confirmación de recurrente |

## Fase 6 — Persistencia y rehidratar

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-562 | Agregar casos en `lib/db/queries/assistant-writes.ts` para las nuevas propuestas: `aplicarCreacionMeta`, `aplicarAporteMeta`, `aplicarCreacionPresupuesto`, `aplicarEliminacionPresupuesto`, `aplicarCreacionRecurrente`, `aplicarConfirmacionRecurrente`. Cada una escribe en la tabla correspondiente y marca `created_by = 'ai'` | Cada función inserta/borra en la tabla correcta y el registro aparece en la UI correspondiente |
| ✓ T-563 | Agregar tipos de propuesta en `lib/ai/rehidratar.ts` para las nuevas herramientas: `meta`, `aporte-meta`, `presupuesto`, `eliminar-presupuesto`, `recurrente`, `confirmar-recurrente`. Cada tipo cruza con `assistant_writes.status` para mostrar estado correcto en tarjetas guardadas | Al volver a una conversación guardada, las tarjetas muestran «aplicada» o «propuesta» según el estado real |

## Fase 7 — Prompt del sistema

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-564 | Actualizar `lib/ai/chat-prompt.ts`: agregar instrucciones para las nuevas herramientas —cuándo usar cada una, que las metas no son gastos, que los presupuestos necesitan ciclo, que los recurrentes pueden confirmarse— | El modelo elige la herramienta correcta en los escenarios E1–E15 |

## Fase 8 — Tests

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-565 | Test de integración en `tests/db/tools-012.test.ts`: crear meta, aportar, retirar, listar metas; crear presupuesto, eliminar; crear recurrente, confirmar pendiente. Cada operación verifica la fila en BD | Todos los tests pasan contra BD real |
| ✓ T-566 | Test de dominio en `tests/domain/busqueda-entidades.test.ts`: tabla de verdad de `buscarYValidar` —exacta, varias, ninguna— para metas y recurrentes | Tests pasan sin BD ni modelo |
| ✓ T-567 | Test de degradación en `tests/db/tools-012.test.ts`: ciclo no configurado → presupuesto rechazado; meta no encontrada → lista opciones; monto inválido → rechazo Zod | Cada escenario de error produce el comportamiento esperado |

## Fase 9 — Cierre

| | Tarea | Criterio de verificación |
|---|---|---|
| ✓ T-568 | `npm run verify` en verde sin modelo instalado | Las comprobaciones actuales más las nuevas |
| ✓ T-569 | Ninguna spec queda desmentida por el código | Los requisitos que esta feature revoca (RN-005 de spec 006) están actualizados en su spec |
| ○ T-570 | Evaluación con modelo: correr escenarios E1–E15 contra el proveedor real (Gemini) y registrar resultado en `docs/decisiones.md` como D-078 o el siguiente número | 15/15 escenarios pasan, o se documenta cuáles fallan y por qué |

---

## Orden de ataque

La Fase 1 (búsqueda) es prerequisito de todo lo demás: sin ella, las herramientas de escritura no encuentran las entidades. Las Fases 2–5 son independientes entre sí después de la Fase 1, pero cada una depende de la Fase 6 (persistencia) para que las propuestas se puedan aplicar. La Fase 7 (prompt) puede hacerse en paralelo con cualquier fase.

```
Fase 1 (búsqueda)
  ├── Fase 2 (lectura metas) ──┐
  ├── Fase 3 (escritura metas)─┤
  ├── Fase 4 (presupuestos) ───┤── Fase 6 (persistencia) ── Fase 9 (cierre)
  ├── Fase 5 (recurrentes) ───┤
  └── Fase 7 (prompt) ────────┘
       └── Fase 8 (tests) ──────────────────────────────────┘
```

## Cierre de la feature

| # | Criterio de aceptación | Estado |
|---|---|---|
| 1 | Los quince escenarios E1–E15 se ejecutan correctamente | ○ |
| 2 | Crear una meta desde el chat produce fila en `savings_goals` con `created_by = 'ai'` | ○ |
| 3 | Aportar y retirar desde el chat crean transacciones `saving` con dirección correcta | ○ |
| 4 | La lista de metas desde el chat muestra el mismo progreso que la UI | ○ |
| 5 | Crear un presupuesto produce fila en `budgets` con el tope correcto | ○ |
| 6 | Eliminar un presupuesto lo borra de la tabla y de la UI | ○ |
| 7 | Confirmar un recurrente crea la transacción y actualiza `nextDueOn` | ○ |
| 8 | Con ciclo no configurado, ninguna operación de presupuesto se ejecuta | ○ |
| 9 | Ninguna herramienta expone datos de otro usuario (Art. VI.1) | ○ |
| 10 | Todo monto es entero en centavos (Art. I) | ○ |
| 11 | `npm run verify` pasa sin modelo instalado (Art. IV) | ○ |

## Lo que no se puede verificar sin ejecutar un modelo

Queda fuera de `verify` la **extracción correcta de entidades por el modelo**: que al decir «ahorra 200 mil para el viaje» el modelo llame `proponerAporteMeta` con los parámetros correctos, no `proponerMeta` o `proponerPresupuesto`. Eso se evalúa con `npm run evaluar` contra Gemini, como se hizo en D-057.

Lo que **sí** queda cubierto por `verify`: que una vez que la herramienta recibe los parámetros correctos, la escritura en BD es válida, la puerta de decisión decide bien, el monto es entero, el userId aísla los datos, y la tarjeta visual muestra el estado. Si el modelo elige mal la herramienta, el usuario ve un error claro; si elige bien, la operación se completa.
