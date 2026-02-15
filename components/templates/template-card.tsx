"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { Template } from "@/db/schema"

interface TemplateCardProps {
  template: Template
  isOwner: boolean
  onClone: () => void
  onDelete: () => void
}

const contrastLabels: Record<string, string> = {
  com: "C+",
  sem: "C-",
  ambos: "C+/-",
}

export function TemplateCard({ template, isOwner, onClone, onDelete }: TemplateCardProps) {
  const t = useTranslations("Templates")

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    active: "bg-green-500/20 text-green-700 dark:text-green-400",
    archived: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">{template.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {template.examType} · {contrastLabels[template.contrast] || template.contrast}
          </p>
        </div>
        <span
          className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            statusColors[template.status] || statusColors.draft
          }`}
        >
          {t(`status_${template.status}` as any)}
        </span>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {template.description}
        </p>
      )}

      {/* Keywords */}
      {template.keywords && template.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.keywords.slice(0, 4).map((kw) => (
            <span
              key={kw}
              className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {kw}
            </span>
          ))}
          {template.keywords.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{template.keywords.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
        <span>{t("uses", { count: template.usageCount })}</span>
        <span>{t("clones", { count: template.cloneCount })}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        {isOwner ? (
          <>
            <Link
              href={`/templates/${template.id}/edit`}
              className="rounded px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("edit")}
            </Link>
            <button
              onClick={onDelete}
              className="rounded px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              {t("delete")}
            </button>
          </>
        ) : (
          <button
            onClick={onClone}
            className="rounded px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {t("clone")}
          </button>
        )}
      </div>
    </div>
  )
}
