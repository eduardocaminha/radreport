import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { audioSessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { uploadAudioFile, ensureAudioBucket } from '@/lib/supabase-storage'

let bucketChecked = false

/**
 * POST /api/audio-sessions
 *
 * Receives multipart form data with:
 *   - audio: File (the recorded audio blob)
 *   - metadata: JSON string with session data
 *
 * Uploads audio to Supabase Storage, saves session record in DB.
 * Returns the created audio session with its ID.
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const metadataStr = formData.get('metadata') as string | null

    if (!metadataStr) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const metadata = JSON.parse(metadataStr) as {
      language: string
      durationSeconds?: number
      transcriptRaw?: string
      transcriptDeltas?: Array<{ t: number; delta: string; itemId: string }>
      turnTranscripts?: Array<{ itemId: string; text: string; startMs?: number; endMs?: number }>
      turnCount?: number
      wordCount?: number
      sampleRate?: number
      errorOccurred?: boolean
      errorMessage?: string
      extra?: Record<string, unknown>
    }

    // 1. Insert the audio session record (without file path initially)
    const [session] = await db
      .insert(audioSessions)
      .values({
        clerkUserId: userId,
        language: metadata.language,
        durationSeconds: metadata.durationSeconds,
        transcriptRaw: metadata.transcriptRaw,
        transcriptDeltas: metadata.transcriptDeltas,
        turnTranscripts: metadata.turnTranscripts,
        turnCount: metadata.turnCount,
        wordCount: metadata.wordCount,
        sampleRate: metadata.sampleRate,
        errorOccurred: metadata.errorOccurred ?? false,
        errorMessage: metadata.errorMessage,
        metadata: metadata.extra ?? null,
      })
      .returning()

    // 2. Upload audio file if provided
    let audioFilePath: string | null = null
    let audioSizeBytes: number | null = null
    let audioFormat: string | null = null

    if (audioFile && audioFile.size > 0) {
      // Ensure bucket exists (once per server lifecycle)
      if (!bucketChecked) {
        await ensureAudioBucket()
        bucketChecked = true
      }

      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      audioSizeBytes = buffer.length
      audioFormat = audioFile.type || 'audio/webm'

      const { path, error } = await uploadAudioFile(
        userId,
        session.id,
        buffer,
        audioFormat,
      )

      if (error) {
        console.error('[audio-sessions] Storage upload failed:', error)
        // Continue without file — we still have the metadata
      } else {
        audioFilePath = path
      }
    }

    // 3. Update the session with file info if upload succeeded
    if (audioFilePath || audioSizeBytes) {
      const [updated] = await db
        .update(audioSessions)
        .set({
          audioFilePath,
          audioFormat,
          audioSizeBytes,
        })
        .where(eq(audioSessions.id, session.id))
        .returning()

      return NextResponse.json(updated)
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('[audio-sessions] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save audio session' },
      { status: 500 },
    )
  }
}
