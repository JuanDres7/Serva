# Tareas — Feature 010

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Creado:** 2026-08-23

**Leyenda:** ⬜ pendiente · 🔄 en curso · ✅ hecha

> **No se empieza hasta cerrar la revisión de la spec 003** (T-311 a T-326). La
> tarjeta de confirmación es una parte de mensaje y una fila persistida: sin eso
> construido, se escribe dos veces y la segunda tirando la primera (plan §10).

---

## Fase 1 — La puerta

Primero, y sin base de datos ni modelo de por medio. Es la pieza que hace
falsable el Artículo II, y todo lo demás se apoya en ella.

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-401 | `lib/domain/puerta.ts`: `decidir()` con las cinco reglas en su orden | Función pura, sin `import` de base de datos ni de red |
| ✅ T-402 | Tabla de verdad completa en vitest | Las ~20 combinaciones de tipo × cantidad × activación, cada una con su resultado esperado |
| ✅ T-403 | Lo destructivo confirma incluso con el automático puesto | `corregir` y `anular` devuelven `confirmar` con `automaticoActivo: true` y `cuantos: 1` |
| ✅ T-404 | Más de cinco se rechaza; más de tres confirma | El límite de FR-021 y el de FR-022 se comprueban por separado |

## Fase 2 — Modelo de datos

| | Tarea | Criterio de verificación |
|---|---|---|
| ✅ T-405 | Enums `movement_origin`, `assistant_write_kind`, `assistant_write_status` | `revertida` y `caducada` presentes desde el principio |
| ✅ T-406 | Columnas `createdBy` y `assistantWriteId` en `transactions` | Migración leída a mano antes de aplicarla; los movimientos existentes quedan como `'user'` |
| ✅ T-407 | Tabla `assistant_writes` con su índice por usuario y estado | Ningún tipo de coma flotante salvo `confidence`, igual que en `categorization_log` |
| ✅ T-408 | `autoRegisterEnabledAt` en `user_settings` | Anulable; una cuenta existente queda con el automático apagado |
| ✅ T-409 | Periodicidad `once` en `Periodicidad`, y `archivedAt` en recurrentes | TypeScript señala todos los `switch` que no contemplan el caso nuevo |
| ✅ T-410 | Un `once` confirmado se archiva, no se reprograma ni se borra | Tras confirmarlo deja de aparecer entre pendientes y su fila sigue existiendo (Art. VII) |

## Fase 3 — Extracción

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-411 | Esquema Zod de la propuesta: monto entero positivo, fecha, categoría del conjunto cerrado | Una categoría inventada, un monto con decimales en moneda sin decimales o un monto cero son rechazados |
| ⬜ T-412 | Conversión de unidades corrientes a la unidad menor con `currencyDecimals` | El modelo devuelve `18000`; en pesos colombianos se guardan `1800000` centavos, sin coma flotante en ningún paso |
| ⬜ T-413 | Resolución de fechas contra `todayIn(timeZone)` del usuario | «Ayer» a las 19:30 de Bogotá resuelve al día correcto y no al de UTC |
| ⬜ T-414 | «El martes» resuelve al próximo martes futuro | Dicho un martes, resuelve al siguiente, no a hoy |
| ⬜ T-415 | Sin monto no hay propuesta: se devuelve la petición de dato | «Me tomé unas cervezas» no produce ninguna fila ni ningún cero (E2, FR-003) |

## Fase 4 — Las herramientas

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-416 | `proponerMovimientos`, ligada al usuario por cierre | No acepta identificador de usuario como parámetro |
| ⬜ T-417 | `proponerCorreccion` y `proponerAnulacion` resuelven el movimiento por búsqueda del sistema | El modelo nunca envía un UUID; si hay varias candidatas, la propuesta las lista |
| ⬜ T-418 | Encaminar por fecha: pasado a `transactions`, futuro a `recurringMovements` | «Pagar 200 mil el 7 de septiembre» no crea un movimiento con fecha futura (E5) |
| ⬜ T-419 | Ampliar la lista permitida de T-318 a nueve herramientas | La prueba falla si aparece una décima sin aprobar |
| ⬜ T-420 | `stopWhen` sube a 5 pasos | Un turno puede proponer, escribir y consultar después (FR-020) |
| ⬜ T-421 | Prompt reescrito: qué puede hacer y que el monto se pregunta | Deja de declarar «solo consultas»; la spec 003 FR-010 se actualiza en el mismo cambio |

