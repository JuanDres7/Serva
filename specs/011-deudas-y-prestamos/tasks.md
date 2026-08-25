# Tareas — Feature 011

- **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
- **Creado:** 2026-08-24

**Leyenda:** ⬜ pendiente · 🔄 en curso · ✅ hecha

---

## Fase 1 — El dominio

Primero y sin base de datos. El saldo derivado y el estado de vencimiento son
funciones puras, y son las que todo lo demás va a usar.

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-501 | `lib/domain/deudas.ts`: saldo derivado del original menos los abonos | Función pura, sin `import` de base ni de red. 500.000 con abonos de 200.000 y 100.000 da 200.000 |
| ⬜ T-502 | `estaSaldada` y `puedeAbonar`, que devuelve resultado en vez de lanzar | Un abono de 300.000 sobre un saldo de 200.000 se rechaza diciendo que quedan 200.000, no con una excepción |
| ⬜ T-503 | `estadoDeVencimiento` con sus cuatro estados | Una deuda que vence hoy es `cerca`; una de hace siete días es `vencida`; una saldada es `saldada` aunque su fecha pasara |
| ⬜ T-504 | `resumenDeDeudas`: totales por dirección | Con deudas en ambos sentidos, «debo» y «me deben» no se mezclan ni se restan |
| ⬜ T-505 | Ningún cálculo con coma flotante | Los saldos salen de restar enteros; una prueba recorre los resultados y exige `Number.isInteger` |

## Fase 2 — Modelo de datos

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-506 | Enums `debt_direction` y `debt_flow` | Los tres flujos presentes: recibido, prestado, cobrado |
| ⬜ T-507 | Valor `'debt'` en `movement_type` | **TypeScript señala cada `switch` que no lo contempla. Esa lista de errores es la lista de sitios a revisar** |
| ⬜ T-508 | Tablas `debts` y `debt_payments` con sus índices | Ninguna columna de saldo: se deriva. Ningún tipo de coma flotante |
| ⬜ T-509 | Columnas `debtFlow` y `debtId` en `transactions`, y el `CHECK` de categoría extendido | Un movimiento de tipo deuda no admite categoría, igual que uno de ahorro |
| ⬜ T-510 | Migración leída a mano antes de aplicarla | `ALTER TYPE ... ADD VALUE` revisado; ninguna columna nueva reescribe filas existentes |

## Fase 3 — Los totales, que es donde se juega la feature

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-511 | `PeriodAggregates` y `computeTotals` contemplan el tipo deuda sin meterlo en el balance | **Medir totales, registrar un préstamo, volver a medir: idénticos** (criterio 3 de la spec) |
| ⬜ T-512 | Lo mismo comprobado en presupuestos | Un préstamo recibido no consume tope de ninguna categoría |
| ⬜ T-513 | Lo mismo en los gráficos y en el ritmo del período | Ni la evolución ni el acumulado diario se mueven al registrar un préstamo |
| ⬜ T-514 | Lo mismo en la exportación a Excel | Los totales del archivo coinciden con los de la pantalla |
| ⬜ T-515 | Y en las seis herramientas de consulta del asistente | `totalesDelPeriodo` devuelve lo mismo antes y después del préstamo |
| ⬜ T-516 | El abono **sí** cuenta como gasto | Abonar 50.000 sube el gasto del período en 50.000, en «Deudas y créditos» |

## Fase 4 — Consultas y acciones

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-517 | `lib/db/queries/debts.ts`, con `userId` en cada firma | Ninguna función existe sin recibir el usuario; si falta, no compila |
| ⬜ T-518 | Crear, listar y leer una deuda con su saldo derivado | El saldo devuelto coincide con original menos abonos, calculado en la base |
| ⬜ T-519 | Abonar: escribe el abono y, si procede, su movimiento | Un abono a deuda propia deja las dos filas enlazadas por `transactionId` |
| ⬜ T-520 | Saldar automáticamente al llegar el saldo a cero | El último abono deja `settledAt` sin que nadie lo pida (FR-005) |
| ⬜ T-521 | Reabrir una deuda saldada por error | `settledAt` vuelve a `NULL` y la deuda regresa a la lista. Nada se borró (FR-014) |
| ⬜ T-522 | Aislamiento entre cuentas | Con dos usuarios, ninguna consulta alcanza deudas ajenas ni sus abonos |
| ⬜ T-523 | Acciones de servidor, con el usuario desde la sesión | Ninguna acepta `userId` como parámetro del cliente |

