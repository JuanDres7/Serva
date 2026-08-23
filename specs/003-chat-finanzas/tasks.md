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
| ✅ T-307 | Panel flotante, sin sacar al usuario de donde está | `components/chat-panel.tsx` |
| ✅ T-308 | Sin proveedor de IA, el asistente no se ofrece | `tests/e2e/chat.spec.ts` |
| ✅ T-309 | Sin sesión, el punto de entrada rechaza la petición | `tests/e2e/chat.spec.ts` |
| ✅ T-310 | No existe ninguna herramienta que escriba datos | Prueba que recorre los nombres y falla si aparece una de escritura |

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
