# Spec 009 — Exportación de datos

- **Estado:** aprobada
- **Creada:** 2026-08-22
- **Depende de:** 001
- **Decisiones aplicables:** D-036 · Artículo VI de la constitución

---

## 1. Contexto y motivación

El Artículo VI obliga a que el usuario pueda llevarse la totalidad de sus datos.
Pero cumplir esa obligación con un volcado técnico sería cumplirla solo en el
papel: nadie abre un archivo así para revisar sus gastos.

La gente revisa, filtra y hace cuentas en hojas de cálculo. Exportar en ese formato
convierte una obligación en una funcionalidad útil: permite hacer con los datos
cosas que Serva no hace.

## 2. Alcance

### Dentro

- Exportación de los movimientos a un archivo de hoja de cálculo abrible en Excel.
- Exportación total o por rango de fechas.
- Montos exportados como valores numéricos, no como texto.

### Fuera

- Importación de datos.
- Exportación de gráficos o informes con formato.
- Envío del archivo a servicios externos: se guarda en el equipo del usuario.
- Programación de exportaciones automáticas.

## 3. Escenarios

### E1 — Exportar todo el historial

**Dado** que tengo movimientos registrados,
**cuando** exporto mis datos,
**entonces** obtengo un archivo que puedo abrir en Excel, con una fila por
movimiento y las columnas separadas.

### E2 — Exportar un rango

**Dado** que solo me interesan unos meses concretos,
**cuando** elijo un rango de fechas y exporto,
**entonces** el archivo contiene únicamente los movimientos de ese rango.

### E3 — Hacer cuentas sobre lo exportado

**Dado** que abrí el archivo exportado,
**cuando** sumo la columna de montos con las funciones de la hoja de cálculo,
**entonces** el total coincide exactamente con el que muestra Serva.

### E4 — Sin datos

**Dado** que no tengo movimientos en el rango elegido,
**cuando** intento exportar,
**entonces** el sistema me lo indica en lugar de generar un archivo vacío sin
explicación.

## 4. Requisitos funcionales

| ID | Requisito |
|---|---|
| FR-001 | El sistema debe permitir exportar los movimientos a un archivo de hoja de cálculo abrible en Excel. |
| FR-002 | La exportación debe incluir: fecha, tipo, categoría, monto, descripción original, descripción corta, origen de la categoría, estado de anulación y fechas de creación y modificación. |
| FR-003 | Los montos deben exportarse como valores numéricos sumables por la hoja de cálculo, no como texto. |
| FR-004 | La moneda debe quedar indicada en el archivo. |
| FR-005 | El sistema debe permitir exportar todo el historial o un rango de fechas. |
| FR-006 | Los movimientos anulados deben incluirse, identificados como tales. |
| FR-007 | Las fechas deben exportarse en un formato que la hoja de cálculo reconozca como fecha. |
| FR-008 | Los encabezados de columna deben estar en el idioma de la aplicación y ser comprensibles sin documentación. |
| FR-009 | Cuando no haya movimientos en el rango elegido, el sistema debe informarlo en lugar de generar un archivo vacío. |
| FR-010 | El archivo debe guardarse en el equipo del usuario. No se envía a ningún servicio externo. |

## 5. Reglas de negocio

- **RN-001** — La exportación es una lectura: no altera ningún dato.
- **RN-002** — Los montos exportados conservan la exactitud del original. La
  conversión a la representación de la hoja de cálculo no puede introducir errores
  de redondeo (Art. I).
- **RN-003** — Se exporta todo lo que el usuario ha registrado, sin omitir campos
  por considerarlos internos. Es su información (Art. VI.4).

## 6. Criterios de aceptación

1. Los cuatro escenarios E1–E4 se ejecutan correctamente.
2. El archivo exportado se abre en Excel sin advertencias ni pasos de conversión.
3. La suma de la columna de montos en la hoja de cálculo coincide exactamente con
   el total que muestra Serva para el mismo conjunto de movimientos, incluyendo
   casos con decimales.
4. Las fechas son reconocidas como fechas por la hoja de cálculo, no como texto.
5. La exportación no modifica ningún dato.
6. El archivo no se transmite fuera del equipo del usuario.

## 7. Métricas de éxito

- El usuario puede sumar, filtrar y ordenar sus movimientos en Excel sin ajustar
  nada del archivo.
- El usuario puede llevarse sus datos completos sin ayuda técnica.
