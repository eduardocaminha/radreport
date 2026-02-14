import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { userPreferences } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/preferences
 * Returns the authenticated user's preferences, auto-creating defaults if missing.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.clerkUserId, userId),
  })

  // Auto-create with defaults on first access
  if (!prefs) {
    const [created] = await db
      .insert(userPreferences)
      .values({ clerkUserId: userId })
      .returning()
    prefs = created
  }

  return NextResponse.json(prefs)
}

/**
 * PUT /api/preferences
 * Upsert user preferences. Only provided fields are updated.
 */
export async function PUT(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Only allow known preference fields
  const allowedFields = ['fontSizeIdx', 'locale', 'defaultReportMode', 'usarPesquisa', 'anthropicApiKey', 'openaiApiKey', 'preferredModel'] as const
  const updates: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updatedAt = new Date()

  // Upsert: insert defaults then update with provided fields
  const existing = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.clerkUserId, userId),
  })

  let prefs
  if (existing) {
    const [updated] = await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.clerkUserId, userId))
      .returning()
    prefs = updated
  } else {
    const [created] = await db
      .insert(userPreferences)
      .values({ clerkUserId: userId, ...updates })
      .returning()
    prefs = created
  }

  return NextResponse.json(prefs)
}
