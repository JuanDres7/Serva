# Spec 000 — Cuentas y acceso

- **Estado:** aprobada
- **Creada:** 2026-08-22
- **Depende de:** ninguna. Es previa a todas las demás
- **Decisiones aplicables:** D-038, D-039, D-041, D-045, D-046 · Artículo VI

---

## 1. Contexto y motivación

Finzen es una aplicación web que varias personas usan a la vez. Para que cada una
vea únicamente sus propias finanzas, el sistema necesita saber quién está
consultando. Eso es todo lo que esta feature aporta.

No es una funcionalidad de producto: nadie usa Finzen *para* tener una cuenta. Es
el mecanismo mínimo que hace posible el aislamiento entre usuarios, y se construye
con esa modestia — sin roles, sin permisos, sin equipos, sin organizaciones.

Es previa a todas las demás porque cada movimiento, cada categoría aprendida y cada
configuración pertenecen a alguien. Añadir el propietario después obligaría a
migrar todo lo construido.

## 2. Alcance

### Dentro

- Registro con correo y contraseña.
- Inicio y cierre de sesión.
- Verificación del correo.
- Restablecimiento de contraseña.
- Aislamiento de los datos por usuario.
- Poblar la cuenta con datos de ejemplo al crearla.
- Eliminación de la cuenta y de todos sus datos.
- Aviso de demostración, aviso de privacidad y autorización de tratamiento de datos.

### Fuera

- Espacios compartidos, familias o parejas.
- Roles y permisos.
- Inicio de sesión con proveedores externos.
- Autenticación en dos pasos.
- Recuperación de cuentas eliminadas.

## 3. Escenarios

### E1 — Crear una cuenta

**Dado** que llego a Finzen por primera vez,
**cuando** me registro con mi correo y una contraseña,
**entonces** entro a la aplicación y se me ofrece empezar de cero o poblarla con
datos de ejemplo.

### E2 — Empezar con datos de ejemplo

**Dado** que acabo de crear mi cuenta,
**cuando** elijo los datos de ejemplo,
**entonces** encuentro varios períodos de movimientos ya categorizados, con los
gráficos poblados y el asistente en condiciones de responder sobre ellos.

### E3 — Descartar los datos de ejemplo

**Dado** que probé con datos de ejemplo y quiero usar Finzen en serio,
**cuando** los elimino,
**entonces** desaparecen todos de una vez, sin dejar movimientos inventados
mezclados con los míos.

### E4 — Volver a entrar

**Dado** que ya tengo cuenta,
**cuando** inicio sesión,
**entonces** encuentro mis datos tal como los dejé.

### E5 — Olvidé la contraseña

**Dado** que no recuerdo mi contraseña,
**cuando** pido restablecerla,
**entonces** recibo un correo con un enlace temporal que me permite definir una
nueva.

### E6 — Nadie ve lo que no es suyo

**Dado** que hay varias personas usando Finzen al mismo tiempo,
**cuando** consulto cualquier pantalla,
**entonces** veo exclusivamente mis propios movimientos, categorías y
configuración.

### E7 — Irse del todo

**Dado** que quiero dejar de usar Finzen,
**cuando** elimino mi cuenta,
**entonces** puedo exportar mis datos antes y, al confirmar, todo lo mío se elimina.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir crear una cuenta con correo y contraseña. |
| FR-002 | Las contraseñas deben almacenarse con una función de derivación diseñada para contraseñas. Nunca en claro ni con un algoritmo de resumen genérico. |
| FR-003 | El sistema debe exigir una longitud mínima de contraseña e informar con claridad cuando no se cumpla. |
| FR-004 | El sistema debe verificar la propiedad del correo mediante un enlace enviado a esa dirección. |
| FR-005 | El sistema debe permitir restablecer la contraseña mediante un enlace temporal enviado al correo, de un solo uso y con caducidad. |
| FR-006 | El sistema debe permitir iniciar y cerrar sesión, y mantener la sesión entre visitas hasta que el usuario la cierre o caduque. |
| FR-007 | Toda consulta a datos debe estar acotada al usuario autenticado. No debe existir ninguna vía de acceso a datos sin esa restricción. |
| FR-008 | Toda página y operación que maneje datos del usuario debe rechazar peticiones sin sesión válida. |
| FR-009 | Los mensajes de error de inicio de sesión no deben revelar si un correo está registrado. |
| FR-010 | El sistema debe limitar los intentos de inicio de sesión y de restablecimiento por unidad de tiempo. |
| FR-011 | Al crear la cuenta, el sistema debe ofrecer poblarla con datos de ejemplo verosímiles, ya categorizados, cubriendo varios períodos. |
| FR-012 | Los datos de ejemplo deben quedar marcados como tales y poder eliminarse todos de una vez. |
| FR-013 | El sistema debe permitir eliminar la cuenta y todos sus datos, ofreciendo exportarlos antes. |
| FR-014 | Ningún dato sensible —descripciones, montos, correos— debe escribirse en los registros de diagnóstico. |