## Fase 5 — Ejecución y puerta de confirmación

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-422 | Persistir la propuesta antes de mostrarla | La acción de confirmación recibe un identificador, nunca un cuerpo de movimientos |
| ⬜ T-423 | Ejecutar una propuesta: escribe y marca origen y `assistantWriteId` | El movimiento resultante es rastreable hasta la frase que lo originó (FR-011) |
| ⬜ T-424 | Cada movimiento se evalúa por separado | «20 mil de almuerzo, 5 mil de bus y unas cervezas» registra dos y pregunta por el tercero (E11, FR-018) |
| ⬜ T-425 | Confirmar una propuesta ajena no escribe nada | Con dos usuarios, aplicar el identificador del otro devuelve error y no toca ninguna fila |
| ⬜ T-426 | Una propuesta `aplicada`, `revertida`, `rechazada` o `caducada` no se puede volver a aplicar | Pulsar dos veces confirmar escribe una vez (FR-025) |
| ⬜ T-427 | Caducidad a las 24 horas | Una propuesta de ayer no se aplica; devuelve el motivo, no un error genérico |
| ⬜ T-428 | Revertir es inmediato y no pide confirmación adicional | Anula lo escrito y deja la propuesta en `revertida` (FR-023) |
| ⬜ T-429 | Con el automático apagado, ninguna ruta escribe sin confirmación | Prueba que siembra una propuesta e intenta ejecutarla directamente |
| ⬜ T-430 | Activar y revocar el automático desde el chat | Activar deja marca de tiempo; revocar la pone a `NULL` (E6, E7) |

## Fase 6 — Interfaz

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-431 | Tarjeta de acción en el chat: qué hizo o hará, en una frase, con dos botones | Antes de escribir dice «confirmar» y «cancelar»; después, «está bien» y «revertir» (FR-012) |
| ⬜ T-432 | Una tarjeta ya resuelta se lee como algo que pasó, no como algo que espera | Al volver días después, sus botones no invitan a pulsar |
| ⬜ T-433 | Corregir hablando sobre la última acción | «No, fueron 20 mil» corrige el movimiento en vez de crear otro (E3, FR-024) |
| ⬜ T-434 | El historial distingue lo escrito por la IA | Visible de un vistazo y sin convertir la tabla en un semáforo (FR-013) |
| ⬜ T-435 | La tarjeta sigue D-062 y D-065 | Colores del sistema, entrada animada, `prefers-reduced-motion` respetado |
| ⬜ T-436 | La tarjeta funciona a 390 px | Los dos botones caben sin desbordar |

## Fase 7 — Salvaguardas y cierre

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-437 | Sin proveedor, nada de esto se ofrece y Registro Fácil sigue intacto | `tests/e2e/chat.spec.ts` ampliado |
| ⬜ T-438 | Una salida del modelo inválida no escribe nada y queda como `rechazada` | El chat sigue usable después del fallo (FR-017) |
| ⬜ T-439 | Al modelo no se le envía el historial de movimientos | Prueba sobre el mensaje construido: solo la frase y el catálogo de categorías (Art. VI.2) |
| ⬜ T-440 | `npm run verify` en verde sin modelo instalado | Todas las salvaguardas de las fases 1 y 5 cubiertas |
| ⬜ T-441 | Banco de diez frases con su resultado esperado, y `npm run evaluar` | Corre fuera de `verify`, contra el proveedor real |
| ⬜ T-442 | Evaluación registrada como decisión | Igual que D-057: qué se probó, qué salió, qué queda flojo |
| ⬜ T-443 | Actualizar spec 003 (FR-010) y spec 007 (periodicidad `once`) | Ninguna spec queda desmentida por el código, que es lo que pasó con el FR-006 |

---

## Orden de ataque

Las fases 1 y 2 son independientes entre sí y se pueden hacer en cualquier orden.
De la 3 en adelante, cada una necesita la anterior.

**La fase 1 primero, y sola.** Es tentador empezar por las herramientas, que es
la parte vistosa. Pero la puerta es lo único que hace que el Artículo II sea
comprobable, y escribirla al final significa escribirla para que encaje con lo ya
construido en lugar de al revés.

## Lo que no se puede verificar sin ejecutar un modelo

Igual que en la 003, y por el mismo motivo. Queda fuera de `verify`:

1. Si de una frase salen los movimientos correctos.
2. Si pregunta el monto cuando falta, en lugar de inventarlo.
3. Si distingue una frase que registra de una que solo pregunta.

Los tres se cubren con el banco de frases (T-441), a mano y contra el proveedor
real. **Lo que sí queda cubierto sin modelo es todo lo que protege al usuario:**
que no se escriba sin permiso, que lo destructivo confirme siempre, que una
propuesta ajena o caducada no se aplique, y que nada se escriba dos veces.

Esa división es deliberada. Si un día la extracción resulta peor de lo esperado,
lo que falla son las métricas de la spec §7 —corregible—, no las salvaguardas.
