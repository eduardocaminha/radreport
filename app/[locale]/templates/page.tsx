"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "motion/react"
import { useTranslations } from "next-intl"
import { Header } from "@/components/header"
import { TemplateCard } from "@/components/templates/template-card"
import { Link } from "@/i18n/navigation"
import type { Template } from "@/db/schema"

type Tab = "user" | "admin" | "community"

export default function TemplatesPage() {
  const t = useTranslations("Templates")
  const [activeTab, setActiveTab] = useState<Tab>("admin")
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== "community") {
        params.set("ownership", activeTab)
      } else {
        params.set("ownership", "community")
      }
      if (search) params.set("q", search)

      const res = await fetch(`/api/templates?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTemplates(data)
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleClone = async (id: number) => {
    try {
      const res = await fetch(`/api/templates/${id}/clone`, { method: "POST" })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (err) {
      console.error("Failed to clone:", err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "admin", label: t("adminTemplates") },
    { key: "user", label: t("myTemplates") },
    { key: "community", label: t("community") },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Title + Create button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <Link
            href="/templates/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("createNew")}
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full max-w-md rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Template grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-lg bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{t("noTemplates")}</p>
            <p className="text-muted-foreground text-sm mt-2">
              {t("noTemplatesDesc")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isOwner={activeTab === "user"}
                onClone={() => handleClone(template.id)}
                onDelete={() => handleDelete(template.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