### Tratamiento de datos personales

| ID | Requisito |
|---|---|
| FR-015 | La pantalla de registro debe advertir de forma visible que Finzen es una aplicación de demostración y que no deben introducirse datos financieros reales. |
| FR-016 | El registro debe exigir una autorización explícita del tratamiento de datos. La casilla no puede venir marcada por defecto. |
| FR-017 | Debe existir un aviso de privacidad accesible desde el registro y desde los ajustes, que indique qué datos se guardan, con qué finalidad, que las descripciones se envían a un proveedor externo de IA para categorizarlas, y cómo eliminarlo todo. |
| FR-018 | El aviso de privacidad debe declarar que los datos se almacenan en servidores fuera de Colombia. |
| FR-019 | La eliminación de la cuenta debe advertir que es irreversible y ofrecer exportar antes de confirmar. |

## 5. Reglas de negocio

- **RN-001** — Todo dato del sistema pertenece a exactamente un usuario. No existen
  datos compartidos entre cuentas, salvo el catálogo fijo de categorías.
- **RN-002** — El aislamiento no se confía a la disciplina de quien escribe cada
  consulta: se garantiza estructuralmente y se verifica de forma automática
  (Art. VI.1).
- **RN-003** — La moneda, el nombre y la configuración son propios de cada usuario,
  no globales de la aplicación.
- **RN-004** — Eliminar la cuenta elimina de verdad. No hay recuperación posterior,
  y así debe advertirse antes de confirmar.
- **RN-005** — Los datos de ejemplo son indistinguibles de los reales en su
  comportamiento —se pueden editar, anular y consultar— pero permanecen
  identificables internamente para poder eliminarlos en bloque.
- **RN-006** — La advertencia de no introducir datos reales es la medida principal
  de protección: junto con los datos de ejemplo, lleva a que la mayoría de visitantes
  prueben con información inventada (D-050).
- **RN-007** — Una descripción de gasto puede contener información de salud
  —«consulta con el psiquiatra», «medicamentos»— sin que el usuario lo advierta. De
  ahí que el aviso de privacidad deba ser explícito sobre el envío de descripciones
  al proveedor de IA.

## 6. Criterios de aceptación

1. Los siete escenarios E1–E7 se ejecutan correctamente.
2. **Existe una prueba automática que falla si alguna consulta puede devolver datos
   de otro usuario.** Es el criterio más importante de esta spec.
3. Ninguna página con datos del usuario es accesible sin sesión válida.
4. Las contraseñas no son recuperables desde la base de datos.
5. Un enlace de restablecimiento usado o caducado deja de funcionar.
6. Los datos de ejemplo se eliminan por completo sin afectar a los movimientos
   creados por el usuario.
7. Los registros de diagnóstico no contienen descripciones, montos ni correos.
8. No es posible completar el registro sin marcar la autorización de tratamiento de
   datos, y esta nunca aparece marcada de antemano.
9. El aviso de demostración es visible antes de crear la cuenta, no después.

## 7. Métricas de éxito

- Quien visita el proyecto llega a ver la aplicación con datos en menos de un
  minuto desde que entra.
- Cero incidentes de datos visibles entre cuentas.
