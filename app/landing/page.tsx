"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { TextEffect } from "@/components/ui/text-effect"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function LandingPage() {
  const [showHeader, setShowHeader] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)
  const [zoomDuration, setZoomDuration] = useState(20)
  const [isHoveringSlider, setIsHoveringSlider] = useState(false)
  const heroRowRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeader(!entry.isIntersecting)
      },
      { threshold: 0 }
    )

    if (heroRowRef.current) {
      observer.observe(heroRowRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onLoadedMetadata = () => {
      if (!Number.isNaN(video.duration) && video.duration > 0) {
        setZoomDuration(video.duration)
      }
    }
    video.addEventListener("loadedmetadata", onLoadedMetadata)
    if (video.readyState >= 1 && !Number.isNaN(video.duration)) {
      setZoomDuration(video.duration)
    }
    return () => video.removeEventListener("loadedmetadata", onLoadedMetadata)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed header - appears when hero row scrolls out */}
      <AnimatePresence>
        {showHeader && (
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="bg-card/80 backdrop-blur-sm border-b border-border/30 fixed top-0 left-0 right-0 z-50"
          >
            <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
              {/* Logo with hover effect — identical to app header */}
              <div
                className="h-6 overflow-hidden cursor-pointer select-none min-w-[140px]"
                onMouseEnter={() => setLogoHovered(true)}
                onMouseLeave={() => setLogoHovered(false)}
              >
                <AnimatePresence mode="wait">
                  {!logoHovered ? (
                    <TextEffect
                      key="reporter"
                      preset="blur"
                      per="word"
                      as="span"
                      className="block text-lg font-medium tracking-tight text-foreground"
                      variants={{
                        item: {
                          hidden: { opacity: 0, filter: "blur(4px)" },
                          visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.25 } },
                          exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.25 } },
                        },
                      }}
                    >
                      Reporter
                    </TextEffect>
                  ) : (
                    <motion.span
                      key="radiologic"
                      initial={{ opacity: 0, filter: "blur(4px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.25 }}
                      className="block text-lg tracking-tight text-foreground"
                    >
                      <span className="font-light">by </span>
                      <span className="font-medium">Radiologic™</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* CTA — same style/size as Sair button in app header */}
              <Link href="/login">
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  Comece a laudar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="min-h-screen flex flex-col pb-10">
        {/* Hero top row — matches header layout exactly (this is the sentinel) */}
        <div
          ref={heroRowRef}
          className="max-w-6xl lg:max-w-none mx-auto w-full px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between shrink-0"
        >
          <TextEffect
            preset="blur"
            per="word"
            as="span"
            className="text-lg font-medium tracking-tight text-foreground"
            variants={{
              item: {
                hidden: { opacity: 0, filter: "blur(6px)" },
                visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.35 } },
              },
            }}
          >
            Reporter by Radiologic™
          </TextEffect>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <Link href="/login">
              <Button
                size="sm"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                Comece a laudar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="px-8 sm:px-12 lg:px-16 text-lg font-medium tracking-tight text-muted-foreground/70 leading-relaxed max-w-xl"
        >
          Você dita, o Reporter estrutura.
          <br />
          IA usada do jeito certo. Interface limpa.
          <br />
          Abre, lauda, ponto.
        </motion.p>

        {/* Brain MRI video with subtle zoom-in */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
          className="mt-8 mx-8 sm:mx-12 lg:mx-16 flex-1 min-h-[85vh] sm:min-h-[90vh] lg:min-h-[95vh] relative rounded-2xl overflow-hidden bg-black flex items-center justify-center"
          onMouseEnter={() => {
            setIsHoveringSlider(true)
            videoRef.current?.pause()
          }}
          onMouseLeave={() => {
            setIsHoveringSlider(false)
            videoRef.current?.play()
          }}
        >
          <div
            className="w-[68%] h-[44%]"
            style={{
              animation: `zoom-in-smooth ${zoomDuration}s ease-in-out infinite`,
              animationPlayState: isHoveringSlider ? "paused" : "running",
            }}
          >
            <video
              ref={videoRef}
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
