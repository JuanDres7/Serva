# Serva — contexto para agentes

Gestor de finanzas personales con IA. Registro manual de movimientos, con
categorización automática y consulta en lenguaje natural sobre los propios datos.
Visión completa y límites del producto: `docs/vision.md`.

## Antes de escribir código

1. Lee `.specify/memory/constitution.md`. Es vinculante y gana ante cualquier otra
   instrucción.
2. Lee la spec de la feature en curso en `specs/`.
3. Si algo no está en la spec, **no lo implementes**: márcalo y pregunta.

## Reglas que se violan con más frecuencia

- **Montos: enteros en centavos, jamás `number` en coma flotante para aritmética.**
  Un `amountCents: number` entero es aceptable; un `amount: 15.30` no lo es nunca.
- Toda salida de LLM pasa por un esquema Zod antes de tocar la base de datos.
- La IA propone; el usuario confirma. Nada generado por IA se persiste sin marcar
  su origen y su confianza.
- Los saldos se derivan del historial. No hay campo `balance` que se actualice.
- No agregues dependencias, abstracciones ni configurabilidad que la spec no pida.

## Stack

Next.js (App Router) · TypeScript estricto · PostgreSQL con pgvector · Drizzle ORM ·
Better Auth · Zod · Tailwind con shadcn/ui · Recharts · Vercel AI SDK · date-fns ·
Vitest y Playwright. Despliegue en Vercel y Neon. Todo gratuito por ahora (D-042).

Justificación en D-039. Detalle de aplicación en el `plan.md` de cada feature.

## Estado del proyecto

| Feature | Spec | Plan | En el MVP |
|---|---|---|---|
| 000 — Cuentas y acceso | ✅ | — | **construida** |
| 001 — Registro y consulta de movimientos | ✅ | ✅ | **construida** |
| 002 — Categorización automática | ✅ | ✅ | **construida** |
| 003 — Chat sobre tus finanzas | ✅ | ✅ | **construida** |
| 004 — Configuración inicial y personalización | ✅ | — | **construida** |
| 005 — Presupuestos | ✅ | — | **construida** |
| 006 — Metas de ahorro | ✅ | — | **construida** |
| 007 — Movimientos recurrentes | ✅ | — | **construida** |
| 008 — Gráficos y visualización | ✅ | — | **construida** |
| 009 — Exportación de datos | ✅ | — | **construida** |
| 010 — Registrar y programar hablando | ✅ | ✅ | **construida** |
| 011 — Deudas y préstamos | — | — | prevista, depende de 010 |

La numeración identifica la feature; no es el orden de construcción.

**Las diez features están construidas.** `npm run verify` pasa con 453
comprobaciones, ninguna de las cuales requiere un modelo instalado.

**El chat dibuja y recuerda** desde la revisión de la spec 003: las respuestas
llevan gráfico cuando la pregunta es de distribución o comparación, y la
conversación se guarda siete días (D-067, D-068).

**El asistente está verificado en ejecución** con Gemini: elige bien la
herramienta, las cifras coinciden y respeta sus límites (D-057). Con modelo local
en esta máquina no es viable (D-056).

**La interfaz tiene sistema visual propio** desde D-062: crema, salvia y
terracota, con `.eyebrow` para etiquetas y `.cifra` para montos. Los tokens
viven en `app/globals.css`; no metas colores sueltos de la paleta de Tailwind.
Y desde D-070 hay modo oscuro: **ningún color puede quedar fijo fuera de los
tokens**, ni siquiera dentro de un gráfico. Si escribes un hex en un `.tsx`, en
oscuro se verá mal.

**Serva AI escribe** desde la feature 010: registra, corrige, anula y programa
cobros a partir de lo que se le cuenta. **El modelo no escribe: propone, y una
función pura decide** (`lib/domain/puerta.ts`). Antes de tocar esa puerta o las
herramientas `proponer*`, lee la spec 010 entera.

La extracción se evalúa aparte con `npm run evaluar`, contra el proveedor real:
10 de 10 en la última medida (D-069). Nunca dentro de `verify`.

**Siguiente paso:** la feature 011, deudas y préstamos como entidad. Y desplegar
en Vercel y Neon.

**Ojo con la 010:** levanta la garantía de solo lectura del asistente (D-066).
Antes de tocar `lib/ai/tools.ts` para añadir escritura, lee la spec entera.

## Documentos

| Archivo | Qué contiene |
|---|---|
| `.specify/memory/constitution.md` | Principios innegociables (v2.0.0). Vinculantes. |
| `docs/vision.md` | Qué es Serva, para quién y qué no es. |
| `docs/arquitectura.md` | Capas, rutas, stack y por qué cada pieza. El mapa. |
| `docs/decisiones.md` | Las 71 decisiones tomadas, con su razón. |
| `docs/metodo.md` | Cómo se trabaja: SDD y Loop Engineering. |
| `specs/NNN-*/spec.md` | Qué hace cada feature. |
| `specs/NNN-*/plan.md` | Cómo se construye. |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
