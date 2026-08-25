/**
 * Esquema de datos de Serva.
 *
 * Reglas que rigen este esquema:
 * - Los montos son enteros de 64 bits en la unidad mínima de la moneda. Ningún
 *   tipo de coma flotante, en ninguna columna (Art. I).
 * - Nada se borra: la anulación es un estado (Art. VII).
 * - Toda tabla con datos de usuario lleva su propietario (Art. VI.1).
 * - Las restricciones viven también en la base, no solo en el código: la
 *   validación de la aplicación da buenos mensajes, la de la base hace imposible
 *   el dato inválido.
 */

import { sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import {
  bigint,
  boolean,
  customType,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export * from './auth-schema'

/** Los tres tipos de movimiento (D-028). */
/**
 * Qué clase de movimiento es.
 *
 * `debt` es el cuarto y entra con la feature 011. Un préstamo mueve dinero real
 * sin ser ingreso ni gasto, igual que un aporte a una meta: si te prestan
 * 200.000, el dinero está en tu bolsillo y no es tuyo.
 *
 * Es un valor del enum y no una bandera a propósito. TypeScript señala cada
 * `switch` que no lo contemple, y esa lista de errores es la lista de sitios
 * que hay que revisar. Una bandera habría que recordarla en los totales, los
 * presupuestos, los gráficos, la exportación y las herramientas del asistente,
 * y olvidarla en uno solo da una cifra equivocada sin error visible (D-073).
 */
export const movementType = pgEnum('movement_type', ['expense', 'income', 'saving', 'debt'])

/** En qué sentido se movió el dinero de una deuda. */
export const debtFlow = pgEnum('debt_flow', [
  /** Me prestaron: entró dinero que no es mío. */
  'received',
  /** Presté: salió dinero que vuelve. */
  'lent',
  /** Me devolvieron lo que presté. */
  'collected',
])

/** Quién le debe a quién. */
export const debtDirection = pgEnum('debt_direction', ['owed_by_me', 'owed_to_me'])

/** Anulación como estado, nunca borrado (Art. VII). */
export const movementStatus = pgEnum('movement_status', ['active', 'voided'])

/** Un ahorro entra a una meta o sale de ella (D-028). */
export const savingDirection = pgEnum('saving_direction', ['contribution', 'withdrawal'])

/**
 * Categorías como enumerado y no como tabla.
 *
 * El catálogo es fijo y vive en `lib/domain/categories.ts` (D-021). Replicarlo en
 * una tabla crearía dos fuentes de verdad que se desincronizan; como enumerado, la
 * base rechaza cualquier valor ajeno al catálogo. Una prueba verifica que ambas
 * listas coinciden exactamente.
 */
export const categoryKey = pgEnum('category_key', [
  'groceries',
  'eating_out',
  'transport',
  'housing',
  'utilities',
  'health',
  'education',
  'entertainment',
  'subscriptions',
  'shopping',
  'pets',
  'debt',
  'other_expense',
  'salary',
  'business',
  'gifts',
  'refunds',
  'other_income',
])

/** Cómo se categorizó un movimiento (spec 002, FR-006). */
/**
 * Quién creó la fila (spec 010, FR-011 · Art. II.2).
 *
 * `categorySource` dice cómo se eligió la categoría; esto dice quién escribió
 * el movimiento entero. Sin esta distinción, uno escrito por Serva sería
 * indistinguible de uno tecleado por la persona.
 */
export const movementOrigin = pgEnum('movement_origin', ['user', 'assistant'])

/** Qué se le pidió hacer a Serva. Coincide con `TipoDeAccion` de la puerta. */
export const assistantWriteKind = pgEnum('assistant_write_kind', [
  'crear',
  'corregir',
  'anular',
])

/**
 * En qué quedó una propuesta.
 *
 * `revertida` y `caducada` son estados terminales y existen desde el principio:
 * la tarjeta vive dentro de una conversación guardada, así que sigue en pantalla
 * días después. Sin un estado terminal en el servidor, pulsar «confirmar» en una
 * tarjeta vieja volvería a escribir lo mismo (FR-025).
 */
export const assistantWriteStatus = pgEnum('assistant_write_status', [
  'propuesta',
  'aplicada',
  'revertida',
  'rechazada',
  'caducada',
])

export const categorySource = pgEnum('category_source', [
  'user',
  'keywords',
  'similarity',
  'model',
])

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    type: movementType('type').notNull(),

    /** Entero en la unidad mínima de la moneda. Nunca coma flotante (Art. I). */
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    /** Nula solo cuando el movimiento es de tipo ahorro: su destino es la meta. */
    category: categoryKey('category'),
    categorySource: categorySource('category_source').notNull().default('user'),

    /**
     * Quién escribió este movimiento (spec 010, FR-011).
     *
     * El valor por defecto `'user'` es lo que hace segura la migración sobre lo
     * que ya existe: todo lo registrado hasta que Serva pudo escribir lo
     * escribió una persona, y eso es cierto.
     */
    createdBy: movementOrigin('created_by').notNull().default('user'),

    /**
     * La escritura de la que salió, cuando la escribió Serva. Es el puente que
     * permite llegar desde la fila hasta la frase que la originó.
     */
    /**
     * En qué sentido se movió el dinero, si este movimiento es de una deuda
     * (spec 011). Nulo en todos los demás.
     */
    debtFlow: debtFlow('debt_flow'),

    /** La deuda a la que pertenece, cuando la hay. */
    debtId: uuid('debt_id'),

    assistantWriteId: uuid('assistant_write_id').references(
      (): AnyPgColumn => assistantWrites.id,
      // Si la escritura desapareciera, el movimiento se queda: el historial del
      // dinero no se borra por perder su rastro (Art. VII).
      { onDelete: 'set null' },
    ),

    /** Fecha civil: un día del calendario, no un instante (plan 001, §4). */
    occurredOn: date('occurred_on').notNull(),

    /** Lo que escribió el usuario, tal cual. */
    description: text('description'),
    /** Versión corta y legible para el historial (D-012). */
    descriptionShort: text('description_short'),

    status: movementStatus('status').notNull().default('active'),
    voidedAt: timestamp('voided_at', { withTimezone: true }),

    /**
     * Datos de ejemplo, eliminables en bloque (D-046).
     *
     * Quien pruebe la aplicación y decida usarla en serio debe poder partir de
     * cero: movimientos inventados mezclados con los suyos falsearían todos sus
     * totales y contaminarían lo que la IA aprendió.
     */
    isSample: boolean('is_sample').notNull().default(false),

    // Previsto desde ahora para no migrar después (D-028). Sin interfaz hasta la
    // feature 006.
    savingGoalId: uuid('saving_goal_id'),
    savingDirection: savingDirection('saving_direction'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Historial y filtros por período.
    index('transactions_user_date_idx').on(table.userId, table.occurredOn.desc()),
    // Desglose por categoría.
    index('transactions_user_category_idx').on(
      table.userId,
      table.category,
      table.occurredOn,
    ),
    // Excluir anulados en todo agregado.
    index('transactions_user_status_idx').on(table.userId, table.status),

    check('amount_positive', sql`${table.amountCents} > 0`),
    check('date_not_future', sql`${table.occurredOn} <= CURRENT_DATE`),
    // Un ahorro va a una meta y un préstamo a una deuda; solo los gastos y los
    // ingresos tienen categoría. Un préstamo recibido no es de ninguna: no es
    // gasto (spec 011).
    check(
      'category_matches_type',
      sql`(${table.type} IN ('saving', 'debt') AND ${table.category} IS NULL)
          OR (${table.type} NOT IN ('saving', 'debt') AND ${table.category} IS NOT NULL)`,
    ),
  ],
)

/**
 * Configuración de cada usuario.
 *
 * En tabla aparte y no como columnas del usuario porque el esquema de
 * autenticación lo genera Better Auth y se regenera: lo añadido a mano allí se
 * perdería.
 */
export const userSettings = pgTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),

  displayName: text('display_name').notNull(),
  country: char('country', { length: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  locale: text('locale').notNull(),
  timeZone: text('time_zone').notNull(),

  /** Ciclo de períodos. Mes calendario por defecto (D-025, D-027). */
  cycleConfig: jsonb('cycle_config').notNull().default({ kind: 'calendar-month' }),

  /**
   * Cuándo se configuró el ciclo de pago.
   *
   * Nulo mientras el usuario no lo haya elegido: se le pregunta la primera vez
   * que entra a presupuestos, que es donde la respuesta tiene sentido y donde
   * entiende para qué sirve (D-027).
   */
  cycleConfiguredAt: timestamp('cycle_configured_at', { withTimezone: true }),

  /**
   * Cuándo terminó la configuración inicial.
   *
   * Mientras sea nulo, la persona no ha elegido nombre ni país y opera con
   * valores provisionales: la aplicación la lleva a la bienvenida.
   */
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),

  /**
   * Cuándo activó el usuario el registro automático (spec 010, FR-007).
   *
   * Marca de tiempo y no booleano, por dos razones. Coherencia: `onboardedAt` y
   * `cycleConfiguredAt` ya siguen ese patrón en esta misma tabla. Y porque el
   * Artículo II.1 pide activación **consciente**, y un booleano no registra
   * cuándo se dio ese consentimiento. Revocar lo pone a `NULL`.
   */
  autoRegisterEnabledAt: timestamp('auto_register_enabled_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TransactionRow = typeof transactions.$inferSelect
export type NewTransactionRow = typeof transactions.$inferInsert
export type UserSettingsRow = typeof userSettings.$inferSelect

/** Nivel de la cascada que produjo la sugerencia (D-013). */
export const categorizationMechanism = pgEnum('categorization_mechanism', [
  'keywords',
  'similarity',
  'model',
  'none',
])

/**
 * Historial de aprendizaje (D-015).
 *
 * Se captura desde el primer día aunque todavía no se explote del todo: es el
 * insumo de toda personalización futura y de cualquier medición de acierto, y no
 * hay forma de reconstruirlo hacia atrás. Qué habría propuesto la IA y qué
 * corrigió el usuario es información que, si no se guarda en el momento, se
 * pierde para siempre.
 */
export const categorizationLog = pgTable(
  'categorization_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /** Nulo mientras el usuario no haya confirmado el movimiento. */
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'cascade',
    }),

    /** Lo que escribió la persona, tal cual. */
    inputText: text('input_text').notNull(),
    /** Forma canónica, para poder comparar entre sí descripciones distintas. */
    normalizedText: text('normalized_text').notNull(),
    keywords: text('keywords').array().notNull().default([]),

    suggestedCategory: categoryKey('suggested_category'),

    /**
     * Único campo de coma flotante del sistema, y es correcto que lo sea. El
     * Artículo I prohíbe la coma flotante **para montos**, donde un céntimo
     * perdido corrompe el historial. Una confianza es aproximada por naturaleza:
     * 0,7341 y 0,7342 significan lo mismo.
     */
    confidence: real('confidence'),

    mechanism: categorizationMechanism('mechanism').notNull(),

    /** Categoría con la que quedó el movimiento tras la decisión del usuario. */
    finalCategory: categoryKey('final_category'),
    wasCorrected: boolean('was_corrected').notNull().default(false),

    latencyMs: integer('latency_ms'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Búsqueda del nivel 1: solapamiento de términos dentro de un usuario.
    index('categorization_user_keywords_idx').using('gin', table.keywords),
    index('categorization_user_idx').on(table.userId, table.finalCategory),
    // Para medir el acierto a lo largo del tiempo.
    index('categorization_user_date_idx').on(table.userId, table.createdAt),
  ],
)

