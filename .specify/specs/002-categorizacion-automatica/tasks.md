# Tareas — Feature 002

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Actualizado:** 2026-08-23

**Leyenda:** ⬜ pendiente · 🔄 en curso · ✅ hecha

---

## Fase 1 — Dominio

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-101 | `keywords.ts`: normalizar texto y extraer términos con contenido | «Fui a la tienda y compré un cartón de leche» produce `leche`, `tienda`, `carton`; las palabras vacías desaparecen |
| ✅ T-102 | Descripción corta derivada del texto, sin modelo | Una frase larga produce una etiqueta breve y legible |

## Fase 2 — Capa de IA

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-103 | `schema.ts`: esquema Zod de la sugerencia, con categoría como enumerado | Una categoría inventada por el modelo es rechazada |
| ✅ T-104 | `provider.ts`: resolución del proveedor según configuración | Con `AI_PROVIDER=none` no se intenta ninguna llamada |
| ✅ T-105 | `prompt.ts`: construcción del mensaje con las categorías vigentes | El mensaje no contiene identificadores ni datos personales |
| ✅ T-106 | Llamada al modelo con validación y tiempo máximo de espera | Una respuesta que tarda más de 4 s se abandona sin error |

## Fase 3 — Aprendizaje

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-107 | Tabla `categorization_log` con sus índices | Ningún tipo de coma flotante salvo `confidence`, justificado en el plan |
| ✅ T-108 | Registro de cada categorización con todos los campos de D-015 | Tras categorizar, el historial conserva texto, propuesta, mecanismo y resultado |
| ✅ T-109 | Búsqueda por palabras clave sobre lo ya categorizado | Tras corregir «almuerzo» a Comidas fuera, una descripción equivalente recibe esa categoría |
| ✅ T-110 | Aislamiento del aprendizaje entre usuarios | Lo que aprende una cuenta no influye en las sugerencias de otra |

## Fase 4 — La cascada

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-111 | `categorize.ts`: cascada de niveles con umbral de confianza | Con coincidencia por palabras clave, el modelo no se invoca |
| ✅ T-112 | Degradación ante cualquier fallo del modelo | Con proveedor apagado, inválido o lento, el registro procede sin categoría |
| ✅ T-113 | Medición del acierto sobre un conjunto de prueba | El porcentaje se calcula y se puede comparar entre ejecuciones |

## Fase 5 — Interfaz

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-114 | Sugerencia al salir del campo de descripción | La categoría aparece elegida sin que el usuario abra el desplegable |
| ✅ T-115 | Marca visible de que la categoría la propuso el sistema | Se distingue de una elegida por el usuario |
| ✅ T-116 | La elección manual del usuario nunca se pisa | Tras elegir a mano, una sugerencia posterior no la cambia |
| ✅ T-117 | Registro de la corrección cuando el usuario cambia la sugerencia | El movimiento queda marcado como corregido por el usuario |

## Fase 6 — Cierre

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-118 | Escenarios E1–E7 de la spec de extremo a extremo | Pasan en `npm run verify` sin ningún modelo instalado |
| ✅ T-119 | Revisión contra los siete criterios de aceptación | Todos verificados automáticamente donde corresponde |

---

## Reglas del loop para esta feature

1. **Ninguna prueba puede requerir un modelo instalado.** Se usa un proveedor
   controlado que devuelve lo que la prueba necesite.
2. **La categorización es una comodidad, no un requisito.** Cualquier tarea que
   haga fallar el registro cuando la IA falla está mal hecha.
3. **Prohibido debilitar una aserción** para que una tarea pase (Art. IV.4).


---

## Cierre de la feature (T-119)

| # | Criterio de aceptación | Dónde se verifica |
|---|---|---|
| 1 | Los siete escenarios E1–E7 | `tests/e2e/categorizacion.spec.ts` |
| 2 | Medición automática del acierto | `estadisticasAcierto` y `tests/db/learning.test.ts` |
| 3 | Una respuesta mal formada no rompe el registro | `tests/domain/categorize.test.ts` |
| 4 | Con el modelo apagado, registrar sigue siendo posible | E2E completo, que corre sin ningún modelo |
| 5 | Tras corregir, una descripción equivalente recibe la corrección | `tests/db/learning.test.ts` y E2 de extremo a extremo |
| 6 | El historial conserva todos los campos de D-015 | `tests/db/learning.test.ts` |
| 7 | Cambiar de proveedor no toca código ajeno a esa capa | `lib/ai/provider.ts` resuelve por configuración |

**Estado:** 228 comprobaciones en verde (201 de dominio y datos, 27 de navegador),
ninguna de las cuales requiere un modelo instalado.

### Pendiente para más adelante

- **Nivel 2 de la cascada** (similitud por significado): aplazado por D-044. La
  interfaz y el registro ya lo contemplan; falta decidir proveedor de vectores.
- **Verificación contra un modelo real**: las pruebas cubren la cascada y la
  degradación, pero la calidad de lo que responde Ollama o Gemini solo se puede
  evaluar ejecutándolos.
