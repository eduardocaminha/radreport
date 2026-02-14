import { pgTable, text, timestamp, bigint, integer, pgEnum, index, boolean, numeric, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tierEnum = pgEnum('tier', ['free', 'pro', 'enterprise'])

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