export type CategorizationLogRow = typeof categorizationLog.$inferSelect

/**
 * Movimientos recurrentes (spec 007).
 *
 * Serva no está conectada a ningún banco, así que no puede saber si un cobro
 * ocurrió: guarda cuándo toca el próximo y pregunta al usuario cuando llega.
 */
export const recurringMovements = pgTable(
  'recurring_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /** Gasto o ingreso. El ahorro se aporta a metas, no se programa. */
    type: movementType('type').notNull(),

    /** Monto del último cobro confirmado: es lo que se propone la próxima vez. */
    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    category: categoryKey('category').notNull(),
    description: text('description').notNull(),

    /** Periodicidad: mensual en un día, o cada N días (D-032). */
    schedule: jsonb('schedule').notNull(),

    /** Fecha del próximo cobro pendiente de confirmar. */
    nextDueOn: date('next_due_on').notNull(),
    /** Última vez que se confirmó un cobro de este recurrente. */
    lastConfirmedOn: date('last_confirmed_on'),

    isSample: boolean('is_sample').notNull().default(false),

    /**
     * Cuándo dejó de estar vigente (spec 010, T-410).
     *
     * Un cobro de una sola vez no se reprograma al confirmarse: se archiva.
     * Borrarlo eliminaría el rastro de un cobro que sí ocurrió, y el historial
     * no se reescribe (Art. VII).
     */
    archivedAt: timestamp('archived_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Los pendientes se consultan en cada visita a la aplicación.
    index('recurring_user_due_idx').on(table.userId, table.nextDueOn),

    check('recurring_amount_positive', sql`${table.amountCents} > 0`),
    // El ahorro va a metas: programarlo aquí no tendría destino.
    check('recurring_not_saving', sql`${table.type} <> 'saving'`),
  ],
)

