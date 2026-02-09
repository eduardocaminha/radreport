"use client"

import { useState } from "react"

import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextEffect } from "@/components/ui/text-effect"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LocaleSwitcher } from "@/components/locale-switcher"

export default function LoginPage() {
  const LOGIN_VIDEO_URL = "https://fl1j1x13akrzltef.public.blob.vercel-storage.com/lumbarmri.mp4"
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  const t = useTranslations("Login")

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
        setErro(data.erro || t("errorDefault"))
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setErro(t("errorConnection"))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left — login form */}
      <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-12 lg:px-16 pt-16 sm:pt-20 pb-16">
        <div className="h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/landing">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-muted text-muted-foreground/40 hover:text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          <TextEffect
            preset="blur"
            per="word"
            as="span"
            className="block text-xl font-medium tracking-tight text-foreground"
            variants={{
              item: {
                hidden: { opacity: 0, filter: "blur(4px)" },
                visible: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.25 } },
              },
            }}
          >
            Reporter by Radiologic™
          </TextEffect>
          </div>
          <LocaleSwitcher />
        </div>

        <div className="flex-1 flex items-center w-full min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full"
        >
          <div className="space-y-6">
            <h1 className="text-xl font-medium tracking-tight text-foreground">
              {t("title")}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder={t("passwordPlaceholder")}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="h-11 rounded-full bg-muted border-border/50 text-foreground placeholder:text-muted-foreground/40 px-5 shadow-none focus-visible:ring-border/60 focus-visible:border-border selection:bg-border/60 selection:text-foreground"
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
                className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-none"
                disabled={carregando || !senha}
              >
                {carregando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {carregando ? t("submitting") : t("submit")}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground/40 leading-relaxed">
              {t("termsPrefix")}{" "}
              <a href="/termos" className="underline hover:text-muted-foreground/60">
                {t("termsLink")}
              </a>{" "}
              {t("termsAnd")}{" "}
              <a href="/privacidade" className="underline hover:text-muted-foreground/60">
                {t("privacyLink")}
              </a>
              .
            </p>
          </div>
        </motion.div>
        </div>
      </div>

      {/* Right — video panel with branding */}
      <div className="hidden lg:flex lg:h-screen w-1/2 relative overflow-hidden rounded-l-3xl bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        >
          <source src={LOGIN_VIDEO_URL} type="video/mp4" />
        </video>

        {/* Text overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 flex flex-col justify-end p-16 pb-20"
        >
          <h2 className="text-6xl font-medium tracking-tight text-white leading-[0.85]">
            {t("tagline1")}
            <br />
            {t("tagline2")}
            <br />
            {t("tagline3")}
          </h2>
        </motion.div>
      </div>
    </div>
  )
}
