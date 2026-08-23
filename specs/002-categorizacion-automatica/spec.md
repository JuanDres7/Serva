# Spec 002 — Categorización automática

- **Estado:** aprobada
- **Creada:** 2026-08-22
- **Depende de:** 001 (necesita movimientos y descripciones registrados)
- **Decisiones aplicables:** D-004, D-008, D-011, D-012, D-013, D-014, D-015, D-021

---

## 1. Contexto y motivación

Elegir la categoría de un desplegable es el paso más lento de registrar un
movimiento: obliga a abrir una lista, leer opciones y decidir. Repetido varias
veces al día, es la fricción que hace que la gente deje de registrar.

Esta feature traslada ese trabajo al sistema. El usuario escribe lo que pasó —
*"almuerzo"*, *"fui a la tienda y compré un cartón de leche"*— y la categoría
llega ya elegida, editable en un toque si está mal.

Es también lo que da sentido a que la descripción sea la entrada principal: sin
esta feature, el usuario escribiría un texto que nadie lee.

## 2. Alcance

### Dentro

- Sugerencia automática de categoría a partir de la descripción.
- Cascada de tres niveles: palabras clave, similitud por significado y modelo de
  lenguaje.
- Corrección por parte del usuario y aprendizaje a partir de ella.
- Registro del historial de aprendizaje.
- Normalización de la descripción a una versión corta para el historial.
- Comportamiento definido cuando el sistema no logra sugerir nada.

### Fuera

- Categorías creadas por el usuario (D-021).
- Ajuste fino del modelo (D-014).
- Consultas conversacionales: feature 003.
- Categorización de movimientos de ahorro: su destino es una meta, no una
  categoría (D-031).

## 3. Escenarios

### E1 — Sugerencia acertada

**Dado** que escribo "almuerzo" en la descripción,
**cuando** el sistema procesa el texto,
**entonces** la categoría *Comidas fuera* aparece ya seleccionada, señalada como
sugerencia, y puedo confirmar el registro sin tocar el desplegable.

### E2 — Corrección del usuario

**Dado** que el sistema sugirió *Compras* y yo considero que era *Mercado*,
**cuando** cambio la categoría antes de confirmar,
**entonces** el movimiento se guarda con mi categoría, queda registrado que hubo
corrección, y la próxima vez que escriba algo equivalente el sistema propondrá
*Mercado*.

### E3 — Descripción en lenguaje natural

**Dado** que escribo "fui a la tienda y me compré un cartón de leche",
**cuando** el sistema procesa el texto,
**entonces** sugiere *Mercado* y muestra en el historial una versión corta y
legible, conservando mi texto original.

### E4 — Descripción nunca vista

**Dado** que escribo algo que no se parece a nada de mi historial,
**cuando** el sistema no encuentra coincidencia por palabras clave ni por
similitud,
**entonces** consulta al modelo de lenguaje y presenta su propuesta.

### E5 — Sin descripción

**Dado** que dejo la descripción vacía,
**cuando** voy a confirmar,
**entonces** el sistema no sugiere nada y la elección de categoría es obligatoria
(FR-006 de la spec 001).

### E6 — El sistema no logra decidir

**Dado** que ninguno de los tres niveles alcanza la confianza mínima,
**cuando** voy a confirmar,
**entonces** ninguna categoría aparece preseleccionada y se me pide elegirla, sin
que el registro se bloquee ni se pierda lo que escribí.

### E7 — Mejora con el uso

