import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { templates, templateRegions, templateFindings } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const sourceId = Number(id)

  const source = await db.query.templates.findFirst({
    where: eq(templates.id, sourceId),
  })
  if (!source) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Clone the template
  const [cloned] = await db
    .insert(templates)
    .values({
      ownerClerkUserId: userId,
      ownership: 'user',
      slug: `${source.slug}-copy`,
      name: `${source.name} (cópia)`,
      description: source.description,
      examType: source.examType,
      examSubtype: source.examSubtype,
      contrast: source.contrast,
      urgencyDefault: source.urgencyDefault,
      keywords: source.keywords,
      bodyContent: source.bodyContent,
      status: 'draft',
      parentTemplateId: sourceId,
      locale: source.locale,
    })
    .returning()

  // Clone regions
  const sourceRegions = await db
    .select()
    .from(templateRegions)
    .where(eq(templateRegions.templateId, sourceId))

  if (sourceRegions.length > 0) {
    await db.insert(templateRegions).values(
      sourceRegions.map(r => ({
        templateId: cloned.id,
        regionSlug: r.regionSlug,
        regionName: r.regionName,
        sortOrder: r.sortOrder,
        defaultNormalText: r.defaultNormalText,
        isOptional: r.isOptional,
      }))
    )
  }

  // Clone findings
  const sourceFindings = await db
    .select()
    .from(templateFindings)
    .where(eq(templateFindings.templateId, sourceId))

  if (sourceFindings.length > 0) {
    await db.insert(templateFindings).values(
      sourceFindings.map(f => ({
        templateId: cloned.id,
        regionSlug: f.regionSlug,
        slug: f.slug,
        name: f.name,
        keywords: f.keywords,
        bodyContent: f.bodyContent,
        fieldRules: f.fieldRules,
        measureDefault: f.measureDefault,
      }))
    )
  }

  // Increment clone count on source
  await db
    .update(templates)
    .set({ cloneCount: (source.cloneCount ?? 0) + 1 })
    .where(eq(templates.id, sourceId))

  return NextResponse.json(cloned, { status: 201 })
}
