"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSignIn, useSignUp } from "@clerk/nextjs"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { TextEffect } from "@/components/ui/text-effect"
import { OAuthButtons } from "@/components/oauth-buttons"
import { ArrowLeft, ArrowRight, Loader2, Check, X, Eye, EyeOff } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { LocaleSwitcher } from "@/components/locale-switcher"
import {
  signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues,
} from "@/lib/validations/auth"

type Mode = "signIn" | "signUp" | "verify" | "signInOtp"

const floatingInputCls =
  "peer h-12 rounded-full bg-muted border-border/50 text-foreground px-5 pt-5 pb-1 shadow-none transition-all duration-200 focus-visible:border-border focus-visible:ring-[3px] focus-visible:ring-border/30 selection:bg-border/60 selection:text-foreground placeholder:text-transparent"

const floatingLabelCls =
  "pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/40 transition-all duration-200 origin-left peer-focus:top-0 peer-focus:translate-y-0 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]"

function FloatingField({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  return (
    <div className="relative">
      <Input
        placeholder=" "
        className={cn(floatingInputCls, className)}
        {...props}
      />
      <span className={floatingLabelCls}>{label}</span>
    </div>
  )
}

function FloatingPasswordField({
  label,
  className,
  ...props
}: React.ComponentProps<"input"> & { label: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        placeholder=" "
        className={cn(floatingInputCls, "pr-10", className)}
        {...props}
      />
      <span className={floatingLabelCls}>{label}</span>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

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
  const [signInOtpValue, setSignInOtpValue] = useState("")
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
        return
      }

      // Client Trust: Clerk may require email OTP on new device
      if (result.status === "needs_second_factor") {
        const emailFactor = result.supportedSecondFactors?.find(
          (f) => f.strategy === "email_code"
        ) as { strategy: "email_code"; emailAddressId: string } | undefined
        if (emailFactor) {
          await signIn.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          })
          setSignInOtpValue("")
          setMode("signInOtp")
        } else {
          setErro(t("errorDefault"))
        }
      } else {
        setErro(t("errorDefault"))
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[] }
      setErro(clerkErr.errors?.[0]?.longMessage || t("errorDefault"))
    } finally {
      setCarregando(false)
    }
  }

  async function handleSignInOtp(code: string) {
    if (!signInLoaded || code.length !== 6) return
    setErro("")
    setCarregando(true)
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      })
      if (result.status === "complete") {
        await setSignInActive({ session: result.createdSessionId })
        router.push("/")
      } else {
        setErro(t("errorVerifyIncomplete"))
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { longMessage?: string }[] }
      setErro(clerkErr.errors?.[0]?.longMessage || t("errorVerify"))
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

        <div className="flex-1 flex items-center justify-center w-full min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            <div className="space-y-6">
              <h1 className="text-xl font-medium tracking-tight text-foreground">
                {mode === "verify"
                  ? t("titleVerify")
                  : mode === "signInOtp"
                    ? t("titleVerify")
                    : mode === "signIn"
                      ? t("titleSignIn")
                      : t("titleSignUp")}
              </h1>

              {/* OAuth buttons (not in verify or signInOtp mode) */}
              {mode !== "verify" && mode !== "signInOtp" && (
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

              {/* Sign-in second factor (email OTP) — Client Trust */}
              {mode === "signInOtp" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {t("verificationSent", {
                      email: signInForm.getValues("email"),
                    })}
                  </p>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      pattern={REGEXP_ONLY_DIGITS}
                      value={signInOtpValue}
                      onChange={(value) => {
                        setSignInOtpValue(value)
                        if (value.length === 6) {
                          handleSignInOtp(value)
                        }
                      }}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={1} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={2} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={3} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={4} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={5} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
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
                    onClick={() => handleSignInOtp(signInOtpValue)}
                    className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 shadow-none"
                    disabled={carregando || signInOtpValue.length !== 6}
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
                    onClick={() => {
                      setMode("signIn")
                      setSignInOtpValue("")
                      setErro("")
                    }}
                    className="w-full text-sm text-center text-muted-foreground/60 hover:text-foreground transition-colors"
                  >
                    {t("signInLink")}
                  </button>
                </div>
              )}

              {/* Verification form (sign-up) */}
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
                      pattern={REGEXP_ONLY_DIGITS}
                      value={otpValue}
                      onChange={(value) => {
                        setOtpValue(value)
                        if (value.length === 6) {
                          handleVerify(value)
                        }
                      }}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={1} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={2} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={3} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={4} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
                        <InputOTPSlot index={5} className="h-12 w-11 text-xl rounded-lg bg-muted border-border/50" />
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
                  <FloatingField
                    type="email"
                    label={t("emailPlaceholder")}
                    autoFocus
                    {...signInForm.register("email")}
                  />
                  <FloatingPasswordField
                    label={t("passwordPlaceholder")}
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
                  <FloatingField
                    type="email"
                    label={t("emailPlaceholder")}
                    autoFocus
                    {...signUpForm.register("email")}
                  />
                  <FloatingPasswordField
                    label={t("passwordPlaceholder")}
                    {...signUpForm.register("password")}
                  />
                  <FloatingPasswordField
                    label={t("confirmPasswordPlaceholder")}
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
              {mode !== "verify" && mode !== "signInOtp" && (
                <p className="text-sm text-center text-muted-foreground/60">
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

              <p className="text-xs text-center text-muted-foreground/40 leading-relaxed">
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

      {/* Right — video panel with glassmorphism */}
      <div className="hidden lg:flex lg:h-screen w-1/2 relative overflow-hidden rounded-l-3xl bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        >
          <source src={LOGIN_VIDEO_URL} type="video/mp4" />
        </video>

        {/* Glassmorphism frosted layer */}
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40 backdrop-saturate-150" />

        {/* Subtle glass border highlight */}
        <div className="pointer-events-none absolute inset-0 border-l border-white/6" />

        {/* Text overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 flex flex-col justify-end p-16 pb-20"
        >
          <h2 className="text-6xl font-medium tracking-tight text-white leading-[0.85] drop-shadow-sm">
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