**Dado** que llevo semanas corrigiendo las sugerencias,
**cuando** registro movimientos parecidos a los ya corregidos,
**entonces** el sistema acierta sin consultar al modelo y la sugerencia es
inmediata.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe sugerir una categoría a partir de la descripción, aplicando la cascada de RN-001 en orden. |
| FR-002 | La sugerencia debe presentarse ya seleccionada en el desplegable y señalada visiblemente como sugerencia del sistema. |
| FR-003 | El usuario debe poder cambiar la categoría sugerida sin pasos adicionales. |
| FR-004 | Cuando ningún nivel alcanza la confianza mínima, no debe preseleccionarse ninguna categoría y debe pedirse al usuario que elija. |
| FR-005 | El sistema debe producir una versión corta y legible de la descripción para mostrar en el historial, conservando siempre el texto original del usuario. |
| FR-006 | Cada movimiento debe registrar el origen de su categoría: elegida por el usuario, sugerida y aceptada, o sugerida y corregida. |
| FR-007 | Cada categorización debe registrar: texto original, categoría propuesta, nivel de confianza, mecanismo que la produjo, categoría final y momento de cada paso. |
| FR-008 | Una corrección del usuario debe influir en las sugerencias posteriores para descripciones equivalentes. |
| FR-009 | Una categoría corregida por el usuario no debe ser sobrescrita nunca por una sugerencia posterior del sistema. |
| FR-010 | Toda respuesta del modelo debe validarse contra un esquema antes de usarse. Una respuesta inválida no puede propagarse al registro. |
| FR-011 | Si el modelo no responde, tarda demasiado o devuelve algo inválido, el flujo de registro debe continuar sin categoría sugerida. Nunca debe quedar bloqueado. |
| FR-012 | El sistema debe sugerir únicamente categorías del conjunto vigente y solo las del tipo del movimiento en curso. |
| FR-013 | La sugerencia no debe hacer esperar al usuario: si no está lista en el momento de confirmar, el registro procede sin ella. |
| FR-014 | El proveedor del modelo debe poder cambiarse por configuración, sin modificar el resto del sistema. |
| FR-015 | Cada consulta al modelo debe registrarse con su entrada, su salida, su latencia y su costo. |

## 5. Reglas de negocio

- **RN-001** — La categorización se resuelve en cascada y se detiene en el primer
  nivel que alcance la confianza mínima:

  1. **Palabras clave.** Se extraen los términos con contenido de la descripción y
     se buscan entre los ya categorizados por el usuario.
  2. **Similitud por significado.** Se compara la descripción con las anteriores
     mediante representaciones vectoriales.
  3. **Modelo de lenguaje.** Solo si los dos anteriores no bastan.

- **RN-002** — Toda sugerencia lleva asociado un nivel de confianza y el mecanismo
  que la produjo. Por debajo del umbral mínimo, no se sugiere nada.
- **RN-003** — La corrección del usuario es soberana (Art. II).
- **RN-004** — El sistema sugiere; nunca registra por su cuenta. Ninguna
  categorización se persiste sin que el usuario confirme el movimiento.
- **RN-005** — Al modelo se le envía lo mínimo necesario: la descripción y la lista
  de categorías vigentes. No se envían identificadores, datos personales ni el
  historial completo (Art. VI).

## 6. Criterios de aceptación

1. Los siete escenarios E1–E7 se ejecutan correctamente.
2. Existe una medición automática del porcentaje de aciertos sobre un conjunto de
   descripciones de prueba, ejecutable como parte de la verificación.
3. Una respuesta del modelo mal formada, vacía o con una categoría inexistente no
   rompe el registro ni escribe datos inválidos.
4. Con el modelo apagado por completo, registrar un movimiento sigue siendo
   posible.
5. Tras corregir una sugerencia, una descripción equivalente recibe la categoría
   corregida sin consultar al modelo.
6. El historial de aprendizaje conserva todos los campos de FR-007 para cada
   categorización realizada.
7. Cambiar el proveedor del modelo por configuración no requiere modificar código
   ajeno a esa capa.

## 7. Métricas de éxito

- El usuario acepta la sugerencia sin corregirla en la mayoría de los registros.
- Tras un mes de uso, la mayor parte de los registros se resuelve sin consultar al
  modelo.
- La sugerencia aparece sin que el usuario perciba espera.
- Menos del 10% de los movimientos terminan en la categoría *Otros*. Por encima de
  esa cifra, la lista de categorías está incompleta (D-021).
