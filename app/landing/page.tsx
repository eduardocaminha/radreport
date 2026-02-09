"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { TextEffect } from "@/components/ui/text-effect"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function LandingPage() {
  const [showNav, setShowNav] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowNav(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Sentinel for nav trigger */}
      <div ref={sentinelRef} className="absolute top-0 h-20 w-full pointer-events-none" />

      {/* Floating pill nav - appears on scroll */}
      <AnimatePresence>
        {showNav && (
          <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-card/80 backdrop-blur-md border border-border/30 rounded-full px-1.5 py-1.5 flex items-center gap-0.5 shadow-sm">
              {["Produto", "Tecnologia", "Seguranca"].map((item) => (
                <button
                  key={item}
                  className="px-5 py-2 text-xl text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50 cursor-default"
                >
                  {item}
                </button>
              ))}
              <Link href="/login">
                <Button
                  size="sm"
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90 ml-1 px-5"
                >
                  Entrar
                </Button>
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Hero - full viewport */}
      <section className="min-h-screen flex flex-col px-8 sm:px-12 lg:px-16 pt-16 sm:pt-20 pb-10">
        {/* Texto (esq) + CTA (dir) — linha acima do vídeo */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="text-xl font-medium tracking-tight leading-tight max-w-xl">
            <TextEffect
              preset="blur"
              per="word"
              as="span"
              className="text-foreground"
              variants={{
                item: {
                  hidden: { opacity: 0, filter: "blur(6px)" },
                  visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.35 } },
                },
              }}
            >
              Reporter by Radiologic™
            </TextEffect>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-muted-foreground/70"
            >
              <br />
              Você dita, o Reporter estrutura.
              <br />
              IA usada do jeito certo. Interface limpa.
              <br />
              Abre, lauda, ponto.
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.4 }}
            className="shrink-0"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="gap-2 rounded-full px-8 bg-foreground text-background hover:bg-foreground/90 shadow-none"
              >
                Comece a laudar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Brain MRI video with subtle zoom-in */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
          className="mt-10 flex-1 min-h-[400px] sm:min-h-[480px] lg:min-h-[520px] relative rounded-2xl overflow-hidden bg-black flex items-center justify-center"
        >
          <div className="w-[45%] h-[28%] animate-zoom-in-smooth">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover rounded-lg"
            >
              <source
                src={process.env.NEXT_PUBLIC_BRAINMRI_URL || "/brainmri.mp4"}
                type="video/mp4"
              />
            </video>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-8 sm:px-12 lg:px-16 py-12">
        <p className="text-xl text-muted-foreground/30">
          Reporter by Radiologic™ — {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
