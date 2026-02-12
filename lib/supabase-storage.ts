import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client configured with a Secret Key (sb_secret_...) for server-side
 * Storage operations. Secret keys are the recommended replacement for the legacy
 * service_role JWT — they can be rotated independently and are automatically
 * blocked in browser contexts.
 *
 * Only used for audio file uploads — the database stays on Drizzle ORM.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

if (!supabaseUrl || !supabaseSecretKey) {
  console.warn(
    '[supabase-storage] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY not set. Audio uploads will fail.'
  )
}

export const supabaseAdmin = createClient(
  supabaseUrl ?? '',
  supabaseSecretKey ?? '',
  {
    auth: { persistSession: false },
  }
)

export const AUDIO_BUCKET = 'audio-recordings'

/**
 * Upload an audio file to Supabase Storage.
 * Path convention: {clerkUserId}/{YYYY-MM-DD}/{audioSessionId}.webm
 */
export async function uploadAudioFile(
  clerkUserId: string,
  audioSessionId: number,
  audioBlob: Buffer,
  contentType: string = 'audio/webm'
): Promise<{ path: string; error: string | null }> {
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const filePath = `${clerkUserId}/${date}/${audioSessionId}.webm`

  const { error } = await supabaseAdmin.storage
    .from(AUDIO_BUCKET)
    .upload(filePath, audioBlob, {
      contentType,
      upsert: false,
    })

  if (error) {
    console.error('[supabase-storage] Upload error:', error.message)
    return { path: filePath, error: error.message }
  }

  return { path: filePath, error: null }
}

/**
 * Ensure the audio-recordings bucket exists.
 * Should be called once on app startup or during deployment.
 */
export async function ensureAudioBucket(): Promise<void> {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const exists = buckets?.some((b) => b.name === AUDIO_BUCKET)

  if (!exists) {
    const { error } = await supabaseAdmin.storage.createBucket(AUDIO_BUCKET, {
      public: false,
      fileSizeLimit: 100 * 1024 * 1024, // 100 MB
      allowedMimeTypes: ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'],
    })

    if (error) {
      console.error('[supabase-storage] Failed to create bucket:', error.message)
    } else {
      console.log('[supabase-storage] Created audio-recordings bucket')
    }
  }
}
