import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Lock, User, Facebook, Twitter, Mail, MessageSquareMore} from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", remember: false });

  return (
    <div className="min-h-screen w-full bg-neutral-50 p-4 md:p-8 lg:p-12 flex items-center justify-center text-white">
      <div className="flex flex-col md:flex-row w-full min-h-[90vh] bg-neutral-950 rounded-2xl overflow-hidden">
        {/* LEFT giữ nguyên */}
        {/* LEFT */}
        <div className="relative hidden lg:flex lg:flex-col lg:w-2/5 bg-white text-neutral-900">
          {/* Brand */}
          <div className="z-10 p-10 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg grid place-items-center text-neutral-900 text-3xl">
                <MessageSquareMore size={36} />
              </div>
              <span className="font-bold text-4xl">Konnect</span>
            </div>
            <span className="text-base text-neutral-700">Responsive Chat App</span>
          </div>


          {/* Illustration + overlays (ảnh giữa, confetti full-width) */}
          <div className="relative z-10 flex-1 flex items-center justify-center px-6">
            {/* Image centered & responsive */}
            <img
              src="/login.png"
              alt="Login Illustration"
              className="w-full pb-50 h-auto object-contain max-w-[420px] md:max-w-[820px] xl:max-w-[920px]"
            />

            {/* speech bubble */}
            <div className="absolute left-8 bottom-28 bg-neutral-900 text-white rounded-2xl shadow-md px-4 py-3 font-medium">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-neutral-700 grid place-items-center">😊</div>
                <span>Hello!</span>
              </div>
              <div className="absolute -left-3 bottom-2 h-4 w-4 rotate-45 bg-neutral-900" />
            </div>

            {/* confetti dots (kéo dài hết chiều ngang cột trái) */}
            <div className="absolute left-6 right-6 bottom-8 flex gap-2 flex-wrap">
              {Array.from({ length: 96 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: i % 3 === 0 ? "#111827" : i % 3 === 1 ? "#1f2937" : "#374151",
                  }}
                />
              ))}
            </div>
          </div>
        </div>


        <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16">
          <Card
            className="
              w-full max-w-lg               
              border border-neutral-700/60
              bg-neutral-900/70               
              backdrop-blur-md
              shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]
              rounded-2xl
            "
          >
            <div className="w-full space-y-7 p-6 sm:p-8">
              {/* Header */}
              <div className="text-center space-y-1.5">
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-50">Welcome Back</h1>
                <p className="text-sm text-neutral-400">Sign in to continue to Konnect</p>
              </div>

              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert(JSON.stringify(form, null, 2));
                }}
              >
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-neutral-200">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      placeholder="admin@themesbrand.com"
                      value={form.username}
                      onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                      className="
                        h-12 pl-11 pr-3
                        bg-neutral-800/80 border-neutral-700
                        text-white placeholder:text-neutral-500
                        focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:border-neutral-400
                      "
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-neutral-200">Password</Label>
                    <a className="text-xs text-neutral-300 hover:underline" href="#">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                      className="
                        h-12 pl-11 pr-11
                        bg-neutral-800/80 border-neutral-700
                        text-white placeholder:text-neutral-500
                        focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:border-neutral-400
                      "
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Submit */}
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      id="remember"
                      checked={form.remember}
                      onCheckedChange={(c) => setForm((s) => ({ ...s, remember: Boolean(c) }))}
                    />
                    <span className="text-sm text-neutral-300">Remember me</span>
                  </label>

                  <Button
                    type="submit"
                    className="
                      h-11 px-6
                      bg-white text-black hover:bg-neutral-200
                      rounded-xl font-medium
                    "
                  >
                    Log In
                  </Button>
                </div>
              </form>

              {/* Social sign-in */}
              <div className="space-y-4">
                <div className="relative">
                  <Separator className="bg-neutral-700" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-neutral-900/70 backdrop-blur px-3 text-xs text-neutral-400">
                    Or continue with
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Button variant="outline" className="h-11 border-neutral-700 text-black hover:bg-neutral-800 rounded-xl">
                    <Facebook className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="h-11 border-neutral-700 text-black hover:bg-neutral-800 rounded-xl">
                    <Twitter className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="h-11 border-neutral-700 text-black hover:bg-neutral-800 rounded-xl">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="space-y-2">
                <p className="text-center text-sm text-neutral-300">
                  Don’t have an account?{" "}
                  <a className="text-white underline-offset-2 hover:underline" href="#">Register</a>
                </p>
                <p className="text-center text-[11px] text-neutral-500">
                  © 2025 Konnect. Crafted with 💚 by Themesbrand
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
