import { GalleryVerticalEnd, Eye, EyeOff } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-toastify"
import { useDispatch } from "react-redux"
import { forgotPasswordAPI, resetPasswordAPI } from "@/apis"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  // steps: 1 = ask email, 2 = verify otp + reset
  const [step, setStep] = useState(1)
  const [emailForReset, setEmailForReset] = useState("")

  // password show/hide
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  // resend countdown
  const RESEND_SECONDS = 60
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)

  // --- Step 1: Send OTP form ---
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail }
  } = useForm({ defaultValues: { email: "" } })

  // --- Step 2: Verify + reset form ---
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors, isSubmitting: isSubmittingReset },
    watch,
    reset: resetFormValues,
    getValues
  } = useForm({
    defaultValues: { email: "", otp: "", newPassword: "", confirmPassword: "" }
  })

  useEffect(() => {
    if (step === 2) {
      // set defaults for step 2
      resetFormValues({ email: emailForReset, otp: "", newPassword: "", confirmPassword: "" })
      setSecondsLeft(RESEND_SECONDS)
    }
  }, [step])

  useEffect(() => {
    if (step !== 2 || secondsLeft <= 0) return
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [step, secondsLeft])

  // --- Handlers ---
  const onSendOtp = async ({ email }) => {
    await toast
      .promise(dispatch(forgotPasswordAPI({ email })), { pending: "Sending OTP..." })
      .then((res) => {
        if (!res.error) {
          setEmailForReset(email)
          setStep(2)
        }
      })
  }

  const onResendOtp = async () => {
    if (secondsLeft > 0) return
    if (!emailForReset) return toast.error("Email is missing")

    await toast
      .promise(dispatch(forgotPasswordAPI({ email: emailForReset })), { pending: "Resending OTP..." })
      .then((res) => {
        if (!res.error) setSecondsLeft(RESEND_SECONDS)
      })
  }

  const onResetPassword = async ({ email, otp, newPassword }) => {
    await toast
      .promise(dispatch(resetPasswordAPI({ email, otp, newPassword })), { pending: "Resetting password..." })
      .then((res) => {
        if (!res.error) navigate("/login")
      })
  }

  const newPwd = watch("newPassword")

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
                        Konnect.
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {step === 1 ? (
              <form className={cn("flex flex-col gap-6")} onSubmit={handleSubmitEmail(onSendOtp)}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Forgot password</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                                        Enter your email below and we’ll send a one-time code (OTP).
                  </p>
                </div>

                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      aria-invalid={!!emailErrors.email}
                      {...registerEmail("email", {
                        required: "Email is required",
                        pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email" }
                      })}
                    />
                    {emailErrors.email && (
                      <p className="text-sm text-red-500">{emailErrors.email.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmittingEmail}>
                    {isSubmittingEmail ? "Please wait..." : "Send OTP"}
                  </Button>
                </div>

                <div className="text-center text-sm">
                                    Remembered your password?{" "}
                  <Link to="/login" className="underline underline-offset-4">
                                        Back to login
                  </Link>
                </div>
              </form>
            ) : (
              <form className={cn("flex flex-col gap-6")} onSubmit={handleSubmitReset(onResetPassword)}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Verify OTP</h1>
                  <p className="text-muted-foreground text-sm text-balance">
                                        We’ve sent a 6-digit code to <span className="font-medium">{emailForReset}</span>.
                                        Enter it below, then set your new password.
                  </p>
                </div>

                <div className="grid gap-6">
                  {/* Email (read-only) */}
                  <div className="grid gap-3">
                    <Label htmlFor="email-ro">Email</Label>
                    <Input id="email-ro" type="email" value={emailForReset} readOnly />
                  </div>

                  {/* OTP */}
                  <div className="grid gap-3">
                    <Label htmlFor="otp">OTP</Label>
                    <Input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      aria-invalid={!!resetErrors.otp}
                      {...registerReset("otp", {
                        required: "OTP is required",
                        pattern: { value: /^\d{6}$/, message: "6 digits" }
                      })}
                    />
                    {resetErrors.otp && (
                      <p className="text-sm text-red-500">{resetErrors.otp.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                                            Didn’t receive it? {secondsLeft > 0 ? (
                        <span>Resend in {secondsLeft}s</span>
                      ) : (
                        <button type="button" onClick={onResendOtp} className="underline">
                                                Resend OTP
                        </button>
                      )}
                    </p>
                  </div>

                  {/* New password */}
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="newPassword">New password</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPwd ? "text" : "password"}
                        className="pr-10"
                        aria-invalid={!!resetErrors.newPassword}
                        {...registerReset("newPassword", {
                          required: "Password is required",
                          minLength: { value: 6, message: "Min 6 characters" }
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {resetErrors.newPassword && (
                      <p className="text-sm text-red-500">{resetErrors.newPassword.message}</p>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="grid gap-3">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPwd ? "text" : "password"}
                        className="pr-10"
                        aria-invalid={!!resetErrors.confirmPassword}
                        {...registerReset("confirmPassword", {
                          required: "Confirm your password",
                          validate: (v) => v === getValues("newPassword") || "Passwords do not match"
                        })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
                        aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                      >
                        {showConfirmPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {resetErrors.confirmPassword && (
                      <p className="text-sm text-red-500">{resetErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmittingReset}>
                    {isSubmittingReset ? "Please wait..." : "Reset password"}
                  </Button>

                  <button type="button" className="text-sm underline underline-offset-4" onClick={() => setStep(1)}>
                                        Back
                  </button>
                </div>

                <div className="text-center text-sm">
                                    Remembered your password?{" "}
                  <Link to="/login" className="underline underline-offset-4">
                                        Back to login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Right: media */}
      <div className="bg-muted relative hidden lg:block">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        >
          <source src="/intro.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )
}
