import { GalleryVerticalEnd, ChevronDownIcon, Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { registerUserAPI } from "@/apis"
import { toast } from "react-toastify"

export default function SignUpPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [open, setOpen] = useState(false)

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { fullName: "", email: "", password: "", dateOfBirth: null, gender: "" }
  })

  const onSubmit = async (data) => {
    console.log("Form submitted:", data)

    await toast.promise(
      registerUserAPI(data),
      { pending: "Creating account..." }
    ).then((res) => {
      console.log("Registration response:", res)
      toast.success("Account created successfully!")
      navigate("/login")
    }).catch((err) => {
      console.log(err.message || "Registration failed")
      toast.error(err.message || "Registration failed")
    })
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
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

      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Konnect.
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <form className={cn("flex flex-col gap-6")} onSubmit={handleSubmit(onSubmit)}>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Hi there! Welcome to Konnect.
                </p>
              </div>

              <div className="grid gap-6">
                {/* Name */}
                <div className="grid gap-3">
                  <Label htmlFor="fullName">Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    {...register("fullName", { required: "Username is required" })}
                    className={cn(
                      "pr-10",
                      errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                    )}
                  />
                  {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
                </div>

                {/* Date of Birth + Gender */}
                <div className="flex flex-row gap-6">
                  {/* Date of Birth */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dateOfBirth" className="px-1">Date of Birth</Label>
                    <Controller
                      control={control}
                      name="dateOfBirth"
                      rules={{ required: "Date of birth is required" }}
                      render={({ field }) => (
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-48 justify-between font-normal",
                                errors.dateOfBirth ? "!border-red-500 focus:!border-red-500 focus:!ring-red-500" : ""
                              )}

                              onClick={() => setOpen(true)}
                            >
                              {field.value ? field.value.toLocaleDateString() : "Select date"}
                              <ChevronDownIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                field.onChange(date)
                                setOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth.message}</p>}
                  </div>

                  {/* Gender */}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Controller
                      control={control}
                      name="gender"
                      rules={{ required: "Please select your gender" }}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger
                            className={cn(
                              "w-[180px]",
                              errors.gender ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                            )}
                          >
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.gender && <p className="text-red-500 text-sm">{errors.gender.message}</p>}
                  </div>
                </div>

                {/* Email */}
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Invalid email address"
                      }
                    })}
                    className={cn(
                      "pr-10",
                      errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                    )}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="grid gap-3">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      {...register("password", { required: "Password is required", minLength: { value: 6, message: "Password must be at least 6 characters" } })}
                      className={cn(
                        "pr-10",
                        errors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Signing up..." : "Sign Up"}
                </Button>
              </div>

              <div className="text-center text-sm">
                Already have an account?{" "}
                <a href="/login" className="underline underline-offset-4">Sign in</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
