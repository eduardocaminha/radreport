"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TextEffect } from "@/components/ui/text-effect"
import { LogIn, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [senha, setSenha] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header minimalista - igual à página principal */}
      <header className="border-b border-border/30">
        <div className="max-w-6xl lg:max-w-none mx-auto px-8 sm:px-12 lg:px-16 h-[72px] flex items-center">
          <TextEffect
            preset="blur"
            per="word"
            as="span"
            className="block text-lg font-medium tracking-tight text-foreground"
            variants={{
              item: {
                hidden: { opacity: 0, filter: 'blur(4px)' },
                visible: { opacity: 1, filter: 'blur(0px)', transition: { duration: 0.25 } },
                exit: { opacity: 0, filter: 'blur(4px)', transition: { duration: 0.25 } },
              },
            }}
          >
            Reporter™ by Radiologic™
          </TextEffect>
        </div>
      </header>

      {/* Conteúdo central */}
      <main className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-16 py-16">
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
      </main>
    </div>
  )
}
