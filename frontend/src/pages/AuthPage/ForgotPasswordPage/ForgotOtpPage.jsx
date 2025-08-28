import { GalleryVerticalEnd } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "react-toastify"
import { useDispatch } from "react-redux"
import { forgotPasswordAPI } from "@/apis"

export default function ForgotOtpPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const location = useLocation()

  const emailFromState = location.state?.email
  const emailFromQuery = useMemo(() => new URLSearchParams(location.search).get("email") || "", [location.search])
  const email = emailFromState || emailFromQuery

  useEffect(() => {
    if (!email) navigate("/forgot", { replace: true })
  }, [email])

  const RESEND_SECONDS = 60
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS)
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])

  // OTP segmented inputs
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const inputsRef = useRef([])

  const focusIndex = (i) => inputsRef.current[i]?.focus()
  const handleOtpChange = (i, v) => {
    const d = v.replace(/\D/g, "").slice(0, 1)
    const next = [...otpDigits]
    next[i] = d
    setOtpDigits(next)
    if (d && i < 5) focusIndex(i + 1)
  }
  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      if (otpDigits[i]) {
        const next = [...otpDigits]
        next[i] = ""
        setOtpDigits(next)
      } else if (i > 0) focusIndex(i - 1)
    }
  }
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    const next = text.split("")
    while (next.length < 6) next.push("")
    setOtpDigits(next.slice(0, 6))
  }

  const otpValue = otpDigits.join("")

  const onResendOtp = async () => {
    if (secondsLeft > 0) return
    await toast
      .promise(dispatch(forgotPasswordAPI({ email })), { pending: "Resending OTP..." })
      .then((res) => {
        if (!res.error) setSecondsLeft(RESEND_SECONDS)
      })
  }

  const onVerify = (e) => {
    e.preventDefault()
    if (otpValue.length !== 6) return toast.error("Please enter the 6-digit OTP.")
    navigate(`/auth/forgot/reset?email=${encodeURIComponent(email)}&otp=${otpValue}`, {
      state: { email, otp: otpValue }
    })
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
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
            <form className={cn("flex flex-col gap-6")} onSubmit={onVerify}>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Enter the code</h1>
                <p className="text-muted-foreground text-sm text-balance">
                                    We sent a 6‑digit code to <span className="font-medium">{email}</span>.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label>OTP</Label>
                  <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((d, i) => (
                      <Input
                        key={i}
                        ref={(el) => (inputsRef.current[i] = el)}
                        value={d}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        inputMode="numeric"
                        maxLength={1}
                        className="h-12 w-10 text-center text-lg"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                                        Didn’t get the code? {secondsLeft > 0 ? (
                      <span>Resend in {secondsLeft}s</span>
                    ) : (
                      <button type="button" onClick={onResendOtp} className="underline">Resend OTP</button>
                    )}
                  </p>
                </div>

                <Button type="submit" className="w-full">Verify</Button>
                <div className="text-center text-sm">
                  <button type="button" className="underline underline-offset-4" onClick={() => navigate("/forgot")}>Change email</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-muted relative hidden lg:block">
        <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale">
          <source src="/intro.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )
}
