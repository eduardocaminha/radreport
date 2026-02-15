import { pgTable, text, timestamp, bigint, integer, pgEnum, index, boolean, numeric, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tierEnum = pgEnum('tier', ['free', 'pro', 'enterprise'])

// ──────────────────────────────────────────────
// Template enums
// ──────────────────────────────────────────────
export const templateOwnershipEnum = pgEnum('template_ownership', ['admin', 'user', 'community', 'institutional'])
export const templateStatusEnum = pgEnum('template_status', ['draft', 'active', 'archived'])
export const docProcessingStatusEnum = pgEnum('doc_processing_status', ['pending', 'processing', 'completed', 'failed'])

// ──────────────────────────────────────────────
// user_profiles (existing)
// ──────────────────────────────────────────────
export const userProfiles = pgTable('user_profiles', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  tier: tierEnum('tier').default('free').notNull(),
  reportsThisMonth: integer('reports_this_month').default(0).notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ──────────────────────────────────────────────
// user_preferences (NEW)
// ──────────────────────────────────────────────
export const userPreferences = pgTable('user_preferences', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  fontSizeIdx: integer('font_size_idx').default(1).notNull(),
  locale: text('locale').default('pt-BR').notNull(),
  defaultReportMode: text('default_report_mode', { enum: ['ps', 'eletivo', 'comparativo'] }).default('ps').notNull(),
  usarPesquisa: boolean('usar_pesquisa').default(false).notNull(),
  anthropicApiKey: text('anthropic_api_key'),
  openaiApiKey: text('openai_api_key'),
  preferredModel: text('preferred_model').default('claude-sonnet-4-5-20250929'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ──────────────────────────────────────────────
// reports (ENHANCED — new optional columns added)
// ──────────────────────────────────────────────
export const reports = pgTable('reports', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull(),
  inputText: text('input_text').notNull(),
  generatedReport: text('generated_report').notNull(),
  mode: text('mode', { enum: ['ps', 'eletivo', 'comparativo'] }).default('ps'),
  // Cost & token metadata
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  costBrl: numeric('cost_brl', { precision: 10, scale: 6 }),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
  modelUsed: text('model_used'),
  // Context metadata
  locale: text('locale'),
  fontSizeIdx: integer('font_size_idx'),
  generationDurationMs: integer('generation_duration_ms'),
  usarPesquisa: boolean('usar_pesquisa').default(false),
  templateMascara: text('template_mascara'),
  templateAchados: text('template_achados').array(),
  // Template reference (DB-based templates)
  templateId: bigint('template_id', { mode: 'number' }),
  // Audio link
  audioSessionId: bigint('audio_session_id', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('reports_clerk_user_id_idx').on(table.clerkUserId),
])

// ──────────────────────────────────────────────
// report_generations (NEW — audit log for every generation attempt)
// ──────────────────────────────────────────────
export const reportGenerations = pgTable('report_generations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  reportId: bigint('report_id', { mode: 'number' }),
  clerkUserId: text('clerk_user_id').notNull(),
  inputTextHash: text('input_text_hash'),
  inputTextLength: integer('input_text_length'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
  costBrl: numeric('cost_brl', { precision: 10, scale: 6 }),
  model: text('model'),
  generationDurationMs: integer('generation_duration_ms'),
  mode: text('mode', { enum: ['ps', 'eletivo', 'comparativo'] }),
  locale: text('locale'),
  usarPesquisa: boolean('usar_pesquisa').default(false),
  templateMascara: text('template_mascara'),
  templateAchados: text('template_achados').array(),
  systemPromptLength: integer('system_prompt_length'),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('report_gen_user_idx').on(table.clerkUserId),
  index('report_gen_created_idx').on(table.createdAt),
])

// ──────────────────────────────────────────────
// audio_sessions (NEW — training data for audio/transcription)
// ──────────────────────────────────────────────
export const audioSessions = pgTable('audio_sessions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull(),
  reportId: bigint('report_id', { mode: 'number' }),
  language: text('language').notNull(),
  durationSeconds: integer('duration_seconds'),
  transcriptRaw: text('transcript_raw'),
  transcriptDeltas: jsonb('transcript_deltas'),
  turnTranscripts: jsonb('turn_transcripts'),
  audioFilePath: text('audio_file_path'),
  audioFormat: text('audio_format'),
  audioSizeBytes: integer('audio_size_bytes'),
  sampleRate: integer('sample_rate'),
  turnCount: integer('turn_count'),
  wordCount: integer('word_count'),
  errorOccurred: boolean('error_occurred').default(false),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audio_sessions_user_idx').on(table.clerkUserId),
  index('audio_sessions_lang_idx').on(table.language),
  index('audio_sessions_created_idx').on(table.createdAt),
])

// ──────────────────────────────────────────────
// templates — report masks (replaces markdown files)
// ──────────────────────────────────────────────
export const templates = pgTable('templates', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  // Ownership
  ownerClerkUserId: text('owner_clerk_user_id').notNull(),
  ownership: templateOwnershipEnum('ownership').default('user').notNull(),
  organizationId: text('organization_id'),
  // Identity
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  // Classification (replaces YAML frontmatter)
  examType: text('exam_type').notNull(),
  examSubtype: text('exam_subtype'),
  contrast: text('contrast', { enum: ['com', 'sem', 'ambos'] }).notNull(),
  urgencyDefault: boolean('urgency_default').default(true).notNull(),
  keywords: text('keywords').array(),
  // Content — mask body with <!-- REGIAO:xxx --> markers (same format as .md files)
  bodyContent: text('body_content').notNull(),
  // Metadata
  status: templateStatusEnum('status').default('draft').notNull(),
  version: integer('version').default(1).notNull(),
  parentTemplateId: bigint('parent_template_id', { mode: 'number' }),
  locale: text('locale').default('pt-BR').notNull(),
  // Monetization
  packId: bigint('pack_id', { mode: 'number' }),
  isFree: boolean('is_free').default(true).notNull(),
  // Stats
  usageCount: integer('usage_count').default(0).notNull(),
  cloneCount: integer('clone_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('templates_owner_idx').on(table.ownerClerkUserId),
  index('templates_exam_type_idx').on(table.examType),
  index('templates_ownership_idx').on(table.ownership),
  index('templates_slug_owner_idx').on(table.slug, table.ownerClerkUserId),
  index('templates_org_idx').on(table.organizationId),
])

// ──────────────────────────────────────────────
// template_regions — anatomical regions within a template
// ──────────────────────────────────────────────
export const templateRegions = pgTable('template_regions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  templateId: bigint('template_id', { mode: 'number' }).notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  regionSlug: text('region_slug').notNull(),
  regionName: text('region_name').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  defaultNormalText: text('default_normal_text'),
  isOptional: boolean('is_optional').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('template_regions_template_idx').on(table.templateId),
])

// ──────────────────────────────────────────────
// template_findings — achados linked to templates
// ──────────────────────────────────────────────
export interface FieldRule {
  rule: 'required' | 'optional' | 'conditional'
  condition?: string
  defaultValue?: string
  description?: string
}

export const templateFindings = pgTable('template_findings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  templateId: bigint('template_id', { mode: 'number' }).notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  regionSlug: text('region_slug').notNull(),
  // Identity
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  keywords: text('keywords').array().notNull(),
  // Content with {{placeholders}}
  bodyContent: text('body_content').notNull(),
  // Field rules as JSONB
  fieldRules: jsonb('field_rules').$type<Record<string, FieldRule>>(),
  // Defaults
  measureDefault: text('measure_default'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('findings_template_idx').on(table.templateId),
  index('findings_region_idx').on(table.regionSlug),
])

// ──────────────────────────────────────────────
// template_packs — groups of templates for monetization
// ──────────────────────────────────────────────
export const templatePacks = pgTable('template_packs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  ownerClerkUserId: text('owner_clerk_user_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  isFree: boolean('is_free').default(true).notNull(),
  stripePriceId: text('stripe_price_id'),
  priceAmountCents: integer('price_amount_cents'),
  currency: text('currency').default('brl'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ──────────────────────────────────────────────
// user_template_access — controls who sees what
// ──────────────────────────────────────────────
export const userTemplateAccess = pgTable('user_template_access', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull(),
  templateId: bigint('template_id', { mode: 'number' })
    .references(() => templates.id, { onDelete: 'cascade' }),
  packId: bigint('pack_id', { mode: 'number' })
    .references(() => templatePacks.id, { onDelete: 'cascade' }),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
  grantedBy: text('granted_by'),
}, (table) => [
  index('user_tpl_access_user_idx').on(table.clerkUserId),
  index('user_tpl_access_tpl_idx').on(table.templateId),
])

// ──────────────────────────────────────────────
// template_documents — uploaded files for extraction
// ──────────────────────────────────────────────
export const templateDocuments = pgTable('template_documents', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull(),
  templateId: bigint('template_id', { mode: 'number' })
    .references(() => templates.id, { onDelete: 'set null' }),
  // File info
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  blobUrl: text('blob_url').notNull(),
  // Processing
  processingStatus: docProcessingStatusEnum('processing_status').default('pending').notNull(),
  extractedContent: text('extracted_content'),
  extractedTemplate: jsonb('extracted_template'),
  processingError: text('processing_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('template_docs_user_idx').on(table.clerkUserId),
])

// ──────────────────────────────────────────────
// builder_sessions — AI builder conversation state
// ──────────────────────────────────────────────
export interface BuilderMessage {
  role: 'user' | 'assistant'
  content: string
}

export const builderSessions = pgTable('builder_sessions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull(),
  templateId: bigint('template_id', { mode: 'number' })
    .references(() => templates.id, { onDelete: 'cascade' }),
  // Conversation state
  messages: jsonb('messages').$type<BuilderMessage[]>(),
  currentStep: text('current_step'),
  collectedData: jsonb('collected_data'),
  status: text('status', { enum: ['active', 'completed', 'abandoned'] }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('builder_sessions_user_idx').on(table.clerkUserId),
])

// ──────────────────────────────────────────────
// Relations
// ──────────────────────────────────────────────
export const userProfilesRelations = relations(userProfiles, ({ many, one }) => ({
  reports: many(reports),
  preferences: one(userPreferences, {
    fields: [userProfiles.clerkUserId],
    references: [userPreferences.clerkUserId],
  }),
}))

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [userPreferences.clerkUserId],
    references: [userProfiles.clerkUserId],
  }),
}))

