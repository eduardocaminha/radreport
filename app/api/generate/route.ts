import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { gerarLaudoStream } from '@/lib/claude';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { userProfiles, reportGenerations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calcularCusto } from '@/lib/tokens';

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  pro: 100,
  enterprise: Infinity,
};

// Taxa de câmbio (must match lib/tokens.ts)
const TAXA_CAMBIO_USD_BRL = 5.5;

export async function POST(request: Request) {
  const t = await getTranslations('Api');
  const startTime = Date.now();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { erro: 'Unauthorized', laudo: null, sugestoes: [] },
      { status: 401 }
    );
  }

  try {
    const { texto, modoPS, modoComparativo, usarPesquisa, locale } = await request.json();

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

    // Determine mode for logging
    const mode = modoComparativo ? 'comparativo' : (modoPS ? 'ps' : 'eletivo');

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

    const innerStream = await gerarLaudoStream(
      texto.trim(), modoPS ?? false, modoComparativo ?? false, usarPesquisa ?? false
    );

    // Wrap the stream to intercept the 'done' event and log to report_generations
    const encoder = new TextEncoder();
    const reader = innerStream.getReader();
    const decoder = new TextDecoder();

    const loggingStream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }

        // Forward the chunk as-is
        controller.enqueue(value);

        // Try to parse lines and intercept the 'done' event for logging
        try {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(Boolean);

          for (const line of lines) {
            const event = JSON.parse(line);
            if (event.type === 'done' && event.tokenUsage) {
              const durationMs = Date.now() - startTime;
              const costInfo = calcularCusto(
                event.tokenUsage.inputTokens,
                event.tokenUsage.outputTokens,
                event.model || 'claude-sonnet-4-5-20250929'
              );

              // Emit timing + cost in a supplementary event
              controller.enqueue(encoder.encode(
                JSON.stringify({
                  type: 'generation_meta',
                  generationDurationMs: durationMs,
                  costBrl: costInfo.totalCost,
                  costUsd: costInfo.totalCost / TAXA_CAMBIO_USD_BRL,
                }) + '\n'
              ));

              // Fire-and-forget: log to report_generations
              const inputTextHash = await hashText(texto.trim());
              db.insert(reportGenerations).values({
                clerkUserId: userId,
                inputTextHash,
                inputTextLength: texto.trim().length,
                inputTokens: event.tokenUsage.inputTokens,
                outputTokens: event.tokenUsage.outputTokens,
                totalTokens: event.tokenUsage.totalTokens,
                costUsd: String(costInfo.totalCost / TAXA_CAMBIO_USD_BRL),
                costBrl: String(costInfo.totalCost),
                model: event.model,
                generationDurationMs: durationMs,
                mode,
                locale: locale ?? null,
                usarPesquisa: usarPesquisa ?? false,
                success: true,
              }).catch((err: unknown) => {
                console.error('[generate] Failed to log generation:', err);
              });
            } else if (event.type === 'error') {
              // Log failed generation
              db.insert(reportGenerations).values({
                clerkUserId: userId,
                inputTextLength: texto.trim().length,
                mode,
                locale: locale ?? null,
                usarPesquisa: usarPesquisa ?? false,
                success: false,
                errorMessage: event.message,
                generationDurationMs: Date.now() - startTime,
              }).catch((err: unknown) => {
                console.error('[generate] Failed to log generation error:', err);
              });
            }
          }
        } catch {
          // Non-parseable chunk, ignore
        }
      },
    });

    return new Response(loggingStream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    // Log the error to report_generations (fire-and-forget)
    db.insert(reportGenerations).values({
      clerkUserId: userId,
      success: false,
      errorMessage: message,
      generationDurationMs: Date.now() - startTime,
    }).catch((err: unknown) => {
      console.error('[generate] Failed to log generation error:', err);
    });

    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return NextResponse.json(
        { erro: t('timeout'), laudo: null, sugestoes: [] },
        { status: 504 }
      );
    }

    if (message.includes('401') || message.includes('authentication')) {
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

/** SHA-256 hash of input text for dedup in report_generations */
async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
