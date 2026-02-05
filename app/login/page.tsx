"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="bg-card rounded-2xl border border-border/40 p-10 shadow-lg">
          <div className="text-center mb-10">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">
              RadReport
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sistema de laudos radiologicos
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="h-12 rounded-full bg-input/50 border-border/50 text-foreground placeholder:text-muted-foreground/40 px-5"
              autoFocus
            />

            {erro && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive text-center"
              >
                {erro}
              </motion.p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
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
  )
}
