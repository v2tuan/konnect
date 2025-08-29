import { GalleryVerticalEnd, Eye, EyeOff } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useMemo, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "react-toastify"
// ❌ bỏ useDispatch ở đây
import { resetPasswordAPI } from "@/apis"

export default function ForgotResetPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const email =
        location.state?.email || new URLSearchParams(location.search).get("email") || ""
  const otp =
        location.state?.otp || new URLSearchParams(location.search).get("otp") || ""

  // Điều hướng nên làm trong effect (tránh side-effect trong render)
  useEffect(() => {
    if (!email || !otp) navigate("/forgot", { replace: true })
  }, [email, otp, navigate])

  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues, watch } = useForm({
    defaultValues: { newPassword: "", confirmPassword: "" }
  })

  const newPwd = watch("newPassword")
  const strength = useMemo(() => {
    let s = 0
    if (newPwd.length >= 8) s++
    if (/[A-Z]/.test(newPwd)) s++
    if (/[a-z]/.test(newPwd)) s++
    if (/[0-9]/.test(newPwd)) s++
    if (/[^A-Za-z0-9]/.test(newPwd)) s++
    return s
  }, [newPwd])

  const onSubmit = async ({ newPassword }) => {
    try {
      await toast.promise(
        // ✅ GỌI TRỰC TIẾP, KHÔNG dispatch
        resetPasswordAPI({ email, otp, newPassword }),
        { pending: "Resetting password...", success: "Password reset!" }
      )
      navigate("/login")
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err?.message || "Reset failed"

      // 400 từ backend: OTP sai/hết hạn
      if (status === 400 && /invalid|expired otp/i.test(msg)) {
        toast.error("OTP không hợp lệ hoặc đã hết hạn. Vui lòng nhập lại OTP.")
        navigate(`/forgot/otp?email=${encodeURIComponent(email)}`)
      } else {
        toast.error(msg)
      }
    }
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
            <form className={cn("flex flex-col gap-6")} onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Set a new password</h1>
                <p className="text-muted-foreground text-sm text-balance">
                                    For <span className="font-medium">{email}</span>
                </p>
              </div>

              <div className="grid gap-6">
                {/* New password */}
                <div className="grid gap-3">
                  <Label htmlFor="newPassword">New password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPwd ? "text" : "password"}
                      className="pr-10"
                      aria-invalid={!!errors.newPassword}
                      {...register("newPassword", {
                        required: "Password is required",
                        minLength: { value: 6, message: "Min 6 characters" } // khớp rule backend nếu cần >=8
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="text-sm text-red-500">{errors.newPassword.message}</p>}

                  {/* Strength meter */}
                  <div className="mt-1 h-1 w-full rounded bg-neutral-200">
                    <div className="h-1 rounded bg-primary transition-all" style={{ width: `${(strength / 5) * 100}%` }} />
                  </div>
                </div>

                {/* Confirm password */}
                <div className="grid gap-3">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPwd ? "text" : "password"}
                      className="pr-10"
                      aria-invalid={!!errors.confirmPassword}
                      {...register("confirmPassword", {
                        required: "Confirm your password",
                        validate: v => v === getValues("newPassword") || "Passwords do not match"
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
                      aria-label={showConfirmPwd ? "Hide password" : "Show password"}
                    >
                      {showConfirmPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Please wait..." : "Reset password"}
                </Button>

                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => navigate(`/forgot/otp?email=${encodeURIComponent(email)}`)}
                  >
                                        Back
                  </button>
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
