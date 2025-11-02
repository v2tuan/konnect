// pages/OtpPage/OtpPage.jsx
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { GalleryVerticalEnd } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  InputOTP, InputOTPGroup, /* InputOTPSeparator, */ InputOTPSlot
} from "@/components/ui/input-otp"
import { forgotPasswordAPI, resendSignupOtpAPI, verifyOtpAPI } from "@/apis"

export default function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // lấy param
  const emailState = location.state?.email
  const purposeState = location.state?.purpose
  const search = useMemo(() => new URLSearchParams(location.search), [location.search])
  const email = emailState || search.get("email") || ""
  const purpose = purposeState || search.get("purpose") || "forgot"

  useEffect(() => {
    if (!email) navigate("/auth/forgot", { replace: true })
  }, [email])

  // state
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)

  // resend cooldown
  const RESEND = 60
  const [left, setLeft] = useState(RESEND)
  const timerRef = useRef(null)
  useEffect(() => {
    timerRef.current = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const onVerify = async (e) => {
    e?.preventDefault()
    if (otp.length !== 6) return toast.error("Please enter the 6-digit code.")
    try {
      setLoading(true)
      await toast.promise(verifyOtpAPI({ email, otp, purpose }), { pending: "Verifying..." })
      if (purpose === "signup") {
        toast.success("Email verified! You can log in now.")
        navigate("/login", { replace: true })
      } else {
        navigate(`/auth/forgot/reset?email=${encodeURIComponent(email)}&otp=${otp}`, {
          state: { email, otp }
        })
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Verify failed")
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (left > 0) return
    try {
      setLoading(true)
      if (purpose === "signup") {
        await toast.promise(resendSignupOtpAPI({ email }), { pending: "Resending OTP..." })
      } else {
        await toast.promise(forgotPasswordAPI({ email }), { pending: "Resending OTP..." })
      }
      setLeft(RESEND)
      toast.success("OTP resent!")
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to resend OTP")
    } finally {
      setLoading(false)
    }
  }

  const title = purpose === "signup" ? "Verify account" : "Enter the code"
  const hint  = purpose === "signup"
    ? <>Enter the verification code sent to <b>{email}</b></>
    : <>We sent a 6-digit code to <b>{email}</b></>

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* LEFT: form giữ layout cũ */}
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
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-muted-foreground text-sm text-balance">{hint}</p>
              </div>

              <div className="grid gap-6">
                {/* OTP input: không dấu gạch, căn đều */}
                <div className="grid gap-3">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    className="w-full flex justify-center"
                  >
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-12 w-10 text-center text-lg" />
                      <InputOTPSlot index={1} className="h-12 w-10 text-center text-lg" />
                      <InputOTPSlot index={2} className="h-12 w-10 text-center text-lg" />
                      <InputOTPSlot index={3} className="h-12 w-10 text-center text-lg" />
                      <InputOTPSlot index={4} className="h-12 w-10 text-center text-lg" />
                      <InputOTPSlot index={5} className="h-12 w-10 text-center text-lg" />
                    </InputOTPGroup>

                    {/*
                    Nếu bạn muốn giữ nhóm 2-2-2 và có gạch giữa,
                    bỏ comment 2 dòng sau và chia lại groups:
                    <InputOTPSeparator />
                    */}
                  </InputOTP>

                  <p className="text-center text-xs text-muted-foreground">
                    Didn’t get the code?{" "}
                    {left > 0 ? (
                      <span>Resend in {left}s</span>
                    ) : (
                      <button type="button" onClick={onResend} className="underline">
                        Resend
                      </button>
                    )}
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? "Please wait..." : "Verify"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* RIGHT: video nền giữ nguyên */}
      <div className="bg-muted relative hidden lg:block">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        >
          <source src="/intro.mp4" type="video/mp4" />
          Trình duyệt của bạn không hỗ trợ video.
        </video>
      </div>
    </div>
  )
}
