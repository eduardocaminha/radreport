import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { gerarLaudoStream } from '@/lib/claude';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { userProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  enterprise: Infinity,
};

export async function POST(request: Request) {
  const t = await getTranslations('Api');

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { erro: 'Unauthorized', laudo: null, sugestoes: [] },
      { status: 401 }
    );
  }

  try {
    const { texto, modoPS, modoComparativo, usarPesquisa } = await request.json();

    if (!texto || typeof texto !== 'string' || texto.trim() === '') {
      return NextResponse.json(
        { erro: t('emptyText'), laudo: null, sugestoes: [] },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { erro: t('apiKeyNotConfigured'), laudo: null, sugestoes: [] },
        { status: 500 }
      );
    }

    // Auto-provision user profile
    let profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.clerkUserId, userId),
    });

    if (!profile) {
      const [newProfile] = await db.insert(userProfiles).values({
        clerkUserId: userId,
      }).returning();
      profile = newProfile;
    }

    // Lazy monthly reset
    const now = new Date();
    if (
      profile.updatedAt.getMonth() !== now.getMonth() ||
      profile.updatedAt.getFullYear() !== now.getFullYear()
    ) {
      const [updated] = await db
        .update(userProfiles)
        .set({ reportsThisMonth: 0, updatedAt: now })
        .where(eq(userProfiles.clerkUserId, userId))
        .returning();
      profile = updated;
    }

    // Check tier limit
    const limit = TIER_LIMITS[profile.tier] ?? 10;
    if (profile.reportsThisMonth >= limit) {
      return NextResponse.json(
        { erro: t('tierLimitReached'), laudo: null, sugestoes: [] },
        { status: 429 }
      );
    }

    // Increment counter before streaming
    await db
      .update(userProfiles)
      .set({
        reportsThisMonth: profile.reportsThisMonth + 1,
        updatedAt: now,
      })
      .where(eq(userProfiles.clerkUserId, userId));

    const stream = await gerarLaudoStream(
      texto.trim(), modoPS ?? false, modoComparativo ?? false, usarPesquisa ?? false
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro ao gerar laudo:', error);

    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido';

    if (mensagem.includes('timeout') || mensagem.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { erro: t('timeout'), laudo: null, sugestoes: [] },
        { status: 504 }
      );
    }

    if (mensagem.includes('401') || mensagem.includes('authentication')) {
      return NextResponse.json(
        { erro: t('invalidApiKey'), laudo: null, sugestoes: [] },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { erro: t('processingError'), laudo: null, sugestoes: [] },
      { status: 500 }
    );
  }
}
