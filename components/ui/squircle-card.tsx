"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { getSvgPath } from "figma-squircle"
import { cn } from "@/lib/utils"

interface SquircleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  cornerRadius?: number
  cornerSmoothing?: number
}

export function SquircleCard({
  cornerRadius = 32,
  cornerSmoothing = 0.6,
  className,
  style,
  children,
  ...props
}: SquircleCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const clipPath = useMemo(() => {
    if (size.width === 0 || size.height === 0) return undefined
    const path = getSvgPath({
      width: size.width,
      height: size.height,
      cornerRadius,
      cornerSmoothing,
    })
    return `path('${path}')`
  }, [size, cornerRadius, cornerSmoothing])

  return (
    <div
      ref={containerRef}
      className={cn("bg-card", className)}
      style={{ ...style, clipPath }}
      {...props}
    >
      {children}
    </div>
  )
}