## Fase 5 — Serva AI

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-524 | `proponerDeuda`, ligada al usuario por cierre | «Me prestaron 200 mil, los devuelvo el 7 de septiembre» crea la deuda con su fecha |
| ⬜ T-525 | `proponerAbono` | «Le aboné 50 mil a mi hermana» baja el saldo y registra el gasto |
| ⬜ T-526 | `proponerSaldarDeuda` entra por la puerta como `corregir` | **Confirma siempre**, con automático o sin él. No hace falta regla nueva en la puerta |
| ⬜ T-527 | Buscar la deuda por contraparte, no por identificador | El modelo nunca envía un UUID; con varias coincidencias se muestran y elige la persona |
| ⬜ T-528 | Ampliar la lista permitida de herramientas a doce | La prueba falla si aparece una decimotercera sin aprobar |
| ⬜ T-529 | El asistente responde «¿cuánto debo?» y «¿quién me debe?» | Las cifras coinciden con el cálculo directo (FR-016) |
| ⬜ T-530 | Lo escrito por la IA queda marcado y es rastreable | `createdBy` y `assistantWriteId` en la deuda creada |

## Fase 6 — Interfaz

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-531 | Pantalla `/deudas` con las dos listas y sus totales | «Debo» y «Me deben» separadas, cada una con su total |
| ⬜ T-532 | Tarjeta de deuda con barra de saldo, reutilizando la de metas | No se inventa un componente nuevo para lo mismo |
| ⬜ T-533 | Entrada en la navegación, entre Metas y Recurrentes | Aparece también en la tira compacta del móvil |
| ⬜ T-534 | Abonar y saldar desde la pantalla | El saldo se actualiza sin recargar |
| ⬜ T-535 | Aviso de vencimiento que informa y no regaña (D-024) | «Vence en 3 días», «lleva 7 días vencida». Nunca «te retrasaste» |
| ⬜ T-536 | Estado vacío que invita a empezar | Reutiliza `components/vacio.tsx` (E11) |
| ⬜ T-537 | Sigue D-062 y D-065, y funciona a 390 px | Colores del sistema, ningún hex suelto, sin desbordamiento horizontal |

## Fase 7 — Cierre

| | Tarea | Criterio de verificación |
|---|---|---|
| ⬜ T-538 | Sin proveedor de IA, las deudas funcionan enteras a mano | Crear, abonar y saldar sin que exista `lib/ai/` |
| ⬜ T-539 | Ampliar el banco de frases con los casos de deuda | Corre en `npm run evaluar`, nunca en `verify` |
| ⬜ T-540 | Evaluación registrada como decisión | Qué se probó, qué salió, qué quedó flojo. Como D-057 y D-069 |
| ⬜ T-541 | `npm run verify` en verde sin modelo instalado | Las 519 actuales más las nuevas |
| ⬜ T-542 | Actualizar spec 009 si la exportación gana hoja de deudas | Ninguna spec queda desmentida por el código |
| ⬜ T-543 | Datos de ejemplo incluyen alguna deuda | Quien pulse «Ver con datos de ejemplo» ve la pantalla con algo dentro |

---

## Orden de ataque

Las fases 1 y 2 son independientes. **La fase 3 va antes que la 4**, aunque
parezca al revés: primero se comprueba que los totales no se mueven, y solo
después se construye la pantalla que los alimenta.

El motivo es concreto. La fase 3 es la única que puede romper features que llevan
meses siendo correctas. Si se deja para el final, se descubre el problema con la
interfaz ya construida encima y la tentación de parchear en lugar de rediseñar.

## Lo que no se puede verificar sin ejecutar un modelo

Solo la extracción: si de «me prestaron 200 mil» sale la deuda correcta. Se cubre
en T-539, a mano y contra el proveedor real.

**Todo lo que protege al usuario queda cubierto sin modelo:** que los totales no
mientan, que un abono no pueda exceder el saldo, que saldar confirme siempre, y
que nadie alcance las deudas de otra cuenta.
