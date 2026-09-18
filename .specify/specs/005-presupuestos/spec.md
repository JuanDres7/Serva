# Spec 005 — Presupuestos

- **Estado:** aprobada
- **Creada:** 2026-08-23
- **Depende de:** 001 (movimientos y ciclos), 004 (configuración del usuario)
- **Decisiones aplicables:** D-025, D-026, D-027, D-035, D-024

---

## 1. Contexto y motivación

Así funciona en casi todas las aplicaciones: el usuario abre «Presupuestos», ve
sus categorías vacías y tiene que inventarse un número para cada una. ¿Cuánto
debería gastar en comidas fuera? No lo sabe: nunca lo ha medido. Pone una cifra
que suena razonable, la excede en la segunda semana, la aplicación se lo dice, se
siente mal y no vuelve.

El presupuesto no falló porque gastara mucho, sino porque **el número era
ficción**.

Serva ya tiene el historial categorizado, así que puede partir de la realidad
medida: «gastas en promedio esto; ¿ponemos aquello?». Un tope alcanzable es uno
que no se abandona.

## 2. Alcance

### Dentro
- Definir un tope de gasto por categoría para el período.
- Sugerencia de tope a partir del promedio real del usuario.
- Creación manual, siempre disponible.
- Progreso del período con aviso al acercarse al tope.
- Configuración del ciclo de pago, que se pregunta aquí por primera vez.

### Fuera
- Método de sobres: asignar cada peso del ingreso a un destino. Exige entender un
  método y dedicarle tiempo cada semana, y contradice que Serva sea para quien
  no sabe de finanzas.
- Traspaso del sobrante al período siguiente.
- Presupuestos semanales o diarios: la variación es demasiado alta para informar.
- Bloquear el registro de un gasto que excede el tope.

## 3. Escenarios

### E1 — Primera visita
**Dado** que entro a presupuestos por primera vez,
**cuando** se abre la sección,
**entonces** se me pregunta cada cuánto me pagan, porque de eso depende qué
período se mide.

### E2 — Sugerencia con mis datos
**Dado** que tengo historial en una categoría,
**cuando** voy a ponerle tope,
**entonces** se me dice cuánto gasto en promedio y se me propone una cifra
alcanzable.

### E3 — Definirlo a mano
**Dado** que ya sé qué tope quiero,
**cuando** lo escribo,
**entonces** se guarda sin más, sin obligarme a aceptar la sugerencia.

### E4 — Ver cómo voy
**Dado** que tengo presupuestos activos,
**cuando** miro la sección,
**entonces** veo cuánto llevo gastado de cada tope y cuántos días quedan del
período.

### E5 — Acercarse al tope
**Dado** que llevo el 80% de un presupuesto,
**cuando** entro a la aplicación,
**entonces** se me avisa mientras aún puedo reaccionar.

### E6 — Excederlo
**Dado** que pasé el tope,
**cuando** lo veo,
**entonces** se me informa sin reproche y sin impedirme registrar nada.

### E7 — Cambiar de opinión
**Dado** que el tope no era realista,
**cuando** lo ajusto o lo elimino,
**entonces** el cambio se aplica al período en curso.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir definir un tope de gasto por categoría. |
| FR-002 | Al definirlo, debe mostrarse el promedio real del usuario en esa categoría, si hay historial. |
| FR-003 | Debe proponerse una cifra a partir de ese promedio, aceptable de un toque. |
| FR-004 | La creación manual está siempre disponible, aunque no haya historial suficiente. |
| FR-005 | Solo puede haber un presupuesto por categoría. |
| FR-006 | La sección debe orientar a poner tope a pocas categorías, las que el usuario puede influir. |
| FR-007 | Debe mostrarse el gasto del período frente al tope, con porcentaje y días restantes. |
| FR-008 | Al alcanzar el 80% de un tope, debe avisarse. |
| FR-009 | Superar un tope nunca impide registrar movimientos. |
| FR-010 | Ningún mensaje reprocha ni juzga el gasto. |
| FR-011 | En la primera visita se pregunta el ciclo de pago del usuario. |
| FR-012 | El ciclo admite las formas del motor de períodos: mes calendario, mensual por día, dos veces al mes, semanal y cada N días. |
| FR-013 | Los presupuestos se miden sobre el ciclo configurado, no sobre el mes calendario. |
| FR-014 | Debe poder ajustarse o eliminarse un presupuesto en cualquier momento. |
| FR-015 | Todo presupuesto pertenece a un usuario y ninguna consulta puede devolver los de otro. |

## 5. Reglas de negocio

- **RN-001** — Un presupuesto es un tope de gasto por categoría y período. No
  aplica a ingresos ni a ahorro.
- **RN-002** — El gasto del período se mide con las mismas reglas que el resto de
  la aplicación: anulados fuera, ahorro fuera.
- **RN-003** — El aviso llega al 80%, no al 100%: al superarlo ya no queda nada
  por hacer salvo sentirse mal; al 80% todavía hay margen (D-026).
- **RN-004** — El sobrante no se traspasa al período siguiente.
- **RN-005** — La sugerencia parte del promedio de los períodos anteriores y
  propone algo por debajo, pero alcanzable.

## 6. Criterios de aceptación

1. Los siete escenarios E1–E7 se ejecutan correctamente.
2. El gasto mostrado coincide con el de la categoría en el mismo período.
3. Los presupuestos se calculan sobre el ciclo configurado.
4. Con un presupuesto excedido, registrar un gasto sigue siendo posible.
5. No se puede tener dos presupuestos de la misma categoría.
6. Ninguna consulta devuelve presupuestos de otro usuario.
7. Ningún mensaje de la sección reprocha ni juzga.
