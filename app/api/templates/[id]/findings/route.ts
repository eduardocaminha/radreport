import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { templates, templateFindings } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

async function verifyOwner(userId: string, templateId: number) {
  return db.query.templates.findFirst({
    where: and(eq(templates.id, templateId), eq(templates.ownerClerkUserId, userId)),
  })
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
  const findings = await db
    .select()
    .from(templateFindings)
    .where(eq(templateFindings.templateId, Number(id)))

  return NextResponse.json(findings)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const templateId = Number(id)

  if (!(await verifyOwner(userId, templateId))) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })
  }

  const body = await request.json()

  const [finding] = await db
    .insert(templateFindings)
    .values({
      templateId,
      regionSlug: body.regionSlug,
      slug: body.slug,
      name: body.name,
      keywords: body.keywords ?? [],
      bodyContent: body.bodyContent,
      fieldRules: body.fieldRules ?? null,
      measureDefault: body.measureDefault ?? null,
    })
    .returning()

  return NextResponse.json(finding, { status: 201 })
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

  if (!(await verifyOwner(userId, templateId))) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })
  }

  const body = await request.json()
  const findingId = body.findingId

  const [updated] = await db
    .update(templateFindings)
    .set({
      ...(body.regionSlug !== undefined && { regionSlug: body.regionSlug }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.name !== undefined && { name: body.name }),
      ...(body.keywords !== undefined && { keywords: body.keywords }),
      ...(body.bodyContent !== undefined && { bodyContent: body.bodyContent }),
      ...(body.fieldRules !== undefined && { fieldRules: body.fieldRules }),
      ...(body.measureDefault !== undefined && { measureDefault: body.measureDefault }),
      updatedAt: new Date(),
    })
    .where(and(
      eq(templateFindings.id, findingId),
      eq(templateFindings.templateId, templateId)
    ))
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

  if (!(await verifyOwner(userId, templateId))) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const findingId = Number(searchParams.get('findingId'))

  await db
    .delete(templateFindings)
    .where(and(
      eq(templateFindings.id, findingId),
      eq(templateFindings.templateId, templateId)
    ))

  return NextResponse.json({ ok: true })
}
