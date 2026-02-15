"use client"

import { useState, useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import type { Template } from "@/db/schema"

interface TemplateSelectorProps {
  value: number | null
  onChange: (templateId: number | null) => void
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const t = useTranslations("Templates")
  const [templates, setTemplates] = useState<Template[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/templates?limit=100")
      .then((res) => res.json())
      .then((data) => setTemplates(data))
      .catch(() => {})
  }, [])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const selected = templates.find((t) => t.id === value)

  const filtered = templates.filter((tmpl) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      tmpl.name.toLowerCase().includes(q) ||
      tmpl.examType.toLowerCase().includes(q)
    )
  })

  // Group by exam type
  const grouped = filtered.reduce<Record<string, Template[]>>((acc, tmpl) => {
    const key = tmpl.examType
    if (!acc[key]) acc[key] = []
    acc[key].push(tmpl)
    return acc
  }, {})

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
      >
        <svg
          className="h-3.5 w-3.5 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
        <span className="max-w-[140px] truncate">
          {selected ? selected.name : t("noTemplateSelected")}
        </span>
        <svg
          className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-72 rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto px-1 pb-1">
            {/* No template option */}
            <button
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                !value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t("noTemplateSelected")}
            </button>

            {Object.entries(grouped).map(([examType, tmpls]) => (
              <div key={examType}>
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {examType}
                </div>
                {tmpls.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      onChange(tmpl.id)
                      setOpen(false)
                    }}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                      value === tmpl.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            ))}

            {filtered.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                {t("noTemplates")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
