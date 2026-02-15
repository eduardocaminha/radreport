import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { templates, templateRegions, templateFindings, userTemplateAccess, userProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { FieldRule } from '@/db/schema'

// Admin Clerk user ID — set this to your own Clerk user ID
const ADMIN_USER_ID = process.env.ADMIN_CLERK_USER_ID || ''

const TEMPLATES_DIR = path.join(process.cwd(), 'templates')

function slugToName(slug: string): string {
  return slug
    .replace('.md', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bTc\b/g, 'TC')
    .replace(/\bCom\b/g, 'com')
    .replace(/\bSem\b/g, 'sem')
    .replace(/\bAngio\b/g, 'Angio')
}

interface ParsedRegion {
  slug: string
  name: string
  defaultNormalText: string | null
  isOptional: boolean
  sortOrder: number
}

function parseRegionsFromBody(body: string): ParsedRegion[] {
  const regions: ParsedRegion[] = []
  // Match <!-- REGIAO:xxx --> ... <!-- /REGIAO:xxx -->
  const regionPattern = /<!-- REGIAO:(\S+) -->([\s\S]*?)<!-- \/REGIAO:\1 -->/g
  let match
  let sortOrder = 0

  while ((match = regionPattern.exec(body)) !== null) {
    const slug = match[1]
    const content = match[2].trim()

    regions.push({
      slug,
      name: slugToName(slug),
      defaultNormalText: content || null,
      isOptional: false,
      sortOrder: sortOrder++,
    })
  }

  return regions
}

function parseContrastFromSlug(slug: string): 'com' | 'sem' | 'ambos' {
  if (slug.includes('com-contraste')) return 'com'
  if (slug.includes('sem-contraste')) return 'sem'
  return 'com' // default
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admin can seed
  if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const results = { templates: 0, regions: 0, findings: 0, accessGrants: 0 }

    // 1. Read and insert all masks
    const mascarasDir = path.join(TEMPLATES_DIR, 'mascaras')
    const mascaraFiles = fs.readdirSync(mascarasDir).filter(f => f.endsWith('.md'))

    for (const file of mascaraFiles) {
      const content = fs.readFileSync(path.join(mascarasDir, file), 'utf-8')
      const { data, content: body } = matter(content)
      const slug = file.replace('.md', '')

      // Check if already seeded
      const existing = await db.query.templates.findFirst({
        where: eq(templates.slug, slug),
      })
      if (existing) continue

      const [template] = await db
        .insert(templates)
        .values({
          ownerClerkUserId: userId,
          ownership: 'admin',
          slug,
          name: slugToName(file),
          examType: data.tipo || slug.split('-').slice(0, 2).join('-'),
          examSubtype: data.subtipo ?? null,
          contrast: data.contraste || parseContrastFromSlug(slug),
          urgencyDefault: data.urgencia_padrao ?? true,
          keywords: data.palavras_chave ?? null,
          bodyContent: body.trim(),
          status: 'active',
          locale: 'pt-BR',
        })
        .returning()

      results.templates++

      // Parse and insert regions from body
      const regions = parseRegionsFromBody(body)
      if (regions.length > 0) {
        await db.insert(templateRegions).values(
          regions.map(r => ({
            templateId: template.id,
            regionSlug: r.slug,
            regionName: r.name,
            sortOrder: r.sortOrder,
            defaultNormalText: r.defaultNormalText,
            isOptional: r.isOptional,
          }))
        )
        results.regions += regions.length
      }
    }

    // 2. Read and insert all findings (achados)
    const achadosDir = path.join(TEMPLATES_DIR, 'achados')

    function readAchadosRecursive(dir: string) {
      const items = fs.readdirSync(dir)

      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          readAchadosRecursive(itemPath)
        } else if (item.endsWith('.md')) {
          const content = fs.readFileSync(itemPath, 'utf-8')
          const { data, content: body } = matter(content)
          const regiao = data.regiao || path.basename(dir)
          const slug = item.replace('.md', '')

          // Convert requer/opcional to fieldRules JSONB
          const fieldRules: Record<string, FieldRule> = {}
          if (data.requer && Array.isArray(data.requer)) {
            for (const field of data.requer) {
              fieldRules[field] = { rule: 'required' }
            }
          }
          if (data.opcional && Array.isArray(data.opcional)) {
            for (const field of data.opcional) {
              fieldRules[field] = { rule: 'optional' }
            }
          }

          achadosList.push({
            regiao,
            slug,
            name: slugToName(item),
            keywords: data.palavras_chave || [],
            bodyContent: body.trim(),
            fieldRules: Object.keys(fieldRules).length > 0 ? fieldRules : null,
            measureDefault: data.medida_default ?? null,
          })
        }
      }
    }

    const achadosList: Array<{
      regiao: string
      slug: string
      name: string
      keywords: string[]
      bodyContent: string
      fieldRules: Record<string, FieldRule> | null
      measureDefault: string | null
    }> = []

    if (fs.existsSync(achadosDir)) {
      readAchadosRecursive(achadosDir)
    }

    // Link findings to templates by matching region
    const allTemplates = await db.select().from(templates).where(eq(templates.ownership, 'admin'))

    for (const achado of achadosList) {
      // Find templates that have a matching region
      for (const tmpl of allTemplates) {
        const tmplRegions = await db
          .select()
          .from(templateRegions)
          .where(eq(templateRegions.templateId, tmpl.id))

        const hasRegion = tmplRegions.some(r => r.regionSlug === achado.regiao)
        if (!hasRegion) continue

        // Check if finding already exists for this template
        const existingFinding = await db.query.templateFindings.findFirst({
          where: (f, { and, eq }) => and(
            eq(f.templateId, tmpl.id),
            eq(f.slug, achado.slug),
            eq(f.regionSlug, achado.regiao)
          ),
        })
        if (existingFinding) continue

        await db.insert(templateFindings).values({
          templateId: tmpl.id,
          regionSlug: achado.regiao,
          slug: achado.slug,
          name: achado.name,
          keywords: achado.keywords,
          bodyContent: achado.bodyContent,
          fieldRules: achado.fieldRules,
          measureDefault: achado.measureDefault,
        })
        results.findings++
      }
    }

    // 3. Grant access to all existing users
    const allUsers = await db.select({ clerkUserId: userProfiles.clerkUserId }).from(userProfiles)
    const adminTemplates = await db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.ownership, 'admin'))

    for (const user of allUsers) {
      for (const tmpl of adminTemplates) {
        // Check if access already exists
        const existingAccess = await db.query.userTemplateAccess.findFirst({
          where: (a, { and, eq }) => and(
            eq(a.clerkUserId, user.clerkUserId),
            eq(a.templateId, tmpl.id)
          ),
        })
        if (existingAccess) continue

        await db.insert(userTemplateAccess).values({
          clerkUserId: user.clerkUserId,
          templateId: tmpl.id,
          grantedBy: 'system',
        })
        results.accessGrants++
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    console.error('[seed-templates] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
