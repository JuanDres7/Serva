# Graph Report - Serva  (2026-09-18)

## Corpus Check
- 302 files · ~239,983 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 1, .ico 1)

## Summary
- 1902 nodes · 4483 edges · 129 communities (91 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 96 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7e2165f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- queries/conversations.ts
- deudas.ts
- civil-date.ts
- vitest
- dependencies
- devDependencies
- cn
- historial-tabla.tsx
- session.ts
- queries/goals.ts
- 4. Escenarios
- Constitución de Serva
- db/schema.ts
- 0000_chilly_captain_america.sql
- next
- navegacion.tsx
- compilerOptions
- tools.ts
- 3. Escenarios
- "categorization_log"
- provider.ts
- components.json
- requireUserId
- assistant-writes.ts
- chat-accion.tsx
- queries/sample-data.ts
- onboarding.ts
- app/layout.tsx
- 0012_deudas.sql
- queries/transactions.ts
- common.ps1
- 3. Escenarios
- 0010_conversaciones.sql
- actions/budgets.ts
- categories.ts
- Deudas como cuarto tipo de movimiento
- Cascada de categorización de tres niveles
- Nunca reprochar ni juzgar el gasto
- Aislamiento estructural por usuario
- presupuestos/page.tsx
- sonner.tsx
- 3. Escenarios
- @playwright/test
- loading.tsx
- Conversación guardada siete días en servidor
- "recurring_movements"
- create-new-feature.ps1
- ensureUserSettings
- Plan técnico — Feature 002
- (paginas)/layout.tsx
- Sistema visual propio (crema, salvia, terracota)
- registro-facil.tsx
- actions/categorize.ts
- privacidad/page.tsx
- "savings_goals"
- "budgets"
- propuesta.ts
- 3. Escenarios
- package.json
- Spec 013 — Encoder para categorización semántica
- postcss.config.mjs
- File icon SVG
- Next.js logo SVG
- queries/recurring.ts
- 3. Escenarios
- actions/debts.ts
- speckit-taskstoissues
- Stack gratuito en su nivel de uso
- Spec 004 — Configuración inicial y personalización
- { signIn, signUp, signOut, useSession }
- 3. Escenarios
- 3. Escenarios
- pnpm workspace config
- Globe icon SVG
- Spec 008 — Gráficos y visualización
- 3. Escenarios
- "assistant_writes"
- Spec 009 — Exportación de datos
- Spec NNN — [NOMBRE DE LA FEATURE]
- dotenv
- scripts
- auth.ts
- Plan técnico — Feature 010
- Spec 010 — Registrar y programar hablando
- Core Principles
- Plan técnico — Feature NNN
- chat/route.ts
- menu-de-cuenta.tsx
- Tareas — Feature 010
- Tareas — Feature NNN
- auth-schema.ts
- Specification Quality Checklist: Cuentas y acceso
- Specification Quality Checklist: Registro y consulta de movimientos
- Specification Quality Checklist: Categorización automática
- Specification Quality Checklist: Chat sobre tus finanzas
- Specification Quality Checklist: Configuración inicial y personalización
- Specification Quality Checklist: Presupuestos
- Specification Quality Checklist: Metas de ahorro
- Specification Quality Checklist: Movimientos recurrentes
- Specification Quality Checklist: Gráficos y visualización
- Specification Quality Checklist: Exportación de datos
- Specification Quality Checklist: Registrar y programar hablando
- Specification Quality Checklist: Deudas y préstamos
- Specification Quality Checklist: IA expandida — metas, presupuestos y recurrentes
- Specification Quality Checklist: Encoder para categorización semántica
- [CHECKLIST TYPE] Checklist: [FEATURE NAME]
- parseAmount
- Categorías fijas predeterminadas
- Ciclo configurable (no mes calendario)
- Dinero en enteros (centavos)
- Añadir herramienta: dos mitades (lógica + encaminar en chat-visuales)
- Fechas civiles (no instantes)
- Historial-tabla (vista unificada)
- El ahorro es una decisión, no un residuo
- Migraciones aplicadas no se editan
- Moneda única configurable
- Recurrentes: preguntar en lugar de asumir
- Saldo derivado del historial, no almacenado

## God Nodes (most connected - your core abstractions)
1. `crearHerramientas()` - 62 edges
2. `cn()` - 53 edges
3. `toISO()` - 52 edges
4. `next` - 49 edges
5. `ensureUserSettings()` - 48 edges
6. `todayIn()` - 48 edges
7. `requireUserId()` - 43 edges
8. `vitest` - 41 edges
9. `drizzle-orm` - 35 edges
10. `parseAmount()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `1. La decisión que gobierna todo el diseño` --references--> `registrarMovimiento()`  [INFERRED]
  .specify/specs/010-acciones-conversacionales/plan.md → lib/actions/transactions.ts
- `5. Degradación` --references--> `categorizar()`  [INFERRED]
  .specify/specs/013-encoder-categorizacion/plan.md → lib/ai/categorize.ts
- `7. Lo que este plan valida contra la constitución` --references--> `categorizar()`  [INFERRED]
  .specify/specs/013-encoder-categorizacion/plan.md → lib/ai/categorize.ts
- `4. Requisitos funcionales` --references--> `categorizar()`  [INFERRED]
  .specify/specs/013-encoder-categorizacion/spec.md → lib/ai/categorize.ts
- `7. Lo que este plan valida contra la constitución` --references--> `prepararMeta()`  [INFERRED]
  .specify/specs/012-ia-metas-presupuestos-recurrentes/plan.md → lib/ai/tools.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **SDD Cycle Pipeline** — claude_skills_speckit-specify_skill_speckit_specify, claude_skills_speckit-plan_skill_speckit_plan, claude_skills_speckit-tasks_skill_speckit_tasks, claude_skills_speckit-implement_skill_speckit_implement [EXTRACTED 1.00]
- **Spec Driven Development workflow completo** — concept_constitucion, concept_documento_jerarquia, concept_spec_driven_development, concept_necesita_aclaracion, concept_loop_engineering, concept_oraculo, concept_tres_reintentos, concept_estado_en_tasks [EXTRACTED 1.00]
- **Requirements Quality Commands** — claude_skills_speckit-analyze_skill_speckit_analyze, claude_skills_speckit-checklist_skill_speckit_checklist, claude_skills_speckit-clarify_skill_speckit_clarify, claude_skills_speckit-specify_skill_speckit_specify [INFERRED 0.75]
- **Document Templates** — specify_templates_spec-template_md_spec_template, specify_templates_plan-template_md_plan_template, specify_templates_tasks-template_md_tasks_template, specify_templates_constitution-template_md_constitution_template, specify_templates_checklist-template_md_checklist_template [INFERRED 0.85]

## Communities (129 total, 38 thin omitted)

### Community 0 - "queries/conversations.ts"
Cohesion: 0.06
Nodes (40): Chat(), nuevaConversacion(), Parte, SUGERENCIAS, comoLista(), comoMayores(), Comparacion(), Desglose() (+32 more)

### Community 1 - "deudas.ts"
Cohesion: 0.07
Nodes (53): DeudasPage(), DeudaVista, ayerDe(), categoriaPorDefecto(), RegistroFacil(), guardar(), limpiar(), sumBreakdown() (+45 more)

### Community 2 - "civil-date.ts"
Cohesion: 0.15
Nodes (28): addDays(), addMonths(), civilDate, civilDateClamped(), CivilDateError, daysBetween(), fromEpochDay(), lastDayOfMonth() (+20 more)

### Community 3 - "vitest"
Cohesion: 0.11
Nodes (34): ContextoHerramientas, user, client, db, crearRecurrente(), createTransaction(), budgets, recurringMovements (+26 more)

### Community 4 - "dependencies"
Cohesion: 0.08
Nodes (26): dependencies, ai, @ai-sdk/google, @ai-sdk/openai-compatible, @ai-sdk/react, @base-ui/react, better-auth, class-variance-authority (+18 more)

### Community 5 - "devDependencies"
Cohesion: 0.14
Nodes (14): devDependencies, dotenv, drizzle-kit, eslint, eslint-config-next, @playwright/test, tailwindcss, @tailwindcss/postcss (+6 more)

### Community 6 - "cn"
Cohesion: 0.07
Nodes (36): AjustesPage(), EliminarCuenta(), Badge(), badgeVariants, buttonVariants, Calendar(), CalendarDayButton(), Card() (+28 more)

### Community 7 - "historial-tabla.tsx"
Cohesion: 0.12
Nodes (25): FilaEdicion(), guardar(), FilaLectura(), FilaNueva(), guardar(), MovimientoVista, Props, Table() (+17 more)

### Community 8 - "session.ts"
Cohesion: 0.21
Nodes (10): GET(), RegistroPage(), EntrarPage(), PROMESAS, BienvenidaPage(), FormularioAcceso(), Marca(), leerImagen() (+2 more)

### Community 9 - "queries/goals.ts"
Cohesion: 0.10
Nodes (35): MetasPage(), Vacio(), aportarAMeta(), borrarMeta(), mensaje(), nuevaMeta(), refrescar(), Resultado (+27 more)

### Community 10 - "4. Escenarios"
Cohesion: 0.06
Nodes (34): 1. Contexto y motivación, 2. Alcance, 3. Usuario, 4. Escenarios, 5. Requisitos funcionales, 6. Reglas de negocio, 7. Criterios de aceptación, 8. Métricas de éxito (+26 more)

### Community 11 - "Constitución de Serva"
Cohesion: 0.07
Nodes (42): Serva Agent Context, speckit-analyze, speckit-checklist, speckit-clarify, speckit-constitution, speckit-converge, speckit-implement, speckit-plan (+34 more)

### Community 12 - "db/schema.ts"
Cohesion: 0.08
Nodes (39): abonar(), comoAbonos(), comoDeuda(), crearDeuda(), descartarDeuda(), DeudaConAbonos, deudaSchema, leerDeuda() (+31 more)

### Community 13 - "0000_chilly_captain_america.sql"
Cohesion: 0.18
Nodes (15): "account", account_userId_idx, "session", session_userId_idx, "public"."user", "transactions", transactions_user_category_idx, transactions_user_date_idx (+7 more)

### Community 14 - "next"
Cohesion: 0.16
Nodes (18): DIAS_SEMANA, Forma, OPCIONES, Modo, FormularioNuevaContrasena(), FormularioRestablecer(), MetaVista, DIRECCIONES (+10 more)

### Community 15 - "navegacion.tsx"
Cohesion: 0.27
Nodes (9): ASISTENTE, esActiva(), Marcador, MARCADOR_QUIETO, NavegacionCompacta(), NavegacionLateral(), SECCIONES, seccionesDe() (+1 more)

### Community 16 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 17 - "tools.ts"
Cohesion: 0.08
Nodes (52): InicioPage(), EtiquetaPeriodo(), nombrarPeriodo(), buscarDeudaPorContraparte(), clavesCategoria, crearHerramientas(), Herramientas, MetaChatInput (+44 more)

### Community 18 - "3. Escenarios"
Cohesion: 0.04
Nodes (46): 1. La decisión que gobierna todo el diseño, 2.1 `debts` — la entidad, 2.2 `debt_payments` — los abonos, 2.3 `transactions` — el cuarto tipo, 2.4 Migración, 2. Modelo de datos, 3. El dominio, 4. Las escrituras del asistente (+38 more)

### Community 19 - ""categorization_log""
Cohesion: 0.31
Nodes (7): "categorization_log", categorization_user_date_idx, categorization_user_idx, categorization_user_keywords_idx, "public"."transactions", "public"."user", categorization_log_embedding_idx

### Community 20 - "provider.ts"
Cohesion: 0.12
Nodes (23): BuscarEnHistorial, BuscarSimilares, CoincidenciaHistorial, Mecanismo, ResultadoCategorizacion, UMBRAL_CONFIANZA, construirMensaje(), crearModelo() (+15 more)

### Community 21 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 22 - "requireUserId"
Cohesion: 0.20
Nodes (17): BorrarEjemplo(), CargarEjemplo(), borrarRecurrente(), confirmarPendiente(), mensaje(), nuevoRecurrente(), refrescar(), reprogramarPendiente() (+9 more)

### Community 23 - "assistant-writes.ts"
Cohesion: 0.14
Nodes (30): confirmarAccion(), confirmarYActivar(), MENSAJES, Resultado, MovimientoListo, proponerSobreExistente(), activarAutomatico(), aplicarAnulacion() (+22 more)

### Community 24 - "chat-accion.tsx"
Cohesion: 0.05
Nodes (43): Estado, estadoInicial(), leyenda(), Movimiento, Salida, TarjetaDeAccion(), cancelarAccion(), refrescar() (+35 more)

### Community 25 - "queries/sample-data.ts"
Cohesion: 0.19
Nodes (18): categorizar(), GASTOS, generador(), generarDatosDeEjemplo(), INGRESOS, Plantilla, RECURRENTES, ResultadoEjemplo (+10 more)

### Community 26 - "onboarding.ts"
Cohesion: 0.19
Nodes (12): FormularioBienvenida(), guardarConfiguracionInicial(), Resultado, completarConfiguracion(), buscarPais(), Pais, PAIS_POR_DEFECTO, PAISES (+4 more)

### Community 27 - "app/layout.tsx"
Cohesion: 0.18
Nodes (13): app_globals, metadata, mono, sans, aplicar(), ElegirTema(), elegir(), SeguirAlSistema() (+5 more)

### Community 28 - "0012_deudas.sql"
Cohesion: 0.32
Nodes (7): "debt_payments", debt_payments_debt_idx, "debts", debts_user_settled_idx, "public"."transactions", "public"."user", "public"."debts"

### Community 29 - "queries/transactions.ts"
Cohesion: 0.17
Nodes (21): GET(), desplazar(), HistorialPage(), Params, HistorialTabla(), countTransactions(), getTransaction(), ListFilters (+13 more)

### Community 30 - "common.ps1"
Cohesion: 0.23
Nodes (13): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-NormalizedPriority(), Get-Python3Command(), Get-RepoRoot() (+5 more)

### Community 31 - "3. Escenarios"
Cohesion: 0.05
Nodes (38): 1. La decisión que gobierna todo el diseño, 2. Las herramientas, 3. Estructura, 4. Streaming, 5. Límites del asistente, 6. Degradación, 7. Verificación sin modelo, Plan técnico — Feature 003 (+30 more)

### Community 32 - "0010_conversaciones.sql"
Cohesion: 0.38
Nodes (6): "chat_messages", chat_messages_conversation_idx, "conversations", conversations_user_recent_idx, "public"."user", "public"."conversations"

### Community 33 - "actions/budgets.ts"
Cohesion: 0.26
Nodes (11): ConfigurarCiclo(), aUnidades(), PresupuestosLista(), definirCiclo(), definirPresupuesto(), mensaje(), quitarPresupuesto(), refrescar() (+3 more)

### Community 34 - "categories.ts"
Cohesion: 0.18
Nodes (14): presupuestoSchema, buscarPorPalabrasClave(), EntradaLog, recurrenteSchema, transactionInputSchema, CategorizationLogRow, BY_KEY, CATEGORIES (+6 more)

### Community 36 - "Cascada de categorización de tres niveles"
Cohesion: 0.08
Nodes (25): El modelo no escribe — propone y una función pura decide, Barras horizontales, no gráficos circulares, Cascada de categorización de tres niveles, Las cinco capas de Serva, Confianza como real (único float permitido), Datos de ejemplo al crear cuenta, Drizzle elegido sobre Prisma, Fecha hablada (lib/domain/fecha-hablada.ts) (+17 more)

### Community 37 - "Nunca reprochar ni juzgar el gasto"
Cohesion: 0.67
Nodes (3): Alertas al 80%, no al 100%, Nunca reprochar ni juzgar el gasto, Saludo personalizado por plantillas

### Community 39 - "presupuestos/page.tsx"
Cohesion: 0.27
Nodes (12): PresupuestosPage(), sugerenciasDeTope(), estadoDePresupuesto(), EstadoPresupuesto, mensajeDePresupuesto(), MensajePresupuesto, NivelPresupuesto, promedioPorPeriodo() (+4 more)

### Community 40 - "sonner.tsx"
Cohesion: 0.50
Nodes (3): Toaster(), lucide-react, next-themes

### Community 41 - "3. Escenarios"
Cohesion: 0.05
Nodes (38): 1. La decisión que gobierna todo el diseño, 2.2 Escritura (6 herramientas), 2.3 Búsqueda por nombre, 2.4 Resolución de periodicidad, 2. Herramientas del asistente, 3. Modelo de datos, 4. La pieza crítica: búsqueda y resolución de entidades, 5. Degradación (+30 more)

### Community 42 - "@playwright/test"
Cohesion: 0.06
Nodes (6): @playwright/test, BANCO, BANCO_DE_DEUDAS, CasoDeDeuda, CasoDeFrase, UMBRAL_DE_ACIERTO

### Community 43 - "loading.tsx"
Cohesion: 0.43
Nodes (3): HuecoEncabezado(), HuecoLista(), HuecoTotales()

### Community 45 - ""recurring_movements""
Cohesion: 0.67
Nodes (3): "recurring_movements", recurring_user_due_idx, "public"."user"

### Community 47 - "ensureUserSettings"
Cohesion: 0.18
Nodes (14): AsistentePage(), AppLayout(), CambiarNombre(), MenuDeCuenta(), cambiarNombre(), Resultado, hayProveedor(), DEFAULTS (+6 more)

### Community 48 - "Plan técnico — Feature 002"
Cohesion: 0.05
Nodes (37): 1. Qué decide este plan, 2. Proveedor de modelo (resuelve P-016), 3. Arquitectura, 4. La cascada, 5. Datos, 6. Validación y degradación, 7. Integración con Registro Fácil, 8. El oráculo (+29 more)

### Community 50 - "Sistema visual propio (crema, salvia, terracota)"
Cohesion: 0.50
Nodes (4): Diseñado para escritorio, funcional en móvil, Menú de cuenta (nombre como botón), Modo oscuro con tokens CSS, Sistema visual propio (crema, salvia, terracota)

### Community 51 - "registro-facil.tsx"
Cohesion: 0.19
Nodes (18): ETIQUETAS_TIPO, FiltrosHistorial(), Props, Forma, NuevoRecurrente(), COLOR_POR_NIVEL, NuevoPresupuesto(), PresupuestoVista (+10 more)

### Community 52 - "actions/categorize.ts"
Cohesion: 0.10
Nodes (25): SugerenciaParaUI, sugerirCategoria(), VACIA, codificar(), embeddingAVector(), lib_ai_encoder_encoderdisponible, buscarSimilares(), codificarYGuardar() (+17 more)

### Community 54 - ""savings_goals""
Cohesion: 0.67
Nodes (3): goals_user_idx, "savings_goals", "public"."user"

### Community 55 - ""budgets""
Cohesion: 0.67
Nodes (3): budget_user_category_uidx, "budgets", "public"."user"

### Community 56 - "propuesta.ts"
Cohesion: 0.13
Nodes (23): aUnidadMenor(), clavesCategoria, MovimientoIncompleto, MovimientoPropuesto, movimientoPropuestoSchema, Preparacion, prepararMovimientos(), prepararUno() (+15 more)

### Community 57 - "3. Escenarios"
Cohesion: 0.11
Nodes (18): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, 7. Métricas de éxito, Dentro (+10 more)

### Community 58 - "package.json"
Cohesion: 0.08
Nodes (24): eslintConfig, description, license, name, overrides, zod, private, version (+16 more)

### Community 59 - "Spec 013 — Encoder para categorización semántica"
Cohesion: 0.05
Nodes (37): 1. La decisión que gobierna todo el diseño, 2. Contratos, 3. Modelo de datos, 4. La pieza crítica: el servicio de encoding, 5. Degradación, 6. Verificación sin modelo, 7. Lo que este plan valida contra la constitución, 8. Lo que este plan deja abierto para `tasks.md` (+29 more)

### Community 63 - "queries/recurring.ts"
Cohesion: 0.11
Nodes (30): RecurrentesPage(), BorrarRecurrente(), PendientesRecurrentes(), confirmarCobro(), fechaDesdeISO(), listarRecurrentes(), pendientesDeConfirmar(), periodicidadDe() (+22 more)

### Community 64 - "3. Escenarios"
Cohesion: 0.11
Nodes (17): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, Dentro, E1 — Definir un recurrente (+9 more)

### Community 65 - "actions/debts.ts"
Cohesion: 0.24
Nodes (12): colorDeEstado(), DeudaTarjeta(), enviarAbono(), abonarADeuda(), darPorSaldada(), eliminarDeuda(), MOTIVOS, reabrirDeuda() (+4 more)

### Community 68 - "Spec 004 — Configuración inicial y personalización"
Cohesion: 0.12
Nodes (16): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, 7. Métricas de éxito, Dentro (+8 more)

### Community 70 - "3. Escenarios"
Cohesion: 0.12
Nodes (16): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, Dentro, E1 — Primera visita (+8 more)

### Community 71 - "3. Escenarios"
Cohesion: 0.12
Nodes (16): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, Dentro, E1 — Crear una meta (+8 more)

### Community 78 - "Spec 008 — Gráficos y visualización"
Cohesion: 0.12
Nodes (16): 1. Contexto y motivación, 2. Alcance, 3. Los tres gráficos, 4. Escenarios, 5. Requisitos funcionales, 6. Reglas de negocio, 7. Criterios de aceptación, 8. Métricas de éxito (+8 more)

### Community 79 - "3. Escenarios"
Cohesion: 0.12
Nodes (16): 3. Escenarios, E10 — Registrar y preguntar en la misma frase, E11 — Parte del mensaje está incompleta, E12 — Demasiado de golpe, E13 — El modelo no está disponible, E14 — Entendió mal y lo veo después, E1 — Varios movimientos en una sola frase, E2 — Falta un dato para poder registrar (+8 more)

### Community 80 - ""assistant_writes""
Cohesion: 0.67
Nodes (3): "assistant_writes", assistant_writes_user_status_idx, "public"."user"

### Community 81 - "Spec 009 — Exportación de datos"
Cohesion: 0.13
Nodes (14): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, 7. Métricas de éxito, Dentro (+6 more)

### Community 82 - "Spec NNN — [NOMBRE DE LA FEATURE]"
Cohesion: 0.13
Nodes (14): 1. Contexto y motivación, 2. Alcance, 3. Escenarios, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, 7. Métricas de éxito, 8. Riesgo conocido (+6 more)

### Community 84 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, db:down, db:generate, db:migrate, db:up, dev, evaluar (+6 more)

### Community 85 - "auth.ts"
Cohesion: 0.22
Nodes (10): GET, POST, auth, Session, Correo, correoDeRestablecimiento(), correoDeVerificacion(), enviarCorreo() (+2 more)

### Community 87 - "Plan técnico — Feature 010"
Cohesion: 0.18
Nodes (11): 10. Dependencia de orden con la spec 003, 11. Lo que este plan deja abierto para `tasks.md`, 1. La decisión que gobierna todo el diseño, 2. Las herramientas nuevas, 4. La puerta, 6. Encaminar por fecha, 7. Degradación, 8. Verificación sin modelo (+3 more)

### Community 88 - "Spec 010 — Registrar y programar hablando"
Cohesion: 0.18
Nodes (11): 1. Contexto y motivación, 2. Alcance, 4. Requisitos funcionales, 5. Reglas de negocio, 6. Criterios de aceptación, 7. Métricas de éxito, 8. Riesgo conocido, 9. Aclaraciones resueltas (+3 more)

### Community 89 - "Core Principles"
Cohesion: 0.18
Nodes (10): Core Principles, Governance, [PRINCIPLE_1_NAME], [PRINCIPLE_2_NAME], [PRINCIPLE_3_NAME], [PRINCIPLE_4_NAME], [PRINCIPLE_5_NAME], [PROJECT_NAME] Constitution (+2 more)

### Community 90 - "Plan técnico — Feature NNN"
Cohesion: 0.20
Nodes (9): 1. La decisión que gobierna todo el diseño, 2. [Contratos / herramientas / interfaces], 3. Modelo de datos, 4. [La pieza crítica], 5. Degradación, 6. Verificación sin modelo, 7. Lo que este plan valida contra la constitución, 8. Lo que este plan deja abierto para `tasks.md` (+1 more)

### Community 91 - "chat/route.ts"
Cohesion: 0.47
Nodes (7): POST(), instruccionesDelAsistente(), instruccionesSinHerramientas(), sufijoSinRazonamiento(), hayToolSupport(), modeloDeChat(), guardarConversacion()

### Community 93 - "Tareas — Feature 010"
Cohesion: 0.20
Nodes (10): Fase 1 — La puerta, Fase 2 — Modelo de datos, Fase 3 — Extracción, Fase 4 — Las herramientas, Fase 5 — Ejecución y puerta de confirmación, Fase 6 — Interfaz, Fase 7 — Salvaguardas y cierre, Lo que no se puede verificar sin ejecutar un modelo (+2 more)

### Community 95 - "Tareas — Feature NNN"
Cohesion: 0.25
Nodes (7): Cierre de la feature, Fase 1 — [Nombre de la fase], Fase 2 — [...], Fase N — Cierre, Lo que no se puede verificar sin ejecutar un modelo, Orden de ataque, Tareas — Feature NNN

### Community 96 - "auth-schema.ts"
Cohesion: 0.29
Nodes (6): account, accountRelations, session, sessionRelations, userRelations, verification

### Community 97 - "Specification Quality Checklist: Cuentas y acceso"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Cuentas y acceso

### Community 98 - "Specification Quality Checklist: Registro y consulta de movimientos"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Registro y consulta de movimientos

### Community 99 - "Specification Quality Checklist: Categorización automática"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Categorización automática

### Community 100 - "Specification Quality Checklist: Chat sobre tus finanzas"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Chat sobre tus finanzas

### Community 101 - "Specification Quality Checklist: Configuración inicial y personalización"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Configuración inicial y personalización

### Community 102 - "Specification Quality Checklist: Presupuestos"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Presupuestos

### Community 103 - "Specification Quality Checklist: Metas de ahorro"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Metas de ahorro

### Community 104 - "Specification Quality Checklist: Movimientos recurrentes"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Movimientos recurrentes

### Community 105 - "Specification Quality Checklist: Gráficos y visualización"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Gráficos y visualización

### Community 106 - "Specification Quality Checklist: Exportación de datos"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Exportación de datos

### Community 107 - "Specification Quality Checklist: Registrar y programar hablando"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Registrar y programar hablando

### Community 108 - "Specification Quality Checklist: Deudas y préstamos"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Deudas y préstamos

### Community 109 - "Specification Quality Checklist: IA expandida — metas, presupuestos y recurrentes"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: IA expandida — metas, presupuestos y recurrentes

### Community 110 - "Specification Quality Checklist: Encoder para categorización semántica"
Cohesion: 0.33
Nodes (5): Content Quality, Feature Readiness, Notes, Requirement Completeness, Specification Quality Checklist: Encoder para categorización semántica

### Community 111 - "[CHECKLIST TYPE] Checklist: [FEATURE NAME]"
Cohesion: 0.40
Nodes (4): [Category 1], [Category 2], [CHECKLIST TYPE] Checklist: [FEATURE NAME], Notes

### Community 112 - "parseAmount"
Cohesion: 0.17
Nodes (23): CifraAnimada(), paso(), MetaTarjeta(), mover(), NuevaDeuda(), guardar(), limpiar(), NuevaMeta() (+15 more)

## Knowledge Gaps
- **754 isolated node(s):** `Params`, `PROMESAS`, `GET`, `POST`, `sans` (+749 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 917 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `queries/conversations.ts`, `cn`, `historial-tabla.tsx`, `session.ts`, `queries/goals.ts`, `navegacion.tsx`, `tools.ts`, `requireUserId`, `assistant-writes.ts`, `chat-accion.tsx`, `onboarding.ts`, `app/layout.tsx`, `queries/transactions.ts`, `actions/budgets.ts`, `ensureUserSettings`, `(paginas)/layout.tsx`, `registro-facil.tsx`, `privacidad/page.tsx`, `package.json`, `actions/debts.ts`, `menu-de-cuenta.tsx`, `parseAmount`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `vitest` connect `vitest` to `queries/conversations.ts`, `deudas.ts`, `categories.ts`, `civil-date.ts`, `onboarding.ts`, `propuesta.ts`, `presupuestos/page.tsx`, `queries/goals.ts`, `db/schema.ts`, `tools.ts`, `provider.ts`, `assistant-writes.ts`, `chat-accion.tsx`, `queries/sample-data.ts`, `package.json`, `queries/transactions.ts`, `queries/recurring.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Tareas - Feature 012` connect `chat-accion.tsx` to `3. Escenarios`, `tools.ts`, `queries/recurring.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `crearHerramientas()` (e.g. with `2. Las herramientas nuevas` and `Herramienta del chat: `categorizar``) actually correct?**
  _`crearHerramientas()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Params`, `PROMESAS`, `GET` to the rest of the system?**
  _754 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `queries/conversations.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05701754385964912 - nodes in this community are weakly interconnected._
- **Should `deudas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06875 - nodes in this community are weakly interconnected._