# Serva

Gestor de finanzas personales donde registrar un movimiento toma segundos y
entender tus finanzas no exige saber de finanzas. En lugar de navegar reportes y
filtros, preguntas en tu propio idioma —*"¿en qué se me fue la plata este mes?"*— y
la IA responde con datos reales de tu historial.

> **Proyecto de demostración.** No introduzcas información financiera real. Quien
> lo despliegue con usuarios reales asume las obligaciones de protección de datos
> que correspondan.

## Cómo levantarlo

Cinco pasos. Tardan unos diez minutos, casi todos esperando a `npm install`.

### Lo que necesitas antes

| | Para qué | Cómo comprobarlo |
|---|---|---|
| **Node.js 20 o superior** | Ejecutar la aplicación | `node --version` |
| **Docker** | Solo la base de datos, no la aplicación | `docker --version` |
| **Git** | Traer el código | `git --version` |

No hace falta instalar PostgreSQL: viene dentro del contenedor. Tampoco hace
falta ninguna IA para arrancar.

### 1. Traer el código e instalar

```bash
git clone https://github.com/JuanDres7/Serva.git
cd Serva
npm install
```

### 2. Levantar la base de datos

```bash
docker compose up -d
```

Arranca PostgreSQL con pgvector en el **puerto 5433** del anfitrión, no en el
5432. Es a propósito: así no choca con un PostgreSQL que ya tengas instalado,
que es lo habitual en una máquina de desarrollo.

Comprueba que quedó arriba:

```bash
docker compose ps
```

### 3. Configurar el entorno

```bash
cp .env.example .env.local
```

De todo lo que hay en ese archivo, **solo una variable es obligatoria** para
arrancar: `BETTER_AUTH_SECRET`. Sin ella no se pueden abrir sesiones. Genera
una:

```bash
openssl rand -base64 32
```

Y pega el resultado entre las comillas:

```
BETTER_AUTH_SECRET="el-valor-que-acabas-de-generar"
```

En Windows sin `openssl`, vale cualquier cadena larga y aleatoria; en PowerShell:

```bash
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

Lo demás —IA, correo— es opcional y se explica más abajo.

### 4. Crear las tablas

```bash
npm run db:migrate
```

**Este paso no se puede saltar.** El contenedor del paso 2 levanta una base de
datos vacía; las tablas las crean las migraciones. Si lo omites, la aplicación
arranca y falla al primer intento de registrarte.

### 5. Arrancar

```bash
npm run dev
```

Listo: `http://localhost:3000`.

### El primer uso

Al entrar te pedirá crear una cuenta y luego tu nombre y tu país, que es lo que
fija tu moneda y tu zona horaria. En el resumen encontrarás **«Ver con datos de
ejemplo»**: carga unos meses de movimientos ficticios para que puedas ver los
gráficos y el historial con algo dentro. Se borran cuando quieras, desde el
mismo sitio.

## Qué hace

Registrar gastos e ingresos en segundos, con la categoría sugerida a partir de lo
que escribes. Historial con filtros, edición y anulación reversible. Totales del
período comparados con el anterior, desglose por categoría, evolución de seis
períodos y ritmo de gasto día a día. Un asistente al que se le pregunta en
lenguaje natural sobre los propios datos. Exportación a hoja de cálculo.

## La IA es opcional

Serva funciona sin ningún modelo instalado. La categorización automática y el chat
se desactivan; todo lo demás —registro, historial, totales, gráficos— funciona
igual.

Se elige con una sola variable en `.env.local`:

| Valor | Qué hace |
|---|---|
| `AI_PROVIDER=none` | Sin IA. Categorización manual. **Arranca sin instalar nada** |
| `AI_PROVIDER=ollama` | Modelo local. Gratuito y tus datos no salen del equipo |
| `AI_PROVIDER=gemini` | API de nube. Requiere una clave propia |

### Si eliges Gemini

Es la opción recomendada para verlo funcionando. Consigue una clave gratuita en
[Google AI Studio](https://aistudio.google.com/apikey) y ponla en `.env.local`:

```
AI_PROVIDER="gemini"
GOOGLE_GENERATIVE_AI_API_KEY="tu-clave"
```

Reinicia `npm run dev` y aparecerá **Serva AI** en la barra lateral.

> El plan gratuito de Gemini puede usar lo que se le envía para mejorar sus
> modelos. Está documentado en D-043, y es una de las razones por las que Serva
> pide no introducir información financiera real.

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

La primera vez hay que descargar el navegador que usan las pruebas:

```bash
npx playwright install chromium
```

Encadena comprobación de tipos, lint, pruebas de dominio, pruebas de base de datos
y pruebas de extremo a extremo en navegador. Si pasa, el proyecto está sano.

**Ninguna de sus comprobaciones necesita una IA instalada**, y es deliberado: el
oráculo tiene que dar el mismo resultado en cualquier máquina. Lo que solo se
puede comprobar con un modelo real vive aparte, en `npm run evaluar`.

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run verify` | Verificación completa |
| `npm run test:unit` | Solo pruebas rápidas, sin navegador |
| `npm run db:up` / `db:down` | Base de datos local |
| `npm run db:migrate` | Aplicar migraciones pendientes |
| `npm run evaluar` | Medir la extracción contra el modelo real. Necesita proveedor |

## Si algo no arranca

| Lo que ves | Qué pasa |
|---|---|
| `EADDRINUSE ... :3000` | Ya hay algo en ese puerto. Ciérralo, o arranca con `PORT=3001 npm run dev` |
| `relation "user" does not exist` | Falta el paso 4: `npm run db:migrate` |
| `ECONNREFUSED ... 5433` | La base no está arriba. `docker compose up -d` |
| No aparece **Serva AI** en la barra lateral | No hay proveedor configurado. Es el comportamiento correcto: mejor que no exista a que exista y no funcione |
| Las pruebas de navegador fallan al instante | Falta `npx playwright install chromium` |
| Arrancó pero no puedes entrar | `BETTER_AUTH_SECRET` está vacío en `.env.local` |

## Cómo está construido este proyecto

Serva se desarrolla con **Spec Driven Development** y **Loop Engineering**: lo que
se construye se decide en documentos antes de escribirse, y cada cambio se verifica
automáticamente en lugar de revisarse a mano.

Si vienes a ver el código, quizá te interese más esto:

| Documento | Qué contiene |
|---|---|
| [Visión](docs/vision.md) | Qué es Serva, para quién y qué **no** es |
| [Arquitectura](docs/arquitectura.md) | Capas, estructura de archivos, stack y para qué sirve cada pieza |
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

## Licencia

[MIT](LICENSE). Puedes usar, modificar y distribuir este código, incluso con
fines comerciales, conservando el aviso de copyright.
