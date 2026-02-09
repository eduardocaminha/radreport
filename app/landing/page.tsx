"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react"
import { Button } from "@/components/ui/button"
import { TextEffect } from "@/components/ui/text-effect"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function LandingPage() {
  const [isStuck, setIsStuck] = useState(false)
  const [logoHovered, setLogoHovered] = useState(false)
  const [zoomDuration, setZoomDuration] = useState(20)
  const [isHoveringSlider, setIsHoveringSlider] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: videoContainerRef,
    offset: ["start end", "end start"],
  })
  const videoY = useTransform(scrollYProgress, [0, 0.5], [450, 0])

  // Detect when the sticky row reaches the top
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1 }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [])

  // Sync zoom duration with video
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
      <section className="min-h-screen flex flex-col pb-10">
        {/* Top spacing */}
        <div className="pt-16 sm:pt-20" />

        {/* Sentinel — sits right above the sticky row */}
        <div ref={sentinelRef} className="h-0 w-full shrink-0" />

        {/* Sticky title + CTA row — becomes the header when stuck */}
        <div
          className={`sticky top-0 z-50 shrink-0 transition-[background-color,border-color] duration-150 ${
            isStuck
              ? "bg-card border-b border-border/30"
              : "border-b border-transparent"
          }`}
        >
          <div className="px-8 sm:px-12 lg:px-16 h-[72px] flex items-center justify-between">
            {/* Logo / Title */}
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                {isStuck ? (
                  <motion.div
                    key="stuck"
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.15 }}
                    className="h-7 overflow-hidden cursor-pointer select-none min-w-[140px]"
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
                          className="block text-xl font-medium tracking-tight text-foreground"
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
                          className="block text-xl tracking-tight text-foreground"
                        >
                          <span className="font-medium">by </span>
                          <span className="font-medium">Radiologic™</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="hero"
                    exit={{ opacity: 0, filter: "blur(4px)" }}
                    transition={{ duration: 0.15 }}
                  >
                    <TextEffect
                      preset="blur"
                      per="word"
                      as="span"
                      className="text-xl font-medium tracking-tight text-foreground"
                      variants={{
                        item: {
                          hidden: { opacity: 0, filter: "blur(6px)" },
                          visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.35 } },
                        },
                      }}
                    >
                      Reporter by Radiologic™
                    </TextEffect>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA button — color transitions smoothly */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              <Link href="/login">
                <Button
                  size="sm"
                  variant={isStuck ? "ghost" : undefined}
                  className={`gap-2 transition-all duration-200 ${
                    isStuck
                      ? "bg-background text-muted-foreground hover:text-foreground"
                      : "rounded-full px-6 bg-foreground text-background hover:bg-foreground/90 hover:text-background shadow-none"
                  }`}
                >
                  Comece a laudar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Subtitle — scrolls normally behind the sticky row */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="px-8 sm:px-12 lg:px-16 mt-1 text-xl font-medium tracking-tight text-muted-foreground/70 leading-tight max-w-xl"
        >
          Você dita, o Reporter estrutura.
          <br />
          IA usada do jeito certo. Interface limpa.
          <br />
          Abre, lauda, ponto.
        </motion.p>

        {/* Brain MRI video with subtle zoom-in */}
        <motion.div
          ref={videoContainerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ y: videoY }}
          transition={{ delay: 0.9, duration: 0.7, ease: "easeOut" }}
          className="mt-10 mx-8 sm:mx-12 lg:mx-16 flex-1 min-h-[85vh] sm:min-h-[90vh] lg:min-h-[95vh] relative rounded-2xl overflow-hidden bg-black flex items-center justify-center"
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
