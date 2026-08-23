# Spec 001 — Registro y consulta de movimientos

- **Estado:** aprobada
- **Actualizada:** 2026-08-22
- **Depende de:** 000 (cuentas y aislamiento por usuario)
- **Decisiones aplicables:** D-003, D-005, D-006, D-007, D-012, D-016, D-017, D-020, D-021, D-025, D-028, D-031

---

## 1. Contexto y motivación

Quien quiere entender en qué se le va el dinero no tiene hoy un registro fiable:
lo lleva en la cabeza, en notas sueltas o en una hoja de cálculo que abandona en
dos semanas. Sin historial no hay nada sobre lo que analizar, ni humano ni
asistido.

Esta feature construye ese cimiento. Su propósito es que registrar resulte tan
barato en esfuerzo que el usuario no deje de hacerlo, y que lo registrado se pueda
consultar y corregir sin fricción.

Deliberadamente **no incluye inteligencia artificial**. La categorización
automática llega en la feature 002 y se apoya sobre lo que aquí se construya.

## 2. Alcance

### Dentro

- **Registro Fácil:** flujo optimizado para capturar un movimiento en segundos y
  encadenar varios seguidos.
- **Historial-tabla:** una única vista donde se consulta, se corrige y se agrega.
- Cálculo de totales del período y desglose de gasto por categoría.
- Anulación y corrección de movimientos.
- Conjunto fijo de categorías, asignadas manualmente en esta feature.
- Cálculo de períodos sobre un ciclo, con el mes calendario como ciclo por defecto.

### Fuera

- Categorización automática, chat y gráficos: features 002, 003 y 008.
- Configuración inicial y personalización: feature 004.
- Presupuestos, metas de ahorro y movimientos recurrentes: features 005, 006, 007.
- Exportación: feature 009.
- Configuración del ciclo de pago. Aquí solo se construye el motor de cálculo por
  ciclos; el ciclo por defecto es el mes calendario y todavía no puede cambiarse
  (D-027).
- Registro de movimientos de tipo ahorro desde la interfaz. El modelo los
  contempla, pero se capturan desde las metas (D-031), que aún no existen.
- Cuentas y autenticación: feature 000, previa a esta.
- Movimientos en monedas distintas y conversión entre ellas.

## 3. Usuario

Una persona que administra su propio dinero, se sienta al computador a ponerse al
día y no tiene por qué saber de finanzas. Su tolerancia a la fricción es mínima:
si cada registro toma más de unos segundos, deja de hacerlo y el producto muere.

## 4. Escenarios

### E1 — Registrar un gasto rápidamente

**Dado** que abro Registro Fácil,
**cuando** escribo el monto, escribo en qué lo gasté, elijo la categoría y confirmo,
**entonces** el movimiento queda registrado, veo que quedó guardado y el formulario
está listo para el siguiente sin que yo navegue a ningún lado.

### E2 — Encadenar varios registros

**Dado** que acabo de registrar un movimiento,
**cuando** continúo registrando,
**entonces** veo cuántos llevo en esta sesión y su total, y puedo terminar cuando
quiera volviendo a donde estaba.

### E3 — Registrar un ingreso

**Dado** que estoy en Registro Fácil,
**cuando** cambio el tipo a ingreso,
**entonces** las categorías disponibles pasan a ser las de ingreso y el movimiento
suma al saldo en lugar de restar.

### E4 — Corregir el monto de un movimiento

**Dado** que registré un gasto con el monto equivocado,
**cuando** lo corrijo desde el historial,
**entonces** el historial y todos los totales reflejan el valor correcto, y queda
constancia de que el movimiento fue modificado.

### E5 — Anular un movimiento

**Dado** que registré algo que nunca ocurrió,
**cuando** lo anulo,
**entonces** deja de contar en todos los totales y desaparece del historial activo,
sin eliminarse de forma irrecuperable y pudiendo restaurarlo después.

### E6 — Entender el período

**Dado** que tengo movimientos registrados,
**cuando** abro la aplicación,
**entonces** veo cuánto ingresó, cuánto gasté y el saldo del período en curso, con
el desglose de gasto por categoría.

### E7 — Consultar un período anterior

**Dado** que quiero ver otro período,
**cuando** cambio el período seleccionado,
**entonces** todos los totales, el desglose y el historial se recalculan para ese
período.

