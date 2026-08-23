# Finzen

Gestor de finanzas personales donde registrar un movimiento toma segundos y
entender tus finanzas no exige saber de finanzas. En lugar de navegar reportes y
filtros, preguntas en tu propio idioma —*"¿en qué se me fue la plata este mes?"*— y
la IA responde con datos reales de tu historial.

> **Proyecto de demostración.** No introduzcas información financiera real. Quien
> lo despliegue con usuarios reales asume las obligaciones de protección de datos
> que correspondan.

## Cómo levantarlo

Necesitas **Node.js 20 o superior** y **Docker** (solo para la base de datos).

```bash
git clone <url-del-repositorio>
cd finzen
npm install
cp .env.example .env.local
docker compose up -d
npm run dev
```

La aplicación queda en `http://localhost:3000`.

El único valor que debes rellenar en `.env.local` para arrancar es
`BETTER_AUTH_SECRET`. Genera uno con:

```bash
openssl rand -base64 32
```

## Qué hace

Registrar gastos e ingresos en segundos, con la categoría sugerida a partir de lo
que escribes. Historial con filtros, edición y anulación reversible. Totales del
período comparados con el anterior, desglose por categoría, evolución de seis
períodos y ritmo de gasto día a día. Un asistente al que se le pregunta en
lenguaje natural sobre los propios datos. Exportación a hoja de cálculo.

## La IA es opcional

Finzen funciona sin ningún modelo instalado. La categorización automática y el chat
se desactivan; todo lo demás —registro, historial, totales, gráficos— funciona
igual.

Se elige con una sola variable en `.env.local`:

| Valor | Qué hace |
|---|---|
| `AI_PROVIDER=none` | Sin IA. Categorización manual. **Arranca sin instalar nada** |
| `AI_PROVIDER=ollama` | Modelo local. Gratuito y tus datos no salen del equipo |
| `AI_PROVIDER=gemini` | API de nube. Requiere una clave propia |

### Si eliges el modelo local

Instala [Ollama](https://ollama.com) y descarga el modelo indicado en
`OLLAMA_MODEL`.

**Ten en cuenta antes de probarlo:** un modelo pequeño necesita del orden de 4 a
5 GB de memoria libre. Sin tarjeta gráfica dedicada se ejecuta en el procesador:
funciona, pero cada categorización tarda segundos, no milisegundos. No es que la
aplicación vaya lenta — es el modelo pensando en tu CPU.

## Verificación

Un solo comando decide si el proyecto está bien:

```bash
npm run verify
```

Encadena comprobación de tipos, lint, pruebas de dominio, pruebas de base de datos
y pruebas de extremo a extremo en navegador. Si pasa, el proyecto está sano.

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run verify` | Verificación completa |
| `npm run test:unit` | Solo pruebas rápidas, sin navegador |
| `npm run db:up` / `db:down` | Base de datos local |

## Cómo está construido este proyecto

Finzen se desarrolla con **Spec Driven Development** y **Loop Engineering**: lo que
se construye se decide en documentos antes de escribirse, y cada cambio se verifica
automáticamente en lugar de revisarse a mano.

Si vienes a ver el código, quizá te interese más esto:

| Documento | Qué contiene |
|---|---|
| [Visión](docs/vision.md) | Qué es Finzen, para quién y qué **no** es |
| [Constitución](.specify/memory/constitution.md) | Los principios innegociables del proyecto |
| [Decisiones](docs/decisiones.md) | Cada decisión tomada, por qué, y las que se revirtieron |
| [Método](docs/metodo.md) | Cómo se trabaja |
| [Specs](specs/) | Qué hace cada funcionalidad, escrito antes de construirla |

El registro de decisiones incluye las descartadas y las revertidas, con su
razonamiento intacto. Es lo que evita volver a discutir lo ya resuelto.

## Stack

Next.js · TypeScript · PostgreSQL con pgvector · Drizzle · Better Auth · Zod ·
Tailwind con shadcn/ui · Recharts · Vercel AI SDK · Vitest y Playwright.

La justificación de cada elección está en
[decisiones.md](docs/decisiones.md) (D-039).
