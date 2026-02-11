"use client"

import { useState, useEffect, useCallback } from "react"
import { useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp"
import { TextEffect } from "@/components/ui/text-effect"
import { OAuthButtons } from "@/components/oauth-buttons"
import { ArrowLeft, ArrowRight, Loader2, Check, X } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LocaleSwitcher } from "@/components/locale-switcher"
import {
  signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues,
} from "@/lib/validations/auth"

type Mode = "signIn" | "signUp" | "verify"

const inputStyle =
  "h-11 rounded-full bg-muted border-border/50 text-foreground placeholder:text-muted-foreground/40 px-5 shadow-none focus-visible:ring-border/60 focus-visible:border-border selection:bg-border/60 selection:text-foreground"

function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations("Login")

  const requirements = [
    { key: "reqMin8", met: password.length >= 8 },
    { key: "reqUppercase", met: /[A-Z]/.test(password) },
    { key: "reqLowercase", met: /[a-z]/.test(password) },
    { key: "reqNumber", met: /[0-9]/.test(password) },
  ] as const

  if (!password) return null

  return (
    <div className="space-y-1.5">
      {requirements.map(({ key, met }) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          {met ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <X className="h-3 w-3 text-muted-foreground/40" />
          )}
          <span
            className={met ? "text-emerald-500" : "text-muted-foreground/40"}
          >
            {t(key)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const LOGIN_VIDEO_URL =
    "https://fl1j1x13akrzltef.public.blob.vercel-storage.com/lumbarmri.mp4"

  const [mode, setMode] = useState<Mode>("signIn")
  const [otpValue, setOtpValue] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const t = useTranslations("Login")

  const {
    isLoaded: signInLoaded,
    signIn,
    setActive: setSignInActive,
  } = useSignIn()
  const {
    isLoaded: signUpLoaded,
    signUp,
    setActive: setSignUpActive,
  } = useSignUp()

  // Sign-in form
  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  // Sign-up form
  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  })

  const watchedPassword = signUpForm.watch("password")

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  async function handleSignIn(data: SignInValues) {
    if (!signInLoaded) return
    setErro("")
    setCarregando(true)

    try {
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      })

      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId })
        router.push("/")
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[] }
      setErro(clerkErr.errors?.[0]?.longMessage || t("errorDefault"))
    } finally {
      setCarregando(false)
    }
  }

  async function handleSignUp(data: SignUpValues) {
    if (!signUpLoaded) return
    setErro("")
    setCarregando(true)

    try {
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setMode("verify")
      setResendCooldown(60)
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[] }
      setErro(clerkErr.errors?.[0]?.longMessage || t("errorSignUp"))
    } finally {
      setCarregando(false)
    }
  }

  const handleVerify = useCallback(
    async (code: string) => {
      if (!signUpLoaded || code.length !== 6) return
      setErro("")
      setCarregando(true)

      try {
        const result = await signUp.attemptEmailAddressVerification({ code })

        if (result.status === "complete") {
          await setSignUpActive({ session: result.createdSessionId })
          router.push("/")
        } else {
          console.error("Verification status:", result.status)
          setErro(t("errorVerifyIncomplete"))
        }
      } catch (err: unknown) {
        const clerkErr = err as { errors?: { longMessage?: string }[] }
        setErro(clerkErr.errors?.[0]?.longMessage || t("errorVerify"))
      } finally {
        setCarregando(false)
      }
    },
    [signUpLoaded, signUp, setSignUpActive, router, t]
  )

  async function handleResend() {
    if (!signUpLoaded || resendCooldown > 0) return
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setResendCooldown(60)
      setErro("")
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[] }
      setErro(clerkErr.errors?.[0]?.longMessage || t("errorDefault"))
    }
  }

  function switchMode() {
    setMode(mode === "signIn" ? "signUp" : "signIn")
    setErro("")
    signInForm.reset()
    signUpForm.reset()
  }

  const signInEmail = signInForm.watch("email")
  const signInPassword = signInForm.watch("password")
  const signUpEmail = signUpForm.watch("email")
  const signUpPassword = signUpForm.watch("password")
  const signUpConfirm = signUpForm.watch("confirmPassword")

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
                  visible: {
                    opacity: 1,
                    filter: "blur(0px)",
                    transition: { duration: 0.25 },
                  },
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
                {mode === "verify"
                  ? t("titleVerify")
                  : mode === "signIn"
                    ? t("titleSignIn")
                    : t("titleSignUp")}
              </h1>

              {/* OAuth buttons (not in verify mode) */}
              {mode !== "verify" && (
                <>
                  <OAuthButtons mode={mode} />

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-3 text-muted-foreground/40">
                        {t("orContinueWith")}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Verification form */}
              {mode === "verify" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("verificationSent", {
                      email: signUpForm.getValues("email"),
                    })}
                  </p>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={(value) => {
                        setOtpValue(value)
                        if (value.length === 6) {
                          handleVerify(value)
                        }
                      }}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={0}
                          className="h-11 w-11 rounded-lg bg-muted border-border/50"
                        />
                        <InputOTPSlot
                          index={1}
                          className="h-11 w-11 rounded-lg bg-muted border-border/50"
                        />
                        <InputOTPSlot
                          index={2}
                          className="h-11 w-11 rounded-lg bg-muted border-border/50"
                        />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={3}
                          className="h-11 w-11 rounded-lg bg-muted border-border/50"
                        />
                        <InputOTPSlot
                          index={4}
                          className="h-11 w-11 rounded-lg bg-muted border-border/50"
                        />
                        <InputOTPSlot
                          index={5}
                          className="h-11 w-11 rounded-lg bg-muted border-border/50"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {erro && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4"
                    >
                      <p className="text-sm font-medium text-destructive">
                        {erro}
                      </p>
                    </motion.div>
                  )}

                  <Button
                    type="button"
                    onClick={() => handleVerify(otpValue)}
                    className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-none"
                    disabled={carregando || otpValue.length !== 6}
                  >
                    {carregando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    {carregando ? t("verifying") : t("verify")}
                  </Button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="w-full text-sm text-muted-foreground/60 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0
                      ? t("resendCooldown", { seconds: resendCooldown })
                      : t("resendCode")}
                  </button>
                </div>
              )}

              {/* Sign-in form */}
              {mode === "signIn" && (
                <form
                  onSubmit={signInForm.handleSubmit(handleSignIn)}
                  className="space-y-4"
                >
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    className={inputStyle}
                    autoFocus
                    {...signInForm.register("email")}
                  />
                  <PasswordInput
                    placeholder={t("passwordPlaceholder")}
                    className={inputStyle}
                    {...signInForm.register("password")}
                  />

                  {erro && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4"
                    >
                      <p className="text-sm font-medium text-destructive">
                        {erro}
                      </p>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-none"
                    disabled={carregando || !signInEmail || !signInPassword}
                  >
                    {carregando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    {carregando ? t("signingIn") : t("signIn")}
                  </Button>
                </form>
              )}

              {/* Sign-up form */}
              {mode === "signUp" && (
                <form
                  onSubmit={signUpForm.handleSubmit(handleSignUp)}
                  className="space-y-4"
                >
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    className={inputStyle}
                    autoFocus
                    {...signUpForm.register("email")}
                  />
                  <PasswordInput
                    placeholder={t("passwordPlaceholder")}
                    className={inputStyle}
                    {...signUpForm.register("password")}
                  />
                  <PasswordInput
                    placeholder={t("confirmPasswordPlaceholder")}
                    className={inputStyle}
                    {...signUpForm.register("confirmPassword")}
                  />

                  <PasswordRequirements password={watchedPassword} />

                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {t("errorPasswordMismatch")}
                    </p>
                  )}

                  {erro && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4"
                    >
                      <p className="text-sm font-medium text-destructive">
                        {erro}
                      </p>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-none"
                    disabled={
                      carregando ||
                      !signUpEmail ||
                      !signUpPassword ||
                      !signUpConfirm
                    }
                  >
                    {carregando ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                    {carregando ? t("signingUp") : t("signUp")}
                  </Button>
                </form>
              )}

              {/* Toggle sign-in / sign-up */}
              {mode !== "verify" && (
                <p className="text-sm text-muted-foreground/60">
                  {mode === "signIn" ? t("noAccount") : t("hasAccount")}{" "}
                  <button
                    type="button"
                    onClick={switchMode}
                    className="underline hover:text-foreground transition-colors"
                  >
                    {mode === "signIn" ? t("createAccount") : t("signInLink")}
                  </button>
                </p>
              )}

              <p className="text-xs text-muted-foreground/40 leading-relaxed">
                {t("termsPrefix")}{" "}
                <a
                  href="/termos"
                  className="underline hover:text-muted-foreground/60"
                >
                  {t("termsLink")}
                </a>{" "}
                {t("termsAnd")}{" "}
                <a
                  href="/privacidade"
                  className="underline hover:text-muted-foreground/60"
                >
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