export type RecurringRow = typeof recurringMovements.$inferSelect

/**
 * Imagen guardada en la propia base.
 *
 * Para un prototipo evita depender de un servicio de almacenamiento externo:
 * quien clone el repositorio no necesita configurar nada, y no hay claves ni
 * cuentas de terceros. Con el límite de tamaño de la aplicación, el coste es
 * despreciable. Si algún día crece, se mueve a almacenamiento de objetos sin
 * tocar el resto del modelo.
 */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
})

/**
 * Metas de ahorro (spec 006).
 *
 * El progreso no se guarda: se deriva de los movimientos de tipo ahorro
 * asociados, igual que los saldos se derivan del historial (Art. VII.2).
 */
export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    targetCents: bigint('target_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    /** Imagen propia del usuario. Es el mecanismo, no la decoración (D-029). */
    image: bytea('image'),
    imageType: text('image_type'),

    /** Opcional: con ella se calcula cuánto aportar por período (FR-010). */
    targetDate: date('target_date'),

    /** Cuándo se alcanzó. Las metas logradas se archivan, no se borran. */
    achievedAt: timestamp('achieved_at', { withTimezone: true }),

    isSample: boolean('is_sample').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('goals_user_idx').on(table.userId, table.achievedAt),
    check('goal_target_positive', sql`${table.targetCents} > 0`),
  ],
)

