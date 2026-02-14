# Page Layouts

## Dashboard (`app/[locale]/page.tsx`)

The main app page. Two-column layout with header.

```tsx
<div className="min-h-screen bg-background">
  <Header reportMode={...} onReportModeChange={...} />

  <motion.main className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 py-10 flex flex-col">
    <div className="flex flex-col lg:flex-row lg:gap-8">
      {/* Left column - 50% */}
      <motion.div className="lg:w-1/2">
        {/* DictationInput */}
      </motion.div>

      {/* Right column - 50% */}
      <div className="mt-6 lg:mt-0 lg:w-1/2 flex flex-col gap-6">
        {/* ReportOutput + Sugestoes */}
      </div>
    </div>
  </motion.main>
</div>
```

Key patterns:
- `min-h-screen bg-background` on root
- Stagger animation on main: `staggerChildren: 0.1`
- Each column: `{ opacity: 0, y: 20 } -> { opacity: 1, y: 0 }`, `duration: 0.4`
- Mobile: stacked (`flex-col`), desktop: side-by-side (`lg:flex-row`)

## Login (`app/[locale]/login/page.tsx`)

Split layout: form left, video right.

```tsx
<div className="min-h-dvh bg-background flex">
  {/* Left: form */}
  <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-12 lg:px-16 pt-16 sm:pt-20 pb-16">
    {/* Header row with back button + logo + locale switcher */}
    <div className="h-[72px] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link href="/landing">
          <Button variant="ghost" size="icon"
            className="h-8 w-8 bg-muted text-muted-foreground/40 hover:text-muted-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <TextEffect ...>Reporter by Radiologic™</TextEffect>
      </div>
      <LocaleSwitcher />
    </div>

    {/* Form content centered */}
    <div className="flex-1 flex items-center justify-center w-full">
      <div className="w-full max-w-md">
        {/* form fields */}
      </div>
    </div>
  </div>

  {/* Right: video panel (desktop only) */}
  <div className="hidden lg:flex lg:h-screen w-1/2 rounded-l-3xl bg-black">
    {/* video + overlay */}
  </div>
</div>
```

Key patterns:
- `min-h-dvh` (not `min-h-screen`) for mobile viewport
- Form column uses `flex-1 flex items-center justify-center` to vertically center
- Back button: icon button recipe (`h-8 w-8 bg-muted text-muted-foreground/40`)
- Right panel: `rounded-l-3xl` for rounded left edge

## Landing (`app/[locale]/landing/page.tsx`)

Full-width with sticky header and parallax video.

Key patterns:
- Sticky header with `position: sticky`, transparent -> opaque on scroll
- CTA button: `bg-foreground text-background hover:bg-foreground/90 rounded-full`
- Parallax video using `useScroll` + `useTransform`
- Squircle clip-path on video container
- Footer: `text-xl text-muted-foreground/30`

## Header (`components/header.tsx`)

```tsx
<motion.header
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  className="bg-card/80 backdrop-blur-sm border-b border-border/30 sticky top-0 z-50"
>
  <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
    {/* Left: hamburger + logo */}
    {/* Right: locale switcher + avatar + logout */}
  </div>

  {/* Expanding menu (AnimatePresence, height: 0 -> auto) */}
</motion.header>
```

### Header Expanding Menu

The menu expands below the header bar when hamburger is clicked:

```tsx
<AnimatePresence>
  {menuOpen && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden"
    >
      <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 pb-5">
        <div className="flex items-center gap-2 pl-11">
          {/* Toolbar-style buttons aligned under logo */}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

`pl-11` aligns items under the logo (past the hamburger button + gap).

## Full-Page Settings Panel (`components/settings-panel.tsx`)

A full-viewport overlay triggered from the header menu, without route change.

```tsx
<AnimatePresence mode="wait">
  {activePanel === "configLLM" && (
    <SettingsPanel key="configLLM" onClose={() => setActivePanel(null)} />
  )}
</AnimatePresence>
```

Panel structure:

```tsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
  className="fixed inset-0 z-50 bg-background overflow-y-auto"
>
  {/* Top bar — h-[72px], back button + title */}
  <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between border-b border-border/30">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted text-muted-foreground/40 hover:text-muted-foreground">
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <span className="text-xl font-medium tracking-tight text-foreground">{title}</span>
    </div>
  </div>

  {/* Content — centered, max-w-3xl */}
  <div className="max-w-3xl mx-auto px-8 sm:px-12 lg:px-16 py-10">
    <SquircleCard className="p-8">
      {/* Form fields with space-y-8 */}
    </SquircleCard>
  </div>
</motion.div>
```

Key patterns:
- `fixed inset-0 z-50 bg-background` covers everything
- Top bar matches header height (`h-[72px]`) with icon button back arrow
- Content in `SquircleCard` centered at `max-w-3xl`
- Fields use `space-y-8` with `border-t border-border/30` dividers
- Auto-save on blur (API keys) or on change (select) with flash "Saved" indicator
- Close on Escape key

## New Page Template

When creating a new page, follow this scaffold:

```tsx
<div className="min-h-screen bg-background">
  <Header reportMode={...} onReportModeChange={...} />

  <motion.main
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 py-10"
  >
    {/* Page content */}
  </motion.main>
</div>
```