export const reportsRelations = relations(reports, ({ one, many }) => ({
  userProfile: one(userProfiles, {
    fields: [reports.clerkUserId],
    references: [userProfiles.clerkUserId],
  }),
  audioSession: one(audioSessions, {
    fields: [reports.audioSessionId],
    references: [audioSessions.id],
  }),
  template: one(templates, {
    fields: [reports.templateId],
    references: [templates.id],
  }),
  generations: many(reportGenerations),
}))

export const reportGenerationsRelations = relations(reportGenerations, ({ one }) => ({
  report: one(reports, {
    fields: [reportGenerations.reportId],
    references: [reports.id],
  }),
}))

export const audioSessionsRelations = relations(audioSessions, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [audioSessions.clerkUserId],
    references: [userProfiles.clerkUserId],
  }),
  report: one(reports, {
    fields: [audioSessions.reportId],
    references: [reports.id],
  }),
}))

export const templatesRelations = relations(templates, ({ one, many }) => ({
  owner: one(userProfiles, {
    fields: [templates.ownerClerkUserId],
    references: [userProfiles.clerkUserId],
  }),
  parent: one(templates, {
    fields: [templates.parentTemplateId],
    references: [templates.id],
    relationName: 'templateParent',
  }),
  pack: one(templatePacks, {
    fields: [templates.packId],
    references: [templatePacks.id],
  }),
  regions: many(templateRegions),
  findings: many(templateFindings),
  access: many(userTemplateAccess),
  documents: many(templateDocuments),
  builderSessions: many(builderSessions),
  reports: many(reports),
}))

