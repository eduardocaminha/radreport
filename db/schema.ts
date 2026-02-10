import { pgTable, text, timestamp, bigint, integer, pgEnum, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tierEnum = pgEnum('tier', ['free', 'pro', 'enterprise'])

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

export const reports = pgTable('reports', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  clerkUserId: text('clerk_user_id').notNull(),
  inputText: text('input_text').notNull(),
  generatedReport: text('generated_report').notNull(),
  mode: text('mode', { enum: ['ps', 'eletivo', 'comparativo'] }).default('ps'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('reports_clerk_user_id_idx').on(table.clerkUserId),
])

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  reports: many(reports),
}))

export const reportsRelations = relations(reports, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [reports.clerkUserId],
    references: [userProfiles.clerkUserId],
  }),
}))

// Inferred types
export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert
