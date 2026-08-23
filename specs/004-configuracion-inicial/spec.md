# Spec 004 — Configuración inicial y personalización

- **Estado:** aprobada
- **Creada:** 2026-08-22
- **Depende de:** 000 (la configuración pertenece a un usuario)
- **Decisiones aplicables:** D-022, D-023, D-024, D-027

---

## 1. Contexto y motivación

Antes de registrar nada, la aplicación necesita saber dos cosas: cómo llamar al
usuario y en qué moneda trabaja. Con eso resuelve el saludo, el símbolo monetario,
el formato de miles y decimales y el formato de fecha.

Y hay un motivo de producto además del técnico: que la aplicación reciba a alguien
por su nombre cambia por completo cómo se siente usarla.

## 2. Alcance

### Dentro

- Pantalla de configuración inicial en el primer arranque: nombre y país.
- Determinación de moneda y formatos a partir del país.
- Saludo personalizado y contextual en la pantalla de inicio.
- Pantalla de ajustes para cambiar el nombre.

### Fuera

- Cuentas de usuario, contraseñas y autenticación: feature 000.
- Cualquier dato personal más allá del nombre y el país (D-023).
- Conversión entre monedas (D-022).
- Configuración del ciclo de pago: se pregunta al entrar a presupuestos (D-027).

## 3. Escenarios

### E1 — Primer arranque

**Dado** que abro Finzen por primera vez,
**cuando** se me pide la información inicial,
**entonces** solo se me piden el nombre y el país, y al terminar entro directamente
a la aplicación lista para usar.

### E2 — Saludo personalizado

**Dado** que ya configuré mi nombre,
**cuando** abro la aplicación,
**entonces** me recibe un mensaje que me llama por mi nombre y varía según la hora
y mi actividad reciente.

### E3 — Moneda y formatos correctos

**Dado** que indiqué mi país,
**cuando** veo cualquier monto en la aplicación,
**entonces** aparece con el símbolo, el separador de miles y los decimales que
corresponden a mi moneda.

### E4 — Cambiar la moneda antes de registrar

**Dado** que aún no he registrado ningún movimiento,
**cuando** cambio el país o la moneda en los ajustes,
**entonces** el cambio se aplica sin restricciones.

### E5 — Intentar cambiar la moneda con movimientos registrados

**Dado** que ya tengo movimientos registrados,
**cuando** intento cambiar la moneda,
**entonces** el sistema no lo permite y me explica que los montos ya guardados no
se convierten y que el historial quedaría falseado.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | En el primer arranque, el sistema debe pedir el nombre y el país de residencia, y nada más. |
| FR-002 | El país seleccionado debe determinar la moneda, el símbolo monetario, el separador de miles y decimales, y el formato de fecha. |
| FR-003 | La moneda derivada del país debe poder cambiarse manualmente. |
| FR-004 | La configuración inicial debe completarse en una sola pantalla. |
| FR-005 | La pantalla de inicio debe mostrar un saludo que incluya el nombre del usuario. |
| FR-006 | El saludo debe variar según la franja horaria, si el usuario registró recientemente y su actividad del período. |
| FR-007 | Los mensajes de saludo deben provenir de un conjunto de plantillas predefinidas. No se generan con el modelo de lenguaje. |
| FR-008 | Ningún mensaje debe reprochar, juzgar ni culpabilizar el gasto del usuario. |
| FR-009 | El saludo debe ser el canal donde aparecen los avisos accionables de la aplicación (D-035). |
| FR-010 | El usuario debe poder cambiar su nombre desde los ajustes en cualquier momento. |
| FR-011 | La moneda solo puede cambiarse mientras no exista ningún movimiento registrado. Después el sistema debe impedirlo y explicar el motivo. |
| FR-012 | El nombre, el país y la moneda pertenecen a cada usuario y no son valores globales de la aplicación. |

## 5. Reglas de negocio

- **RN-001** — Se pregunta el **país de residencia**, no la nacionalidad: la moneda
  depende de dónde vive el usuario, no de dónde nació.
- **RN-002** — Cada usuario opera en una única moneda, propia de su cuenta. No
  existen movimientos en monedas distintas dentro de una misma cuenta ni conversión
  entre ellas (D-022). La moneda de un usuario no afecta a la de otro.
- **RN-003** — Los montos ya registrados no se reinterpretan al cambiar de moneda.
  De ahí la restricción de FR-011.
- **RN-004** — El tono de todos los mensajes es cálido y neutro. Un mensaje
  culpabilizante en una aplicación de finanzas personales consigue que el usuario
  deje de abrirla (D-024).

## 6. Criterios de aceptación

1. Los cinco escenarios E1–E5 se ejecutan correctamente.
2. La configuración inicial no pide ningún dato además del nombre y el país.
3. Los montos se formatean correctamente para al menos tres monedas distintas,
   incluyendo una con separadores invertidos respecto a otra.
4. Ningún mensaje de saludo se genera consultando al modelo de lenguaje.
5. Con movimientos registrados, el sistema impide cambiar la moneda.
6. La moneda de un usuario no altera la de ningún otro.

## 7. Métricas de éxito

- El usuario completa la configuración inicial sin abandonar.
- El usuario reconoce la aplicación como suya desde el primer uso.
