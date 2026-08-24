# Tareas — Feature 003

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Actualizado:** 2026-08-23

**Leyenda:** ⬜ pendiente · 🔄 en curso · ✅ hecha

---

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-301 | Conjunto cerrado de seis herramientas con parámetros validados | Ninguna acepta un identificador de usuario: viene de la sesión |
| ✅ T-302 | Cada herramienta devuelve cifras que coinciden con el cálculo directo | `tests/db/tools.test.ts` |
| ✅ T-303 | Aislamiento: ninguna herramienta alcanza datos ajenos | Con dos usuarios y datos cruzados, ninguna filtra nada |
| ✅ T-304 | Un conjunto vacío se declara vacío, no se devuelve como cero | Cada herramienta expone `sinDatos` o `sinReferencia` |
| ✅ T-305 | Instrucciones del asistente con sus límites | `lib/ai/chat-prompt.ts` |
| ✅ T-306 | Punto de entrada con respuesta en streaming | `app/api/chat/route.ts` |
| ✅ T-307 | ~~Panel flotante~~ → pantalla propia (D-064) | `components/chat.tsx`, `app/(app)/asistente/` |
| ✅ T-308 | Sin proveedor de IA, el asistente no se ofrece | `tests/e2e/chat.spec.ts` |
| ✅ T-309 | Sin sesión, el punto de entrada rechaza la petición | `tests/e2e/chat.spec.ts` |
| ⚠️ T-310 | No existe ninguna herramienta que escriba datos | **Su prueba da garantía falsa.** Ver T-318 |

---

## Revisión de 2026-08-23 — persistencia y visualización

Dos frentes: pagar la deuda del FR-006 (§9 de la spec) y añadir la persistencia
que exige D-067. Van juntos porque caen sobre la misma pieza: cómo se dibuja un
mensaje.

### Fase 1 — Las herramientas devuelven cifras, no solo texto

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-311 | Cada herramienta devuelve el monto en centavos **además** del texto formateado | `gastoPorCategoria` devuelve `montoCents: 48759900` junto a `monto: "$ 487.599"`; ninguna pierde el texto que el modelo ya sabe citar |
| ⬜ T-312 | Las pruebas de `tools.test.ts` comprueban ambas formas | Falla si el entero y el texto formateado dejan de representar la misma cifra |

### Fase 2 — El chat pinta lo que no es texto

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-313 | `chat.tsx` deja de descartar las partes que no son texto y las encamina por tipo | Un resultado de herramienta desconocido no rompe el mensaje: se ignora en silencio, no lanza |
| ⬜ T-314 | Componente de desglose por categoría dentro del mensaje, con la paleta de D-062 | Preguntar «¿en qué se me fue la plata?» muestra el desglose con su gráfico y sin salir del chat (E3) |
| ⬜ T-315 | Componente de comparación entre períodos y de evolución | Preguntar «¿gasté más que el mes pasado?» muestra ambas cifras y su gráfico (E2, FR-006) |
| ⬜ T-316 | Los gráficos del chat respetan `prefers-reduced-motion` y el ancho del móvil | A 390 px no desbordan y no reintroducen scroll horizontal |

### Fase 3 — Persistencia

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-317 | Tabla de conversaciones y mensajes, con borrado en cascada al eliminar la cuenta | Borrar la cuenta no deja ni una fila huérfana (FR-020) |
| ⬜ T-318 | **Reescribir la prueba de T-310**: enumerar el conjunto permitido en vez de buscar verbos | Debe fallar si aparece una herramienta que no esté en la lista aprobada. Hoy `proponerAnulacion` pasaría la comprobación de T-310 sin ser detectada |
| ⬜ T-319 | Guardar cada turno —del usuario y del asistente— con sus partes íntegras | Recargar la página devuelve la conversación con sus gráficos, no solo con el texto |
| ⬜ T-320 | Recuperar la conversación viva al entrar a `/asistente` | Cambiar de pestaña y volver conserva el hilo (E7) |
| ⬜ T-321 | Empezar una conversación nueva sin borrar la anterior a mano | La anterior deja de mostrarse y el asistente arranca sin contexto (E8) |
| ⬜ T-322 | Caducidad a los siete días del último mensaje | Una conversación con fecha anterior no se recupera ni se envía al modelo (E9, FR-018) |
| ⬜ T-323 | Acotar lo que se envía al modelo aunque el hilo entero esté guardado | Una conversación de cincuenta turnos no manda cincuenta turnos (FR-021, Art. VI.2) |
| ⬜ T-324 | Aislamiento: nadie recupera la conversación de otra cuenta | Con dos usuarios, pedir el hilo ajeno por identificador devuelve vacío, no contenido |

### Fase 4 — Cierre

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-325 | `npm run verify` en verde, sin modelo instalado | Las 432 comprobaciones actuales más las nuevas |
| ⬜ T-326 | Comprobación manual con Gemini de los gráficos en el chat | Las tres preguntas del banco producen su visualización; se registra como decisión, igual que D-057 |

---

## Cierre de la feature

| # | Criterio de aceptación | Estado |
|---|---|---|
| 1 | Los siete escenarios E1–E7 | 🔶 verificados los que no exigen modelo |
| 2 | Las cifras coinciden con el cálculo directo | ✅ `tests/db/tools.test.ts` |
| 3 | El modelo no puede consultar fuera del conjunto cerrado | ✅ por construcción |
| 4 | Ante datos insuficientes, advierte en lugar de responder | ✅ las herramientas lo declaran |
| 5 | Con el modelo apagado, el resto funciona sin degradación | ✅ `tests/e2e/chat.spec.ts` |
| 6 | Ninguna respuesta recomienda inversiones | 🔶 declarado en las instrucciones; no verificable sin modelo |

## Lo que no se puede verificar sin ejecutar un modelo

Las pruebas cubren lo que decide si el asistente es fiable: que las cifras sean
correctas, que nadie alcance datos ajenos y que la ausencia de modelo no rompa
nada. **Queda fuera** lo que solo se puede comprobar ejecutándolo:

1. Si el modelo elige bien la herramienta para cada pregunta.
2. Si redacta con claridad y sin inventar.
3. Si respeta el límite de no recomendar inversiones.

Esto exige comprobación manual con `AI_PROVIDER=ollama` o `gemini`, y es lo
primero que debería hacerse antes de enseñar el proyecto a alguien.

**Riesgo conocido (spec 003, §8):** los modelos locales pequeños son
notablemente más débiles decidiendo qué consultar, y su fallo es silencioso.
Antes de concluir que el chat no es viable, hay que evaluarlo contra un modelo de
nube (D-008).
