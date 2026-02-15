import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { templates, templateRegions } from '@/db/schema'
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
  const regions = await db
    .select()
    .from(templateRegions)
    .where(eq(templateRegions.templateId, Number(id)))
    .orderBy(templateRegions.sortOrder)

  return NextResponse.json(regions)
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

  const [region] = await db
    .insert(templateRegions)
    .values({
      templateId,
      regionSlug: body.regionSlug,
      regionName: body.regionName,
      sortOrder: body.sortOrder ?? 0,
      defaultNormalText: body.defaultNormalText ?? null,
      isOptional: body.isOptional ?? false,
    })
    .returning()

  return NextResponse.json(region, { status: 201 })
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
  const regionId = body.regionId

  const [updated] = await db
    .update(templateRegions)
    .set({
      ...(body.regionSlug !== undefined && { regionSlug: body.regionSlug }),
      ...(body.regionName !== undefined && { regionName: body.regionName }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.defaultNormalText !== undefined && { defaultNormalText: body.defaultNormalText }),
      ...(body.isOptional !== undefined && { isOptional: body.isOptional }),
    })
    .where(and(
      eq(templateRegions.id, regionId),
      eq(templateRegions.templateId, templateId)
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
  const regionId = Number(searchParams.get('regionId'))

  await db
    .delete(templateRegions)
    .where(and(
      eq(templateRegions.id, regionId),
      eq(templateRegions.templateId, templateId)
    ))

  return NextResponse.json({ ok: true })
}
