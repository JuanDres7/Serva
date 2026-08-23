# Finzen — contexto para agentes

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
| 000 — Cuentas y acceso | ✅ | — | sí, previa a todo |
| 001 — Registro y consulta de movimientos | ✅ | ✅ | **construida** |
| 002 — Categorización automática | ✅ | ✅ | **construida** |
| 003 — Chat sobre tus finanzas | ✅ | — | sí |
| 004 — Configuración inicial y personalización | ✅ | — | sí |
| 005 — Presupuestos | decisiones | — | no |
| 006 — Metas de ahorro | decisiones | — | no |
| 007 — Movimientos recurrentes | decisiones | — | no |
| 008 — Gráficos y visualización | ✅ | — | sí |
| 009 — Exportación de datos | ✅ | — | sí |

La numeración identifica la feature; no es el orden de construcción.

**Siguiente paso:** feature 003 (chat sobre tus finanzas). Las features 001 y 002
están construidas; `npm run verify` pasa con 228 comprobaciones, ninguna de las
cuales requiere un modelo instalado.

## Documentos

| Archivo | Qué contiene |
|---|---|
| `.specify/memory/constitution.md` | Principios innegociables (v2.0.0). Vinculantes. |
| `docs/vision.md` | Qué es Finzen, para quién y qué no es. |
| `docs/decisiones.md` | Las 55 decisiones tomadas, con su razón. |
| `docs/metodo.md` | Cómo se trabaja: SDD y Loop Engineering. |
| `specs/NNN-*/spec.md` | Qué hace cada feature. |
| `specs/NNN-*/plan.md` | Cómo se construye. |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
