"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LogIn, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [zoomDuration, setZoomDuration] = useState(20)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro("")
    setCarregando(true)

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErro(data.erro || "Erro ao fazer login")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setErro("Erro de conexão")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — login form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-medium tracking-tight text-foreground">
                Entrar
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Sistema de laudos radiológicos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 rounded-full bg-muted border-border/50 text-foreground placeholder:text-muted-foreground/40 px-5 shadow-none"
                autoFocus
              />

              {erro && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4"
                >
                  <p className="text-sm font-medium text-destructive">{erro}</p>
                </motion.div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 bg-muted text-foreground/70 hover:bg-accent hover:text-accent-foreground shadow-none"
                disabled={carregando || !senha}
              >
                {carregando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {carregando ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* Right — video panel with branding */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden rounded-l-3xl bg-black">
        <div
          className="absolute inset-0"
          style={{
            animation: `zoom-in-smooth ${zoomDuration}s ease-in-out infinite`,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-40"
          >
            <source
              src={process.env.NEXT_PUBLIC_BRAINMRI_URL || "/brainmri.mp4"}
              type="video/mp4"
            />
          </video>
        </div>

        {/* Text overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 flex flex-col justify-end p-16 pb-20"
        >
          <h2 className="text-5xl font-medium tracking-tight text-white leading-tight">
            Reporter
            <br />
            <span className="font-light">by </span>Radiologic™
          </h2>
          <p className="mt-4 text-lg text-white/50 tracking-tight">
            Abre, lauda, ponto.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
