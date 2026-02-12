import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { reports } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const userReports = await db
    .select()
    .from(reports)
    .where(eq(reports.clerkUserId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json(userReports)
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const {
    inputText,
    generatedReport,
    mode,
    // New optional metadata fields
    inputTokens,
    outputTokens,
    totalTokens,
    costBrl,
    costUsd,
    modelUsed,
    locale,
    fontSizeIdx,
    generationDurationMs,
    usarPesquisa,
    templateMascara,
    templateAchados,
    audioSessionId,
  } = await request.json()

  const [report] = await db
    .insert(reports)
    .values({
      clerkUserId: userId,
      inputText,
      generatedReport,
      mode,
      inputTokens: inputTokens ?? null,
      outputTokens: outputTokens ?? null,
      totalTokens: totalTokens ?? null,
      costBrl: costBrl ?? null,
      costUsd: costUsd ?? null,
      modelUsed: modelUsed ?? null,
      locale: locale ?? null,
      fontSizeIdx: fontSizeIdx ?? null,
      generationDurationMs: generationDurationMs ?? null,
      usarPesquisa: usarPesquisa ?? false,
      templateMascara: templateMascara ?? null,
      templateAchados: templateAchados ?? null,
      audioSessionId: audioSessionId ?? null,
    })
    .returning()

  return NextResponse.json(report)
}

export async function DELETE(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await db.delete(reports).where(eq(reports.clerkUserId, userId))

  return NextResponse.json({ ok: true })
}
