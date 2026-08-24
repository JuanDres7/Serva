# Cómo trabajamos en Serva

Dos métodos que se complementan: **Spec Driven Development** define *qué* se
construye; **Loop Engineering** define *cómo* se ejecuta cada iteración.

## Spec Driven Development

El flujo por cada feature, sin saltarse pasos:

```
constitución  →  spec.md  →  plan.md  →  tasks.md  →  implementación
   (una vez)      (qué)       (cómo)     (pasos)      (código)
```

| Artefacto | Responde | Regla dura |
|---|---|---|
| `.specify/memory/constitution.md` | ¿Qué es innegociable? | Se escribe una vez; modificarlo versiona el documento. |
| `specs/NNN-nombre/spec.md` | ¿Qué y por qué? | Cero tecnología. Ambigüedades marcadas, no adivinadas. |
| `specs/NNN-nombre/plan.md` | ¿Cómo? | Stack, modelo de datos, contratos. Se valida contra la constitución. |
| `specs/NNN-nombre/tasks.md` | ¿En qué orden? | Tareas atómicas, cada una con su criterio de verificación. |

**La puerta de control:** no se pasa de `spec.md` a `plan.md` mientras quede un
`[NECESITA ACLARACIÓN]` sin resolver. Ese marcador es el mecanismo que impide que
el agente invente requisitos.

Cuando la implementación revela algo que la spec no contemplaba, se actualiza la
spec y se baja de nuevo. El código nunca es la fuente de verdad del comportamiento.

## Loop Engineering

Cada tarea de `tasks.md` se ejecuta como un ciclo cerrado:

```
   ┌─────────────────────────────────────────────┐
   │  1. Contexto: tarea + spec + constitución   │
   │  2. Implementar el cambio mínimo            │
   │  3. Verificar  ← el comando único           │
   │  4. ¿Falla? → volver a 2 con el error       │
   │     ¿Pasa?  → cerrar tarea, siguiente       │
   └─────────────────────────────────────────────┘
```

Condiciones para que el loop funcione:

1. **Oráculo automático.** Un solo comando decide pasa/falla. Existe antes de la
   primera feature (Art. IV). Sin él no hay loop.
2. **Tareas pequeñas.** Si una tarea no se verifica en una corrida, es demasiado
   grande: pártela en `tasks.md`.
3. **Tope de reintentos.** Tres intentos fallidos sobre la misma tarea significan
   que el problema está en la spec o en el diseño, no en el código. Se sube un
   nivel en lugar de seguir iterando.
4. **Estado fuera del contexto.** El progreso vive en `tasks.md`, no en la memoria
   de la conversación. Cualquier sesión nueva debe poder retomar leyendo el repo.

### Antipatrones

- Debilitar una aserción para que el ciclo pase. Prohibido (Art. IV.4).
- Ampliar el alcance dentro del loop: si aparece algo fuera de la tarea, se anota,
  no se implementa.
- Iterar sin leer el error real.