export type SavingsGoalRow = typeof savingsGoals.$inferSelect

/**
 * Presupuestos (spec 005).
 *
 * Un tope de gasto por categoría, medido sobre el ciclo configurado del usuario
 * y no sobre el mes calendario (D-025).
 */
export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    category: categoryKey('category').notNull(),
    limitCents: bigint('limit_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    isSample: boolean('is_sample').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // FR-005: un solo presupuesto por categoría. Dos topes para lo mismo no
    // significarían nada.
    uniqueIndex('budget_user_category_uidx').on(table.userId, table.category),
    check('budget_limit_positive', sql`${table.limitCents} > 0`),
  ],
)

export type BudgetRow = typeof budgets.$inferSelect

/**
 * Conversaciones con Serva AI (spec 003, FR-017 a FR-021 · D-067).
 *
 * Se guardan en el servidor y no en el navegador: el problema no era solo
 * cambiar de pestaña, era que la conversación se evaporase al limpiar el
 * navegador o al abrir la aplicación desde el teléfono.
 *
 * **Caducan a los siete días.** Lo que se dice aquí es lo más sensible de la
 * aplicación: no «Mercado, 80.000», sino la frase entera con su motivo. Guardar
 * menos es la forma más barata de proteger un dato, y sin cifrado en la capa de
 * aplicación (D-059) esa es la única protección real que hay.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    /**
     * Fecha del último mensaje, y por tanto desde la que cuentan los siete días.
     * Se guarda aparte de `updatedAt` porque es un dato de negocio —decide qué
     * se borra— y no una marca técnica.
     */
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Se busca siempre «la conversación viva de este usuario».
    index('conversations_user_recent_idx').on(table.userId, table.lastMessageAt),
  ],
)

export type ConversationRow = typeof conversations.$inferSelect

/**
 * Los turnos de una conversación.
 *
 * `parts` guarda la parte del mensaje tal como la produjo el SDK, íntegra: si
 * se guardara solo el texto, al volver a la conversación se perderían los
 * gráficos y quedaría un hilo distinto del que se tuvo (FR-019).
 */
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),

    role: text('role').notNull(),
    parts: jsonb('parts').notNull(),

    /** Orden dentro de la conversación. Dos mensajes del mismo instante no
     *  pueden quedar desordenados por la precisión del reloj. */
    position: integer('position').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chat_messages_conversation_idx').on(table.conversationId, table.position),
    check('chat_messages_role', sql`${table.role} in ('user', 'assistant', 'system')`),
  ],
)

