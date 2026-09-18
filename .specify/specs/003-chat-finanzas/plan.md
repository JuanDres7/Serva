# Plan técnico — Feature 003

- **Spec:** [spec.md](./spec.md)
- **Estado:** aprobado
- **Creado:** 2026-08-23

---

## 1. La decisión que gobierna todo el diseño

**El modelo decide qué preguntar; los números los produce el sistema.**

Un modelo de lenguaje no calcula: predice texto. Si se le pidiera que sumara
gastos, devolvería cifras verosímiles y equivocadas, con total aplomo. Por eso la
única función del modelo aquí es elegir cuál de un conjunto cerrado de consultas
responde a lo que preguntó la persona, y redactar la respuesta con las cifras que
el sistema le devuelve.

De ahí se derivan las demás decisiones:

- **Conjunto cerrado de herramientas**, con parámetros validados por Zod. El
  modelo nunca ejecuta SQL ni recibe acceso libre a la base (Art. III.3).
- **Toda consulta va acotada al usuario de la sesión**, igual que en el resto del
  proyecto. La herramienta recibe el `userId` del servidor, no del modelo.
- **Si una consulta devuelve vacío, la respuesta lo dice.** Un conjunto vacío no
  es un cero.

## 2. Las herramientas

| Herramienta | Responde a |
|---|---|
| `totalesDelPeriodo` | «¿cuánto llevo gastado?», «¿cuánto me entró?» |
| `gastoPorCategoria` | «¿en qué se me fue la plata?» |
| `compararConPeriodoAnterior` | «¿gasté más que el mes pasado?» |
| `mayoresGastos` | «¿cuáles fueron mis gastos más grandes?» |
| `buscarMovimientos` | «¿cuánto he gastado en domicilios?» |
| `ritmoDelPeriodo` | «¿voy muy rápido este mes?» |

Seis, y ninguna más de las que hacen falta. Cada herramienta añadida es una
decisión más que el modelo puede equivocar.

## 3. Estructura

```
lib/ai/
├── tools.ts          Definición y ejecución de las herramientas
└── chat-prompt.ts    Instrucciones del asistente

app/api/chat/route.ts Punto de entrada, con streaming
components/chat-panel.tsx  Panel flotante
```

## 4. Streaming

La respuesta se envía a medida que se genera. No es un adorno: en el plan
gratuito de Vercel las funciones tienen un tiempo máximo de ejecución, y un
modelo local en CPU tarda segundos en producir un párrafo. Sin streaming el
usuario miraría una pantalla quieta y, en el peor caso, la función se cortaría
antes de responder (D-040).

## 5. Límites del asistente

Escritos en las instrucciones y verificados por prueba:

- **Solo lectura.** No hay herramientas que registren, modifiquen ni anulen nada.
- **No recomienda inversiones ni productos financieros** (Art. II.4). Las
  sugerencias de ahorro describen el gasto propio del usuario y nada más.
- **Si no puede responder, lo dice.** Antes inventar una cifra que reconocer un
  límite es exactamente el fallo que destruye la confianza.
- **Con poco historial, advierte** en lugar de sacar conclusiones de tres días.

## 6. Degradación

| Situación | Comportamiento |
|---|---|
| `AI_PROVIDER=none` | El botón del chat no aparece; el resto de la aplicación, intacta |
| El modelo falla o tarda | Mensaje de que el asistente no está disponible |
| Una herramienta falla | El asistente lo dice; no inventa el dato |

## 7. Verificación sin modelo

Igual que en la feature 002, ninguna prueba puede exigir un modelo instalado:

1. **Las herramientas se prueban directamente**, sin modelo: se les pasan
   parámetros y se comprueba que sus cifras coinciden con el cálculo directo.
2. **El aislamiento se prueba con dos usuarios**, como en el resto del proyecto.
3. **La degradación se prueba apagando el proveedor**, que es justo la
   configuración por defecto.

Lo que no se puede verificar automáticamente es la calidad de la redacción ni el
acierto del modelo eligiendo herramienta. Eso exige ejecutarlo, y queda como
comprobación manual documentada.