### E8 — Registrar desde la tabla

**Dado** que me estoy poniendo al día con varios movimientos y prefiero verlos todos,
**cuando** agrego un movimiento directamente en el historial-tabla,
**entonces** queda registrado igual que si lo hubiera hecho por Registro Fácil, con
las mismas validaciones.

### E9 — Primer uso

**Dado** que abro la aplicación sin ningún movimiento registrado,
**cuando** veo la pantalla principal,
**entonces** entiendo qué hace la aplicación y cuál es mi siguiente acción, en vez
de encontrarme una pantalla vacía.

## 5. Requisitos funcionales

### Registro

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir registrar un movimiento con monto, tipo, categoría, fecha y descripción. La interfaz de esta feature ofrece únicamente los tipos gasto e ingreso. |
| FR-002 | El monto debe ser estrictamente mayor que cero. El signo lo determina el tipo, nunca el monto introducido. |
| FR-003 | El selector de tipo debe mostrar gasto e ingreso a la vez, con gasto preseleccionado. No se admite un control que alterne entre ambos estados. |
| FR-004 | Al cambiar el tipo, la lista de categorías disponibles debe cambiar al conjunto correspondiente. |
| FR-005 | La descripción admite desde una palabra hasta una frase en lenguaje natural. |
| FR-006 | La descripción es opcional, pero si se deja vacía la elección de categoría pasa a ser obligatoria. Nunca se exigen ambas. |
| FR-007 | La descripción no debe presentarse como campo prescindible: es la entrada principal junto al monto. |
| FR-008 | La fecha por defecto es el día actual, con acceso a un calendario para elegir otra. No se aceptan fechas futuras. |
| FR-009 | El monto debe mostrarse formateado con separador de miles a medida que se escribe. |
| FR-010 | Al abrir Registro Fácil, el cursor debe estar en el campo de monto, listo para escribir. |
| FR-011 | El sistema debe rechazar el registro e informar el motivo cuando falte un dato obligatorio o el monto sea inválido, sin perder lo que el usuario ya escribió. |
| FR-012 | Tras registrar, el sistema debe confirmar visiblemente que quedó guardado y ofrecer deshacerlo sin salir del flujo. |
| FR-013 | Registro Fácil debe permitir encadenar registros, mostrando cuántos se llevan en la sesión y su total, y terminar volviendo al punto de partida. |
| FR-014 | Registro Fácil debe ser accesible desde un botón principal y permanente de la pantalla de inicio. |

### Historial y consulta

| ID | Requisito |
|---|---|
| FR-015 | El historial-tabla es la única vista de movimientos: en ella se consulta, se corrige y se agrega. No existe una tabla de registro separada. |
| FR-016 | El historial debe mostrarse ordenado por fecha descendente. |
| FR-017 | El sistema debe permitir filtrar por período, por tipo y por categoría. |
| FR-018 | El sistema debe permitir editar cualquier campo de un movimiento existente directamente sobre la tabla. |
| FR-019 | El sistema debe permitir agregar movimientos desde la tabla, con las mismas validaciones que Registro Fácil. |
| FR-020 | El sistema debe permitir anular un movimiento y restaurarlo después. Los movimientos anulados no participan en ningún total ni agregado, y no aparecen en el historial salvo que se pidan explícitamente. |
| FR-021 | Ningún movimiento se elimina de forma irrecuperable. |
| FR-022 | Todo movimiento debe conservar cuándo fue creado y cuándo fue modificado por última vez. |

### Totales y períodos

| ID | Requisito |
|---|---|
| FR-023 | El sistema debe calcular y mostrar, para el período seleccionado, el total de ingresos, el total de gastos y el saldo neto. |
| FR-024 | El sistema debe mostrar el gasto agregado por categoría del período seleccionado. |
| FR-025 | Todos los totales deben derivarse del historial de movimientos. No existe ningún saldo almacenado que se actualice por separado. |
| FR-026 | El sistema debe permitir cambiar el período consultado y recalcular todo en consecuencia. |
| FR-027 | Los períodos deben calcularse sobre un ciclo configurable. En esta feature el ciclo es el mes calendario y debe funcionar íntegramente por sí solo. |

### Categorías y presentación

