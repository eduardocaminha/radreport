import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { templates, templateRegions, templateFindings, userTemplateAccess } from '@/db/schema'
import { eq, and, or, inArray } from 'drizzle-orm'

async function canAccessTemplate(userId: string, templateId: number): Promise<boolean> {
  const template = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  })
  if (!template) return false
  // Owner, community, or granted access
  if (template.ownerClerkUserId === userId) return true
  if (template.ownership === 'community') return true
  const access = await db.query.userTemplateAccess.findFirst({
    where: and(
      eq(userTemplateAccess.clerkUserId, userId),
      eq(userTemplateAccess.templateId, templateId)
    ),
  })
  return !!access
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const templateId = Number(id)

  if (!(await canAccessTemplate(userId, templateId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const template = await db.query.templates.findFirst({
    where: eq(templates.id, templateId),
  })

  const regions = await db
    .select()
    .from(templateRegions)
    .where(eq(templateRegions.templateId, templateId))
    .orderBy(templateRegions.sortOrder)

  const findings = await db
    .select()
    .from(templateFindings)
    .where(eq(templateFindings.templateId, templateId))

  return NextResponse.json({ ...template, regions, findings })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const templateId = Number(id)

  // Only owner can edit
  const template = await db.query.templates.findFirst({
    where: and(eq(templates.id, templateId), eq(templates.ownerClerkUserId, userId)),
  })
  if (!template) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })
  }

  const body = await request.json()

  const [updated] = await db
    .update(templates)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.examType !== undefined && { examType: body.examType }),
      ...(body.examSubtype !== undefined && { examSubtype: body.examSubtype }),
      ...(body.contrast !== undefined && { contrast: body.contrast }),
      ...(body.urgencyDefault !== undefined && { urgencyDefault: body.urgencyDefault }),
      ...(body.keywords !== undefined && { keywords: body.keywords }),
      ...(body.bodyContent !== undefined && { bodyContent: body.bodyContent }),
      ...(body.status !== undefined && { status: body.status }),
      updatedAt: new Date(),
    })
    .where(eq(templates.id, templateId))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const templateId = Number(id)

  // Only owner can delete (soft-delete = archive)
  const template = await db.query.templates.findFirst({
    where: and(eq(templates.id, templateId), eq(templates.ownerClerkUserId, userId)),
  })
  if (!template) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })
  }

  await db
    .update(templates)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(templates.id, templateId))

  return NextResponse.json({ ok: true })
}
