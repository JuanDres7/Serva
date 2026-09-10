# Graph Report - Serva  (2026-09-09)

## Corpus Check
- 284 files · ~228,313 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1285 nodes · 3557 edges · 83 communities (50 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Chat & Asistente IA
- Deudas y Pr?stamos
- Dominio de Fechas
- Historial & Base de Datos
- Dependencias IA y UI
- Config del Proyecto
- Ajustes y Recurrentes
- Filtros del Historial
- API Routes y Auth Layout
- Metas de Ahorro
- B?squeda y Propuestas IA
- Skills y Constitution
- Schema de Auth
- P?ginas de Datos
- Auth y Recuperaci?n
- Balance y Comparaci?n
- Tipos de Referencia
- Propuestas y Herramientas IA
- Tabla del Historial
- Acciones del Chat
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 53
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 66
- Community 67
- Community 69
- Community 72
- Community 73

## God Nodes (most connected - your core abstractions)
1. `crearHerramientas()` - 58 edges
2. `cn()` - 53 edges
3. `toISO()` - 52 edges
4. `ensureUserSettings()` - 48 edges
5. `todayIn()` - 48 edges
6. `requireUserId()` - 43 edges
7. `db` - 32 edges
8. `addDays()` - 30 edges
9. `formatMoney()` - 30 edges
10. `findCategory()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Database Setup (Docker Compose)` --semantically_similar_to--> `Serva Agent Context`  [INFERRED] [semantically similar]
  docker-compose.yml → CLAUDE.md
- `Constitución de Serva` --semantically_similar_to--> `Serva Agent Context`  [INFERRED] [semantically similar]
  .specify/memory/constitution.md → CLAUDE.md
- `Desglose()` --calls--> `findCategory()`  [EXTRACTED]
  components/chat-visuales.tsx → lib/domain/categories.ts
- `TableFooter()` --calls--> `cn()`  [EXTRACTED]
  components/ui/table.tsx → lib/utils.ts
- `TableCaption()` --calls--> `cn()`  [EXTRACTED]
  components/ui/table.tsx → lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **SDD Cycle Pipeline** — claude_skills_speckit-specify_skill_speckit_specify, claude_skills_speckit-plan_skill_speckit_plan, claude_skills_speckit-tasks_skill_speckit_tasks, claude_skills_speckit-implement_skill_speckit_implement [EXTRACTED 1.00]
- **Document Templates** — specify_templates_spec-template_md_spec_template, specify_templates_plan-template_md_plan_template, specify_templates_tasks-template_md_tasks_template, specify_templates_constitution-template_md_constitution_template, specify_templates_checklist-template_md_checklist_template [INFERRED 0.85]
- **Requirements Quality Commands** — claude_skills_speckit-analyze_skill_speckit_analyze, claude_skills_speckit-checklist_skill_speckit_checklist, claude_skills_speckit-clarify_skill_speckit_clarify, claude_skills_speckit-specify_skill_speckit_specify [INFERRED 0.75]
- **Spec Driven Development workflow completo** — concept_constitucion, concept_documento_jerarquia, concept_spec_driven_development, concept_necesita_aclaracion, concept_loop_engineering, concept_oraculo, concept_tres_reintentos, concept_estado_en_tasks [EXTRACTED 1.00]
- **Sistema de categorización automática: cascada, validación y degradación** — concept_cascada_categorizacion, concept_degradacion, concept_confianza_como_real, concept_mejor_con_el_uso, concept_zod_validacion_total, concept_ia_para_lo_ambiguo [EXTRACTED 1.00]
- **Filosofía de producto: acompañar sin reprochar** — concept_no_reprochar, concept_saludo_personalizado, concept_aviso_al_80, concept_metas_no_residuo, specs_005_presupuestos_spec_md, specs_006_metas_de_ahorro_spec_md [EXTRACTED 1.00]
- **Sistema de escritura conversacional (features 010-012)** — puerta, assistant_writes, proponer_movimientos, proponer_correccion, proponer_anulacion, proponer_deuda, proponer_abono, proponer_saldar_deuda, propone_no_escribe, saldos_se_derivan [INFERRED 0.85]
- **Patrón de búsqueda de entidades por nombre/etiqueta** — buscar_meta_por_nombre, buscar_recurrente_por_descripcion, buscar_presupuesto_por_categoria, busqueda_bidireccional [EXTRACTED 1.00]
- **Dominio de deudas: tablas, enum, funciones y pantalla** — debts_table, debt_payments_table, debt_direction, debt_flow, movement_type_debt, deudas_domain, pantalla_deudas [EXTRACTED 1.00]

## Communities (83 total, 13 thin omitted)

### Community 0 - "Chat & Asistente IA"
Cohesion: 0.05
Nodes (46): POST(), AsistentePage(), Chat(), nuevaConversacion(), Parte, SUGERENCIAS, comoLista(), comoMayores() (+38 more)

### Community 1 - "Deudas y Pr?stamos"
Cohesion: 0.09
Nodes (51): DeudasPage(), colorDeEstado(), DeudaTarjeta(), enviarAbono(), DeudaVista, abonarADeuda(), darPorSaldada(), eliminarDeuda() (+43 more)

### Community 2 - "Dominio de Fechas"
Cohesion: 0.09
Nodes (46): addDays(), addMonths(), civilDate, civilDateClamped(), CivilDateError, compareDates(), daysBetween(), fromEpochDay() (+38 more)

### Community 3 - "Historial & Base de Datos"
Cohesion: 0.11
Nodes (37): HistorialTabla(), user, client, db, confirmarCobro(), contarPendientes(), crearRecurrente(), EntradaRecurrente (+29 more)

### Community 4 - "Dependencias IA y UI"
Cohesion: 0.04
Nodes (49): ai, @ai-sdk/google, @ai-sdk/openai-compatible, @ai-sdk/react, @base-ui/react, better-auth, class-variance-authority, clsx (+41 more)

### Community 5 - "Config del Proyecto"
Cohesion: 0.04
Nodes (48): dotenv, drizzle-kit, eslint, eslint-config-next, description, devDependencies, dotenv, drizzle-kit (+40 more)

### Community 6 - "Ajustes y Recurrentes"
Cohesion: 0.08
Nodes (31): EliminarCuenta(), PendientesRecurrentes(), Badge(), badgeVariants, Calendar(), CalendarDayButton(), Card(), CardAction() (+23 more)

### Community 7 - "Filtros del Historial"
Cohesion: 0.10
Nodes (38): ETIQUETAS_TIPO, FiltrosHistorial(), Props, FilaEdicion(), guardar(), FilaNueva(), guardar(), MetaTarjeta() (+30 more)

### Community 8 - "API Routes y Auth Layout"
Cohesion: 0.07
Nodes (27): { GET, POST }, GET(), AppLayout(), EntrarPage(), PROMESAS, FormularioAcceso(), MenuDeCuenta(), ASISTENTE (+19 more)

### Community 9 - "Metas de Ahorro"
Cohesion: 0.10
Nodes (37): MetasPage(), aportarAMeta(), borrarMeta(), mensaje(), nuevaMeta(), refrescar(), Resultado, TIPOS_ACEPTADOS (+29 more)

### Community 10 - "B?squeda y Propuestas IA"
Cohesion: 0.07
Nodes (42): Tabla assistant_writes, buscarMetaPorNombre, buscarPresupuestoPorCategoria, buscarRecurrentePorDescripcion, Búsqueda bidireccional por nombre/etiqueta, confirmarRecurrente, debt_direction enum, debt_flow enum (+34 more)

### Community 11 - "Skills y Constitution"
Cohesion: 0.08
Nodes (39): Serva Agent Context, speckit-analyze, speckit-checklist, speckit-clarify, speckit-constitution, speckit-converge, speckit-implement, speckit-plan (+31 more)

### Community 12 - "Schema de Auth"
Cohesion: 0.06
Nodes (34): account, accountRelations, session, sessionRelations, userRelations, verification, assistantWriteKind, AssistantWriteRow (+26 more)

### Community 13 - "P?ginas de Datos"
Cohesion: 0.16
Nodes (26): AjustesPage(), desplazar(), HistorialPage(), Params, InicioPage(), CifraAnimada(), paso(), EtiquetaPeriodo() (+18 more)

### Community 14 - "Auth y Recuperaci?n"
Cohesion: 0.18
Nodes (12): DIAS_SEMANA, Forma, OPCIONES, Modo, FormularioNuevaContrasena(), FormularioRestablecer(), MetaVista, DIRECCIONES (+4 more)

### Community 15 - "Balance y Comparaci?n"
Cohesion: 0.14
Nodes (21): BreakdownEntry, CategoryAmount, compareWithPrevious(), Comparison, PeriodAggregates, PeriodTotals, sumBreakdown(), add() (+13 more)

### Community 16 - "Tipos de Referencia"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 17 - "Propuestas y Herramientas IA"
Cohesion: 0.13
Nodes (24): aUnidadMenor(), prepararMovimientos(), prepararUno(), buscarDeudaPorContraparte(), clavesCategoria, ContextoHerramientas, crearHerramientas(), Herramientas (+16 more)

### Community 18 - "Tabla del Historial"
Cohesion: 0.13
Nodes (22): FilaLectura(), MovimientoVista, Props, Table(), TableBody(), TableCaption(), TableCell(), TableFooter() (+14 more)

### Community 19 - "Acciones del Chat"
Cohesion: 0.17
Nodes (19): Estado, estadoInicial(), leyenda(), Movimiento, Salida, TarjetaDeAccion(), cancelarAccion(), confirmarAccion() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (18): BuscarEnHistorial, CoincidenciaHistorial, Mecanismo, ResultadoCategorizacion, UMBRAL_CONFIANZA, construirMensaje(), EntradaSugerencia, ESPERA_MAXIMA_MS (+10 more)

### Community 21 - "Community 21"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 22 - "Community 22"
Cohesion: 0.19
Nodes (19): BorrarRecurrente(), aTextoEditable(), FilaPendiente(), confirmar(), PendienteVista, Props, aUnidades(), PresupuestosLista() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.19
Nodes (19): MovimientoListo, aplicarAnulacion(), aplicarCorreccion(), aplicarCreacion(), automaticoActivo(), guardarPropuesta(), haCaducado(), HORAS_DE_VIGENCIA (+11 more)

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (16): clavesCategoria, MovimientoIncompleto, MovimientoPropuesto, movimientoPropuestoSchema, Preparacion, propuestaSchema, Decision, MAXIMO_POR_MENSAJE (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.21
Nodes (16): GASTOS, generador(), generarDatosDeEjemplo(), INGRESOS, Plantilla, RECURRENTES, ResultadoEjemplo, soloLaPrimera() (+8 more)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (14): BienvenidaPage(), FormularioBienvenida(), guardarConfiguracionInicial(), Resultado, completarConfiguracion(), DEFAULTS, ensureUserSettings(), getUserSettings() (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (13): metadata, mono, sans, aplicar(), ElegirTema(), elegir(), SeguirAlSistema(), Toaster() (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.23
Nodes (12): SugerenciaParaUI, sugerirCategoria(), VACIA, categorizar(), crearProveedor(), buscarPorPalabrasClave(), confirmarCategorizacion(), EntradaLog (+4 more)

### Community 29 - "Community 29"
Cohesion: 0.19
Nodes (13): contarEnAviso(), EntradaPresupuesto, listarPresupuestos(), PresupuestoConGasto, presupuestosConGasto(), ResultadoBusquedaPresupuesto, SugerenciaCategoria, sugerenciasDeTope() (+5 more)

### Community 30 - "Community 30"
Cohesion: 0.23
Nodes (13): Find-SpecifyRoot(), Format-SpecKitCommand(), Get-CurrentBranch(), Get-FeaturePathsEnv(), Get-InvokeSeparator(), Get-NormalizedPriority(), Get-Python3Command(), Get-RepoRoot() (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (12): resolverPeriodo(), evolucion(), TotalesDePeriodo, previousPeriod(), acumularPeriodo(), compararRitmo(), GastoDiario, PuntoEvolucion (+4 more)

### Community 32 - "Community 32"
Cohesion: 0.32
Nodes (10): GET(), PresupuestosPage(), RecurrentesPage(), RegistroPage(), estadoDePresupuesto(), mensajeDePresupuesto(), fromISO(), todayIn() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.27
Nodes (11): ConfigurarCiclo(), definirCiclo(), definirPresupuesto(), mensaje(), quitarPresupuesto(), refrescar(), Resultado, eliminarPresupuesto() (+3 more)

### Community 34 - "Community 34"
Cohesion: 0.24
Nodes (10): presupuestoSchema, recurrenteSchema, transactionInputSchema, BY_KEY, CATEGORIES, Category, CategoryError, fallbackFor() (+2 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (11): Categorías fijas predeterminadas, Deudas como cuarto tipo de movimiento, Historial-tabla (vista unificada), El ahorro es una decisión, no un residuo, Saldo derivado del historial, no almacenado, Tipos de movimiento (ingreso, gasto, ahorro, deuda), Spec 001 — Registro y consulta de movimientos, Plan técnico — Feature 002 (+3 more)

### Community 36 - "Community 36"
Cohesion: 0.18
Nodes (11): Las cinco capas de Serva, Drizzle elegido sobre Prisma, lib/actions/ — Server Actions, lib/ai/ — capa de IA, lib/db/ — base de datos, lib/domain/ — lógica pura, Puerta de decisión (lib/domain/puerta.ts), Rechazo deliberado a microservicios, colas, Redis, GraphQL (+3 more)

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (10): Alertas al 80%, no al 100%, Ciclo configurable (no mes calendario), Moneda única configurable, Nunca reprochar ni juzgar el gasto, Recurrentes: preguntar en lugar de asumir, Saludo personalizado por plantillas, Spec 004 — Configuración inicial y personalización, Spec 005 — Presupuestos (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (9): Aislamiento estructural por usuario, Datos de ejemplo al crear cuenta, Dinero en enteros (centavos), Fechas civiles (no instantes), Migraciones aplicadas no se editan, Anulación en vez de eliminación (Art. VII), Spec 000 — Cuentas y acceso, Plan técnico — Feature 001 (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (7): EstadoPresupuesto, MensajePresupuesto, NivelPresupuesto, RECORTE_SUGERIDO, redondearSugerencia(), sugerirTope(), UMBRAL_AVISO

### Community 40 - "Community 40"
Cohesion: 0.43
Nodes (6): BorrarEjemplo(), CargarEjemplo(), borrarDatosDeEjemplo(), cargarDatosDeEjemplo(), ResultadoEjemplo, eliminarDatosDeEjemplo()

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (8): El modelo no escribe — propone y una función pura decide, Cascada de categorización de tres niveles, Confianza como real (único float permitido), Fecha hablada (lib/domain/fecha-hablada.ts), Serva AI escribe con activación en el chat (D-066), IA para lo ambiguo, código para lo determinista, Categorización que mejora con el uso del propio usuario, pgvector en la misma base de datos

### Community 42 - "Community 42"
Cohesion: 0.36
Nodes (5): BANCO, BANCO_DE_DEUDAS, CasoDeDeuda, CasoDeFrase, UMBRAL_DE_ACIERTO

### Community 43 - "Community 43"
Cohesion: 0.43
Nodes (3): HuecoEncabezado(), HuecoLista(), HuecoTotales()

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (7): Conversación guardada siete días en servidor, Degradación gracefully ante fallos de IA, Añadir herramienta: dos mitades (lógica + encaminar en chat-visuales), Conjunto cerrado de herramientas del chat, Plan técnico — Feature 003, Spec 003 — Chat sobre tus finanzas, Tareas — Feature 003

### Community 45 - "Community 45"
Cohesion: 0.43
Nodes (4): construirSaludo(), ContextoSaludo, franja(), Saludo

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (4): CambiarNombre(), cambiarNombre(), Resultado, updateDisplayName()

### Community 48 - "Community 48"
Cohesion: 0.40
Nodes (5): Barras horizontales, no gráficos circulares, Tres gráficos fijos (distribución, evolución, ritmo), Alcance MVP (features 001-009), Serva como proyecto de portafolio, Registro Fácil

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (4): Diseñado para escritorio, funcional en móvil, Menú de cuenta (nombre como botón), Modo oscuro con tokens CSS, Sistema visual propio (crema, salvia, terracota)

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (4): Arquitectura de Serva, Registro de decisiones, Método de trabajo, Visión de Serva

## Knowledge Gaps
- **325 isolated node(s):** `Params`, `PROMESAS`, `{ GET, POST }`, `sans`, `mono` (+320 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 449 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ensureUserSettings()` connect `Community 26` to `Chat & Asistente IA`, `Community 32`, `Deudas y Pr?stamos`, `Community 33`, `Historial & Base de Datos`, `Ajustes y Recurrentes`, `API Routes y Auth Layout`, `Metas de Ahorro`, `Community 40`, `P?ginas de Datos`, `Tabla del Historial`, `Acciones del Chat`, `Community 22`, `Community 23`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `cn()` connect `Ajustes y Recurrentes` to `Tabla del Historial`, `Auth y Recuperaci?n`, `Filtros del Historial`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `toISO()` connect `Historial & Base de Datos` to `Community 32`, `Deudas y Pr?stamos`, `Dominio de Fechas`, `Ajustes y Recurrentes`, `Metas de Ahorro`, `P?ginas de Datos`, `Propuestas y Herramientas IA`, `Tabla del Historial`, `Community 23`, `Community 24`, `Community 25`, `Community 29`, `Community 31`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `Params`, `PROMESAS`, `{ GET, POST }` to the rest of the system?**
  _325 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chat & Asistente IA` be split into smaller, more focused modules?**
  _Cohesion score 0.052917232021709636 - nodes in this community are weakly interconnected._
- **Should `Deudas y Pr?stamos` be split into smaller, more focused modules?**
  _Cohesion score 0.0893707033315706 - nodes in this community are weakly interconnected._
- **Should `Dominio de Fechas` be split into smaller, more focused modules?**
  _Cohesion score 0.09209039548022599 - nodes in this community are weakly interconnected._