export const templateRegionsRelations = relations(templateRegions, ({ one }) => ({
  template: one(templates, {
    fields: [templateRegions.templateId],
    references: [templates.id],
  }),
}))

export const templateFindingsRelations = relations(templateFindings, ({ one }) => ({
  template: one(templates, {
    fields: [templateFindings.templateId],
    references: [templates.id],
  }),
}))

export const templatePacksRelations = relations(templatePacks, ({ many }) => ({
  templates: many(templates),
  access: many(userTemplateAccess),
}))

export const userTemplateAccessRelations = relations(userTemplateAccess, ({ one }) => ({
  template: one(templates, {
    fields: [userTemplateAccess.templateId],
    references: [templates.id],
  }),
  pack: one(templatePacks, {
    fields: [userTemplateAccess.packId],
    references: [templatePacks.id],
  }),
}))

export const templateDocumentsRelations = relations(templateDocuments, ({ one }) => ({
  template: one(templates, {
    fields: [templateDocuments.templateId],
    references: [templates.id],
  }),
}))

export const builderSessionsRelations = relations(builderSessions, ({ one }) => ({
  template: one(templates, {
    fields: [builderSessions.templateId],
    references: [templates.id],
  }),
}))

// ──────────────────────────────────────────────
// Inferred types
// ──────────────────────────────────────────────
export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert
export type UserPreference = typeof userPreferences.$inferSelect
export type NewUserPreference = typeof userPreferences.$inferInsert
export type ReportGeneration = typeof reportGenerations.$inferSelect
export type NewReportGeneration = typeof reportGenerations.$inferInsert
export type AudioSession = typeof audioSessions.$inferSelect
export type NewAudioSession = typeof audioSessions.$inferInsert
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type TemplateRegion = typeof templateRegions.$inferSelect
export type NewTemplateRegion = typeof templateRegions.$inferInsert
export type TemplateFinding = typeof templateFindings.$inferSelect
export type NewTemplateFinding = typeof templateFindings.$inferInsert
export type TemplatePack = typeof templatePacks.$inferSelect
export type NewTemplatePack = typeof templatePacks.$inferInsert
export type UserTemplateAccess = typeof userTemplateAccess.$inferSelect
export type NewUserTemplateAccess = typeof userTemplateAccess.$inferInsert
export type TemplateDocument = typeof templateDocuments.$inferSelect
export type NewTemplateDocument = typeof templateDocuments.$inferInsert
export type BuilderSession = typeof builderSessions.$inferSelect
export type NewBuilderSession = typeof builderSessions.$inferInsert
