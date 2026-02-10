import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getTranslations } from "next-intl/server"

export async function POST(request: Request) {
  const t = await getTranslations("Api")

  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: t("noFile") }, { status: 400 })
    }

    const blob = await put(`landing/${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: t("uploadError") },
      { status: 500 }
    )
  }
}
