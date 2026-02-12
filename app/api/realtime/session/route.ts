import { NextRequest, NextResponse } from "next/server"

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

/* ------------------------------------------------------------------ */
/*  Medical glossary prompt per language                               */
/*                                                                    */
/*  Sent as `prompt` inside the transcription config to bias the      */
/*  model towards correct medical terminology, measurement formats,   */
/*  and abbreviations common in radiology dictation.                  */
/*                                                                    */
/*  Keep each prompt ≤ ~500 tokens — enough to anchor vocabulary      */
/*  without wasting context window.                                   */
/* ------------------------------------------------------------------ */

const MEDICAL_PROMPTS: Record<string, string> = {
  pt: [
    // Estruturas anatômicas e patologias frequentes em TC
    "apendicite, diverticulite, pneumoperitônio, coleção, abscesso, colecistite,",
    "colelitíase, coledocolitíase, hepatoesplenomegalia, esteatose hepática,",
    "linfonodomegalia, linfadenopatia, derrame pleural, atelectasia, consolidação,",
    "pneumotórax, hemotórax, hidropneumotórax, espessamento parietal,",
    "tromboembolismo pulmonar, TEP, AVC isquêmico, AVC hemorrágico,",
    "hematoma subdural, hematoma epidural, hemorragia subaracnóidea, HSA,",
    "hidrocefalia, edema cerebral, desvio de linha média, herniação,",
    "espondilolistese, espondiloartrose, protrusão discal, extrusão discal,",
    "estenose de canal, artrose facetária, fratura, luxação, subluxação,",
    "calcificação, microcalcificação, nódulo, cisto, massa, lesão focal,",
    "realce heterogêneo, realce homogêneo, realce anelar, impregnação pelo contraste,",
    // Medidas e formatação
    "Medidas em cm e mm separadas por vírgula: 1,2 cm, 0,5 cm, 3,4 mm.",
    "Usar ponto para abreviações: TC, RM, US, RX.",
    // Termos de laudo
    "achados, impressão diagnóstica, conclusão, correlação clínica, controle evolutivo,",
    "exame prévio, comparação, sem alterações significativas, dentro dos limites da normalidade.",
  ].join(" "),

  en: [
    "appendicitis, diverticulitis, pneumoperitoneum, abscess, cholecystitis,",
    "cholelithiasis, choledocholithiasis, hepatosplenomegaly, hepatic steatosis,",
    "lymphadenopathy, pleural effusion, atelectasis, consolidation,",
    "pneumothorax, hemothorax, hydropneumothorax, pulmonary thromboembolism, PE,",
    "ischemic stroke, hemorrhagic stroke, subdural hematoma, epidural hematoma,",
    "subarachnoid hemorrhage, SAH, hydrocephalus, cerebral edema, midline shift,",
    "herniation, spondylolisthesis, spondylosis, disc protrusion, disc extrusion,",
    "spinal stenosis, facet arthropathy, fracture, dislocation, subluxation,",
    "calcification, microcalcification, nodule, cyst, mass, focal lesion,",
    "heterogeneous enhancement, homogeneous enhancement, rim enhancement,",
    "Measurements in cm and mm with decimal point: 1.2 cm, 0.5 cm, 3.4 mm.",
    "findings, impression, conclusion, clinical correlation, follow-up recommended,",
    "prior exam, comparison, no significant abnormality, within normal limits.",
  ].join(" "),

  es: [
    "apendicitis, diverticulitis, neumoperitoneo, colección, absceso, colecistitis,",
    "colelitiasis, coledocolitiasis, hepatoesplenomegalia, esteatosis hepática,",
    "linfadenopatía, derrame pleural, atelectasia, consolidación,",
    "neumotórax, hemotórax, hidroneumotórax, tromboembolismo pulmonar, TEP,",
    "ACV isquémico, ACV hemorrágico, hematoma subdural, hematoma epidural,",
    "hemorragia subaracnoidea, HSA, hidrocefalia, edema cerebral,",
    "desviación de línea media, herniación, espondilolistesis, espondiloartrosis,",
    "protrusión discal, extrusión discal, estenosis de canal, artropatía facetaria,",
    "fractura, luxación, subluxación, calcificación, microcalcificación,",
    "nódulo, quiste, masa, lesión focal, realce heterogéneo, realce homogéneo,",
    "Medidas en cm y mm con coma: 1,2 cm, 0,5 cm, 3,4 mm.",
    "hallazgos, impresión diagnóstica, conclusión, correlación clínica,",
    "control evolutivo, examen previo, sin alteraciones significativas.",
  ].join(" "),
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY not configured" },
      { status: 500 },
    )
  }

  try {
    const { language = "pt" } = await req.json()

    const prompt = MEDICAL_PROMPTS[language] ?? MEDICAL_PROMPTS.pt

    // ----------------------------------------------------------------
    // Official format from the WebRTC docs:
    //   body: { session: { model, type, audio, ... } }
    //
    // We use a standard "realtime" session with:
    //   - audio.input.transcription  → enables STT via gpt-4o-transcribe
    //   - turn_detection.create_response: false → no model responses
    //
    // This is the cheapest setup: the mini realtime model is only used
    // for session orchestration; actual transcription runs on gpt-4o-transcribe.
    // ----------------------------------------------------------------
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
            model: "gpt-4o-mini-realtime-preview",
            audio: {
              input: {
                noise_reduction: { type: "near_field" },
                transcription: {
                  model: "gpt-4o-transcribe",
                  language,
                  prompt,
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  // Higher silence tolerance — radiologists often pause
                  // mid-sentence to think. 500ms was too aggressive and
                  // split turns prematurely. 1500ms lets them breathe
                  // without losing streaming feedback.
                  silence_duration_ms: 1500,
                  // Don't auto-generate model responses; we only want STT.
                  create_response: false,
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
        { error: `OpenAI API error: ${response.status}`, detail: errorText },
        { status: response.status },
      )
    }

    const data = await response.json()

    // The docs browser example reads `data.value` directly.
    // The API reference shows `data.client_secret.value`. Handle both.
    const token =
      data?.client_secret?.value ?? data?.value ?? null
    if (!token) {
      console.error("Unexpected response shape:", JSON.stringify(data))
      return NextResponse.json(
        { error: "No client secret in response" },
        { status: 500 },
      )
    }

    return NextResponse.json({ clientSecret: token })
  } catch (error) {
    console.error("Realtime session error:", error)
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    )
  }
}
