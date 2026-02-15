"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Link } from "@/i18n/navigation"
import type { Template, TemplateRegion, TemplateFinding } from "@/db/schema"

interface TemplateWithDetails extends Template {
  regions: TemplateRegion[]
  findings: TemplateFinding[]
}

type EditorTab = "metadata" | "regions" | "findings" | "preview"

export default function TemplateEditorPage() {
  const t = useTranslations("Templates")
  const params = useParams()
  const templateId = params.id as string

  const [template, setTemplate] = useState<TemplateWithDetails | null>(null)
  const [activeTab, setActiveTab] = useState<EditorTab>("metadata")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Editable fields
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [examType, setExamType] = useState("")
  const [contrast, setContrast] = useState<"com" | "sem" | "ambos">("com")
  const [urgencyDefault, setUrgencyDefault] = useState(true)
  const [keywordsStr, setKeywordsStr] = useState("")
  const [bodyContent, setBodyContent] = useState("")

  const fetchTemplate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/templates/${templateId}`)
      if (res.ok) {
        const data: TemplateWithDetails = await res.json()
        setTemplate(data)
        setName(data.name)
        setSlug(data.slug)
        setDescription(data.description || "")
        setExamType(data.examType)
        setContrast(data.contrast as "com" | "sem" | "ambos")
        setUrgencyDefault(data.urgencyDefault)
        setKeywordsStr(data.keywords?.join(", ") || "")
        setBodyContent(data.bodyContent)
      }
    } catch (err) {
      console.error("Failed to fetch template:", err)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  const save = async (status?: "draft" | "active") => {
    setSaving(true)
    setSaved(false)
    try {
      const body: Record<string, unknown> = {
        name,
        slug,
        description: description || null,
        examType,
        contrast,
        urgencyDefault,
        keywords: keywordsStr ? keywordsStr.split(",").map((k) => k.trim()).filter(Boolean) : null,
        bodyContent,
      }
      if (status) body.status = status

      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        if (status) fetchTemplate()
      }
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setSaving(false)
    }
  }

  // Region management
  const addRegion = async () => {
    const regionSlug = prompt("Region slug (e.g. figado):")
    if (!regionSlug) return
    const regionName = prompt("Region name (e.g. Fígado):")
    if (!regionName) return

    try {
      await fetch(`/api/templates/${templateId}/regions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regionSlug, regionName }),
      })
      fetchTemplate()
    } catch (err) {
      console.error("Failed to add region:", err)
    }
  }

  const deleteRegion = async (regionId: number) => {
    try {
      await fetch(`/api/templates/${templateId}/regions?regionId=${regionId}`, {
        method: "DELETE",
      })
      fetchTemplate()
    } catch (err) {
      console.error("Failed to delete region:", err)
    }
  }

  // Finding management
  const addFinding = async (regionSlug: string) => {
    const findingSlug = prompt("Finding slug (e.g. cisto-hepatico):")
    if (!findingSlug) return
    const findingName = prompt("Finding name (e.g. Cisto Hepático):")
    if (!findingName) return
    const findingBody = prompt("Finding body text (with {{placeholders}}):")
    if (!findingBody) return

    try {
      await fetch(`/api/templates/${templateId}/findings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regionSlug,
          slug: findingSlug,
          name: findingName,
          bodyContent: findingBody,
          keywords: [],
        }),
      })
      fetchTemplate()
    } catch (err) {
      console.error("Failed to add finding:", err)
    }
  }

  const deleteFinding = async (findingId: number) => {
    try {
      await fetch(`/api/templates/${templateId}/findings?findingId=${findingId}`, {
        method: "DELETE",
      })
      fetchTemplate()
    } catch (err) {
      console.error("Failed to delete finding:", err)
    }
  }

  const tabs: { key: EditorTab; label: string }[] = [
    { key: "metadata", label: t("metadata") },
    { key: "regions", label: t("regions") },
    { key: "findings", label: t("findings") },
    { key: "preview", label: t("preview") },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <div className="h-96 rounded-lg bg-muted animate-pulse" />
        </main>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-8 text-center">
          <p className="text-muted-foreground">Template not found</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; {t("back")}
            </Link>
            <h1 className="text-xl font-semibold text-foreground">
              {t("editor")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-sm text-green-600">{t("saved")}</span>
            )}
            <button
              onClick={() => save("draft")}
              disabled={saving}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {t("saveDraft")}
            </button>
            <button
              onClick={() => save("active")}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {t("activate")}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "metadata" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t("name")}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t("slug")}</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t("description")}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("examType")}</label>
                <input
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("contrast")}</label>
                <select
                  value={contrast}
                  onChange={(e) => setContrast(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="com">{t("contrastWith")}</option>
                  <option value="sem">{t("contrastWithout")}</option>
                  <option value="ambos">{t("contrastBoth")}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t("keywords")}</label>
              <input
                value={keywordsStr}
                onChange={(e) => setKeywordsStr(e.target.value)}
                placeholder="keyword1, keyword2, ..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t("bodyContent")}</label>
              <textarea
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                rows={20}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              />
            </div>
          </div>
        )}

        {activeTab === "regions" && (
          <div className="space-y-3">
            <button
              onClick={addRegion}
              className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground transition-colors w-full"
            >
              + {t("addRegion")}
            </button>
            {template.regions.map((region) => (
              <div
                key={region.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-foreground">
                      {region.regionName}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground font-mono">
                      {region.regionSlug}
                    </span>
                    {region.isOptional && (
                      <span className="ml-2 text-xs text-yellow-600">
                        {t("optional")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteRegion(region.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    {t("delete")}
                  </button>
                </div>
                {region.defaultNormalText && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {region.defaultNormalText}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "findings" && (
          <div className="space-y-4">
            {template.regions.map((region) => {
              const regionFindings = template.findings.filter(
                (f) => f.regionSlug === region.regionSlug
              )
              return (
                <div key={region.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {region.regionName}
                    </h3>
                    <button
                      onClick={() => addFinding(region.regionSlug)}
                      className="text-xs text-primary hover:underline"
                    >
                      + {t("addFinding")}
                    </button>
                  </div>
                  {regionFindings.length === 0 ? (
                    <p className="text-xs text-muted-foreground pl-2">
                      —
                    </p>
                  ) : (
                    <div className="space-y-2 pl-2">
                      {regionFindings.map((finding) => (
                        <div
                          key={finding.id}
                          className="rounded border border-border p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">
                              {finding.name}
                            </span>
                            <button
                              onClick={() => deleteFinding(finding.id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              {t("delete")}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">
                            {finding.bodyContent}
                          </p>
                          {finding.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {finding.keywords.map((kw) => (
                                <span
                                  key={kw}
                                  className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "preview" && (
          <div className="rounded-lg border border-border p-6">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
              {bodyContent}
            </pre>
          </div>
        )}
      </main>
    </div>
  )
}
