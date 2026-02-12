import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { reports } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const reportId = Number(id)
  if (Number.isNaN(reportId)) {
    return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 })
  }

  const { generatedReport } = await request.json()
  if (typeof generatedReport !== 'string') {
    return NextResponse.json(
      { error: 'generatedReport must be a string' },
      { status: 400 }
    )
  }

  const [updated] = await db
    .update(reports)
    .set({ generatedReport })
    .where(and(eq(reports.id, reportId), eq(reports.clerkUserId, userId)))
    .returning({ id: reports.id, generatedReport: reports.generatedReport })

  if (!updated) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json(updated)
}
