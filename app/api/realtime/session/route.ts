import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db"
import { userPreferences } from "@/db/schema"
import { eq } from "drizzle-orm"

/**
 * POST /api/realtime/session
 *
 * Creates an ephemeral client secret for the OpenAI Realtime API
 * (transcription-only mode). The browser uses this token to establish
 * a WebRTC peer connection directly with OpenAI.
 *
 * Body: { language: "pt" | "en" | "es" }
 * Returns: { clientSecret: string }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()

  // Try user-provided key first, then fall back to env var
  let apiKey = process.env.OPENAI_API_KEY
  if (userId) {
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.clerkUserId, userId),
    })
    if (prefs?.openaiApiKey) {
      apiKey = prefs.openaiApiKey
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    )
  }

  try {
    const { language = "pt" } = await req.json()

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "transcription",
            audio: {
              input: {
                noise_reduction: { type: "near_field" },
                transcription: {
                  model: "gpt-4o-transcribe",
                  language,
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 500,
                },
              },
            },
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenAI Realtime API error:", response.status, errorText)
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ clientSecret: data.value })
  } catch (error) {
    console.error("Realtime session error:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    )
  }
}