export type ChatMessageRow = typeof chatMessages.$inferSelect

/**
 * El registro de lo que Serva escribe (spec 010, plan §3.2).
 *
 * Es tres cosas a la vez: el diario que exige el Artículo III.4, la
 * trazabilidad del FR-011 —de la fila hasta la frase— y el soporte de la propia
 * tarjeta de confirmación.
 *
 * **Que la propuesta se persista antes de mostrarse no es contabilidad.** Es lo
 * que impide que el cliente altere lo que se va a escribir: la tarjeta envía un
 * identificador, no un cuerpo de datos. Si enviara los movimientos, quien
 * manipule la petición escribiría lo que quisiera saltándose la extracción
 * entera.
 */
export const assistantWrites = pgTable(
  'assistant_writes',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    kind: assistantWriteKind('kind').notNull(),
    status: assistantWriteStatus('status').notNull().default('propuesta'),

    /** La frase del usuario, tal cual. Es el origen al que se rastrea. */
    inputText: text('input_text').notNull(),

    /** Lo extraído y ya validado contra el esquema, listo para ejecutarse. */
    proposal: jsonb('proposal').notNull(),

    /**
     * Única columna de coma flotante, por el mismo motivo que en
     * `categorization_log`: es una medida de incertidumbre, no dinero (D-054).
     */
    confidence: real('confidence'),

    model: text('model'),
    latencyMs: integer('latency_ms'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    // Se busca «las propuestas sin resolver de este usuario».
    index('assistant_writes_user_status_idx').on(table.userId, table.status),
  ],
)

export type AssistantWriteRow = typeof assistantWrites.$inferSelect

/**
 * Deudas y préstamos (spec 011).
 *
 * **No hay columna de saldo.** Se deriva del monto original menos la suma de
 * sus abonos, igual que los balances del usuario se derivan del historial. Un
 * contador que se actualiza a mano acaba desincronizado de los hechos que lo
 * alimentan (D-073).
 */
export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    direction: debtDirection('direction').notNull(),

    /** A quién le debo, o quién me debe. Texto libre: no hay agenda (RN-005). */
    counterparty: text('counterparty').notNull(),

    /** El monto pactado. El saldo se calcula restando los abonos. */
    originalCents: bigint('original_cents', { mode: 'number' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),

    description: text('description'),

    /** Fecha civil, opcional. Vence el día, no la hora (RN-004). */
    dueOn: date('due_on'),

    /**
     * Cuándo se saldó. Marca de tiempo y no booleano: registra el momento, y
     * reabrir por error es ponerlo a NULL (FR-014).
     */
    settledAt: timestamp('settled_at', { withTimezone: true }),

    isSample: boolean('is_sample').notNull().default(false),

    /** Quién la creó, igual que en los movimientos (Art. II.2). */
    createdBy: movementOrigin('created_by').notNull().default('user'),
    assistantWriteId: uuid('assistant_write_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Se busca «las deudas vivas de este usuario», casi siempre.
    index('debts_user_settled_idx').on(table.userId, table.settledAt),

    check('debts_original_positive', sql`${table.originalCents} > 0`),
    check('debts_counterparty_not_empty', sql`length(trim(${table.counterparty})) > 0`),
  ],
)

export type DebtRow = typeof debts.$inferSelect

/**
 * Cada abono a una deuda.
 *
 * Se guardan por separado y no como un contador para poder ver **cómo** se
 * pagó, y porque el saldo sale de sumarlos.
 */
export const debtPayments = pgTable(
  'debt_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    debtId: uuid('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),

    /**
     * El movimiento que generó este abono, cuando lo hay.
     *
     * `SET NULL` y no `CASCADE`: anular el movimiento no borra el registro del
     * abono. Son dos hechos distintos, y el historial no se reescribe (Art. VII).
     */
    transactionId: uuid('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),

    amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
    paidOn: date('paid_on').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('debt_payments_debt_idx').on(table.debtId, table.paidOn),
    check('debt_payments_amount_positive', sql`${table.amountCents} > 0`),
  ],
)

export type DebtPaymentRow = typeof debtPayments.$inferSelect
