# Spec 008 — Gráficos y visualización

- **Estado:** aprobada
- **Creada:** 2026-08-22
- **Depende de:** 001 (necesita movimientos y períodos)
- **Decisiones aplicables:** D-002, D-034

---

## 1. Contexto y motivación

Los totales responden *cuánto*. Los gráficos responden *en qué*, *comparado con
qué* y *a qué ritmo* — que son las preguntas por las que alguien abre una
aplicación de finanzas.

El criterio que gobierna esta feature: **cada gráfico responde una pregunta que el
usuario se hace de verdad**. Si no se puede nombrar la pregunta, el gráfico no se
construye. Los paneles llenos de visualizaciones bonitas que nadie mira son el
resultado de saltarse esa regla.

## 2. Alcance

### Dentro

- Tres visualizaciones fijas en la pantalla principal.
- Colores consistentes por categoría en toda la aplicación.
- Comparación contra el período anterior en toda cifra destacada.

### Fuera

- Gráficos circulares (RN-002).
- Paneles configurables por el usuario.
- Reportes en PDF.
- Visualizaciones dentro del chat: pertenecen a la feature 003, aunque reutilizan
  estos componentes.

## 3. Los tres gráficos

| Gráfico | Pregunta que responde | Forma |
|---|---|---|
| **Distribución por categoría** | ¿En qué se me fue la plata? | Barras horizontales ordenadas de mayor a menor |
| **Evolución** | ¿Voy mejor o peor que antes? | Ingresos contra gastos, últimos seis períodos |
| **Ritmo del período** | ¿Voy más rápido de lo normal? | Gasto acumulado día a día del período actual, superpuesto al anterior |

El tercero es el más valioso y el menos frecuente en otras aplicaciones: informa el
día 12 que se va más rápido de lo habitual, cuando todavía se puede reaccionar. Un
total al cierre del período solo sirve para lamentarse.

## 4. Escenarios

### E1 — Ver en qué se fue el dinero

**Dado** que tengo gastos registrados en el período,
**cuando** miro la pantalla principal,
**entonces** veo mis categorías ordenadas de mayor a menor gasto, con su monto.

### E2 — Comparar con períodos anteriores

**Dado** que llevo varios períodos registrando,
**cuando** miro la evolución,
**entonces** distingo ingresos y gastos de cada período y puedo ver si la
diferencia crece o se reduce.

### E3 — Detectar que voy rápido

**Dado** que voy a mitad del período,
**cuando** miro el ritmo,
**entonces** veo si mi gasto acumulado va por encima o por debajo del mismo día del
período anterior.

### E4 — Sin datos suficientes

**Dado** que acabo de empezar a usar la aplicación,
**cuando** un gráfico no tiene datos suficientes para ser significativo,
**entonces** se me indica qué falta para que aparezca, en lugar de mostrar un
gráfico vacío o engañoso.

### E5 — Cambiar de período

**Dado** que selecciono otro período,
**cuando** los gráficos se actualizan,
**entonces** todos reflejan el período seleccionado de forma consistente con los
totales.

## 5. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | La pantalla principal debe mostrar los tres gráficos de la sección 3. |
| FR-002 | La distribución por categoría debe presentarse como barras horizontales ordenadas de mayor a menor, con el monto visible en cada una. |
| FR-003 | La evolución debe abarcar los últimos seis períodos y distinguir ingresos de gastos. |
| FR-004 | El ritmo del período debe comparar el gasto acumulado del período actual con el del anterior, día a día. |
| FR-005 | Cada categoría debe usar el mismo color en los gráficos, el historial y el chat. |
| FR-006 | Ninguna cifra destacada debe mostrarse sin su comparación con el período anterior. |
| FR-007 | Cuando un gráfico no tenga datos suficientes, debe indicarse qué falta en lugar de mostrarlo vacío. |
| FR-008 | Los gráficos deben reflejar el período seleccionado y ser coherentes con los totales de la spec 001. |
| FR-009 | Los movimientos anulados y los de tipo ahorro deben excluirse de todos los gráficos de gasto. |
| FR-010 | Los gráficos deben ser legibles sin depender del color para distinguir la información esencial. |
| FR-011 | Los componentes de visualización deben poder reutilizarse desde las respuestas del chat. |

## 6. Reglas de negocio

- **RN-001** — Todo gráfico responde una pregunta nombrable. No se añaden gráficos
  sin pregunta asociada.
- **RN-002** — No se usan gráficos circulares. Con trece categorías resultan
  ilegibles, y comparar ángulos es menos preciso que comparar longitudes.
- **RN-003** — Un número sin comparación no informa: «$890.000» no dice nada;
  «$890.000, un 12% más que el período anterior» sí.
- **RN-004** — Los gráficos se calculan sobre el ciclo configurado del usuario, no
  sobre el mes calendario, cuando ambos difieran.

## 7. Criterios de aceptación

1. Los cinco escenarios E1–E5 se ejecutan correctamente.
2. Las cifras de cada gráfico coinciden exactamente con los totales calculados en
   la spec 001 para el mismo período.
3. Ningún gráfico circular aparece en la aplicación.
4. Los colores de categoría coinciden entre gráficos, historial y chat.
5. Con menos de dos períodos de datos, la evolución y el ritmo indican qué falta en
   lugar de mostrarse vacíos.
6. La información esencial se distingue sin depender únicamente del color.

## 8. Métricas de éxito

- El usuario identifica su mayor categoría de gasto de un vistazo.
- El usuario detecta que va gastando más rápido de lo normal antes de que termine
  el período.
