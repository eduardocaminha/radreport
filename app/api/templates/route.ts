import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { templates, userTemplateAccess, templateRegions, templateFindings } from '@/db/schema'
import { eq, desc, and, or, ilike, sql, inArray } from 'drizzle-orm'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const ownership = searchParams.get('ownership')
  const examType = searchParams.get('examType')
  const q = searchParams.get('q')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  // Get template IDs the user has access to
  const accessRows = await db
    .select({ templateId: userTemplateAccess.templateId })
    .from(userTemplateAccess)
    .where(eq(userTemplateAccess.clerkUserId, userId))

  const accessibleIds = accessRows
    .map(r => r.templateId)
    .filter((id): id is number => id !== null)

  // Build conditions: user's own templates OR templates they have access to OR community templates
  const conditions = [
    eq(templates.ownerClerkUserId, userId),
    eq(templates.ownership, 'community'),
  ]
  if (accessibleIds.length > 0) {
    conditions.push(inArray(templates.id, accessibleIds))
  }

  let whereClause = and(
    or(...conditions),
    // Exclude archived unless explicitly requested
    sql`${templates.status} != 'archived'`
  )

  // Apply filters
  if (ownership) {
    whereClause = and(whereClause, eq(templates.ownership, ownership as any))
  }
  if (examType) {
    whereClause = and(whereClause, eq(templates.examType, examType))
  }
  if (q) {
    whereClause = and(
      whereClause,
      or(
        ilike(templates.name, `%${q}%`),
        ilike(templates.examType, `%${q}%`),
        ilike(templates.description, `%${q}%`)
      )
    )
  }

  const results = await db
    .select()
    .from(templates)
    .where(whereClause)
    .orderBy(desc(templates.updatedAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json(results)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const [template] = await db
    .insert(templates)
    .values({
      ownerClerkUserId: userId,
      ownership: body.ownership ?? 'user',
      slug: body.slug,
      name: body.name,
      description: body.description ?? null,
      examType: body.examType,
      examSubtype: body.examSubtype ?? null,
      contrast: body.contrast,
      urgencyDefault: body.urgencyDefault ?? true,
      keywords: body.keywords ?? null,
      bodyContent: body.bodyContent,
      status: body.status ?? 'draft',
      locale: body.locale ?? 'pt-BR',
    })
    .returning()

  // Insert regions if provided
  if (body.regions && Array.isArray(body.regions) && body.regions.length > 0) {
    await db.insert(templateRegions).values(
      body.regions.map((r: any, i: number) => ({
        templateId: template.id,
        regionSlug: r.regionSlug,
        regionName: r.regionName,
        sortOrder: r.sortOrder ?? i,
        defaultNormalText: r.defaultNormalText ?? null,
        isOptional: r.isOptional ?? false,
      }))
    )
  }

  // Insert findings if provided
  if (body.findings && Array.isArray(body.findings) && body.findings.length > 0) {
    await db.insert(templateFindings).values(
      body.findings.map((f: any) => ({
        templateId: template.id,
        regionSlug: f.regionSlug,
        slug: f.slug,
        name: f.name,
        keywords: f.keywords ?? [],
        bodyContent: f.bodyContent,
        fieldRules: f.fieldRules ?? null,
        measureDefault: f.measureDefault ?? null,
      }))
    )
  }

  return NextResponse.json(template, { status: 201 })
}