| ID | Requisito |
|---|---|
| FR-028 | El sistema debe ofrecer el conjunto fijo de categorías de RN-005, cada una con nombre y color propio. El usuario no puede crearlas, renombrarlas ni eliminarlas. |
| FR-029 | Cada categoría debe conservar el mismo color en toda la aplicación. |
| FR-030 | Los montos deben presentarse con el símbolo, el separador de miles y los decimales de la moneda configurada. |
| FR-031 | Los datos registrados deben persistir entre sesiones. |
| FR-033 | Todo movimiento pertenece al usuario que lo registró. Ninguna consulta de esta feature puede devolver movimientos de otro usuario (Art. VI.1). |
| FR-032 | La interfaz debe funcionar en pantalla de computador y no romperse al reducir el ancho de la ventana. |

## 6. Reglas de negocio

- **RN-001** — Un movimiento es *ingreso*, *gasto* o *ahorro* (D-028). El modelo de
  datos y los cálculos contemplan los tres desde el inicio; la interfaz de esta
  feature solo expone ingreso y gasto, porque un ahorro exige una meta de destino y
  las metas son la feature 006.
- **RN-002** — Saldo del período = ingresos activos − gastos activos − aportes de
  ahorro activos + retiros de ahorro activos, dentro del rango del período.
- **RN-003** — Los movimientos de tipo *ahorro* quedan excluidos de todo total,
  agregado y análisis de gasto. Se presentan siempre por separado.
- **RN-004** — Los montos se manejan internamente como enteros en la unidad mínima
  de la moneda configurada (Art. I).
- **RN-005** — El conjunto de categorías es fijo (D-021).

  **Gasto:** Mercado · Comidas fuera · Transporte · Vivienda · Servicios · Salud ·
  Educación · Entretenimiento · Suscripciones · Compras · Mascotas · Deudas y
  créditos · Otros

  **Ingreso:** Salario · Ventas o negocio · Regalos y ayudas · Reembolsos · Otros
  ingresos

  Las categorías de gasto no aplican a ingresos ni al revés.
- **RN-006** — El ciclo por defecto es el mes calendario. Si un ciclo configurado
  señala un día inexistente en el mes, se usa el último día del mes. Los ciclos no
  se desplazan por fines de semana ni festivos (D-025).
- **RN-007** — Un movimiento anulado conserva todos sus datos y puede restaurarse.
  La anulación es un estado, no una eliminación.
- **RN-008** — Todo movimiento, y todo total derivado de él, está acotado al usuario
  autenticado. El aislamiento se garantiza estructuralmente, no por disciplina en
  cada consulta.

## 7. Criterios de aceptación

1. Los nueve escenarios E1–E9 se ejecutan correctamente de principio a fin.
2. Registrar un gasto desde la pantalla de inicio requiere, como máximo: abrir
   Registro Fácil, escribir monto, escribir descripción, elegir categoría y
   confirmar.
3. Los totales calculados coinciden exactamente con la suma manual de los
   movimientos activos, verificado con casos que incluyan montos con decimales.
4. Ningún monto se representa con punto flotante en ninguna capa del sistema.
5. Anular un movimiento no lo elimina y es reversible.
6. Existe verificación automática que falla si se rompen RN-002, RN-004 o RN-006.
7. El cálculo de períodos funciona correctamente en meses de 28, 29, 30 y 31 días.
8. Un movimiento registrado por Registro Fácil y otro registrado desde la tabla son
   indistinguibles en el modelo de datos y superan las mismas validaciones.

## 8. Métricas de éxito

- Registrar un gasto toma menos de 10 segundos desde abrir la aplicación.
- Cero discrepancias entre los totales mostrados y la suma real de movimientos.
- Un usuario nuevo entiende qué hacer en la pantalla inicial sin explicación.

## 9. Decisiones resueltas durante la redacción

- **Anulación:** es reversible por el usuario, no solo auditable. El movimiento
  anulado se conserva íntegro y puede restaurarse; se muestra únicamente si se
  piden explícitamente los anulados. Motivo: quien anula por error debe poder
  revertirlo sin ayuda, y conservarlo es obligatorio por el Artículo VII.
- **Categorías propias:** no existen en el MVP (D-021).
- **Paginación del historial:** se carga de forma incremental al desplazarse. Bajo
  unos cientos de movimientos es indistinguible de cargarlo completo, y evita
  rehacerlo cuando el historial crezca.
