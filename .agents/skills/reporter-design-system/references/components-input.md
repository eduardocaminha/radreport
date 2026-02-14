# Input Components

## Default Input

Source: `components/ui/input.tsx`

```
h-11 w-full rounded-xl bg-input/50 border-input px-4 py-2.5
text-base md:text-sm
placeholder:text-muted-foreground/60
focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] focus-visible:bg-background
```

## Floating Field (Login)

Custom wrapper in `login/page.tsx`. Used for email/password inputs.

### Input

```
h-12 rounded-full bg-muted border-0 text-foreground px-3 shadow-none
focus-visible:ring-[3px] focus-visible:ring-border/30
placeholder:text-transparent
```

### Label

Animates from center to top on focus/fill:

```
origin-start absolute left-2 top-1/2 -translate-y-1/2
text-sm text-muted-foreground/40
```

On focus/filled: moves to `top-0`, becomes `text-xs font-medium text-foreground`.

Label inner span: `inline-flex rounded-full bg-background px-2 py-0.5` (creates background behind label text).

## Password Input

Source: `components/ui/password-input.tsx`

Same as Input with `pr-10` for the toggle button.

Toggle icon: `absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground`

## OTP Input

Source: `components/ui/input-otp.tsx`

Used in login verification.

```tsx
<InputOTPSlot
  className="h-12 w-11 text-xl rounded-lg bg-muted border-0"
/>
```

Active slot: `data-[active=true]:border-border data-[active=true]:ring-border/30`

## Textarea

Source: `components/ui/textarea.tsx`

```
rounded-xl bg-input/50 border-border/50
min-h-16 px-4 py-3 text-base md:text-sm
placeholder:text-muted-foreground/60
focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]
```

## Dashboard Textarea (custom)

In `dictation-input.tsx`, the textarea is inside a SquircleCard with no border/background:

```tsx
<SquircleCard className="relative p-8">
  <textarea
    className="w-full bg-transparent border-none outline-none resize-none
               leading-relaxed text-foreground placeholder:text-muted-foreground/30
               font-medium overflow-hidden {fontSizeClass}"
    rows={1}
  />
</SquircleCard>
```

## Select

Source: `components/ui/select.tsx`

Radix-based dropdown select, adapted to the design system.

### Trigger

```
rounded-full h-11 bg-input/50 border-input px-4 py-2.5
text-base md:text-sm shadow-none
focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] focus-visible:bg-background
```

### Content Panel

```
rounded-2xl bg-card border-border/50 shadow-none
```

### Items

```
rounded-full py-1.5 pl-3 pr-8
focus:bg-muted focus:text-foreground
```

### Usage

```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent position="popper" sideOffset={8}>
    <SelectItem value="option-1">Option 1</SelectItem>
    <SelectItem value="option-2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Focus Pattern (Universal)

All focusable inputs use:

```
focus-visible:border-ring
focus-visible:ring-ring/30
focus-visible:ring-[3px]
```
