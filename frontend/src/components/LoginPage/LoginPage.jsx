import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      // TODO: Call your real login API here
      await new Promise((r) => setTimeout(r, 800));
      console.log({ email, password, remember });
      // navigate("/dashboard")
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-[radial-gradient(900px_500px_at_-10%_-10%,hsl(var(--primary)/0.10),transparent),radial-gradient(700px_400px_at_110%_0%,hsl(var(--accent)/0.12),transparent)]">
      {/* Header (optional) */}
      <header className="container mx-auto flex items-center justify-between px-6 py-5">
        <a href="#" className="inline-flex items-center gap-2 font-semibold tracking-tight">
          <span className="size-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500" />
          <span>Konnect</span>
        </a>
        <Button variant="ghost" className="cursor-pointer">
          Create account
        </Button>
      </header>

      <main className="container mx-auto grid min-h-[calc(100vh-88px)] items-center gap-10 px-6 pb-12 lg:grid-cols-2">
        {/* Left hero (desktop only) */}
        <section className="hidden lg:block">
          <div className="max-w-xl">
            <h1 className="mb-3 text-4xl font-bold tracking-tight sm:text-5xl">Welcome back 👋</h1>
            <p className="mb-8 text-muted-foreground">Sign in to continue to your workspace. Built with Tailwind CSS and shadcn/ui.</p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3"><span className="size-2 rounded-full bg-green-500" /> Secure authentication</li>
              <li className="flex items-center gap-3"><span className="size-2 rounded-full bg-blue-500" /> Clean, responsive UI</li>
              <li className="flex items-center gap-3"><span className="size-2 rounded-full bg-purple-500" /> Dark mode ready</li>
            </ul>
          </div>
        </section>

        {/* Login card */}
        <section className="py-8">
          <Card className="mx-auto w-full max-w-md border-border/60 bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <p className="text-sm text-muted-foreground">Use your email and password, or continue with a provider.</p>
            </CardHeader>

            <CardContent>
              <form className="grid gap-5" onSubmit={onSubmit}>
                {/* Email */}
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPwd ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                      aria-label={showPwd ? "Hide password" : "Show password"}
                    >
                      {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                    Remember me
                  </label>
                  <a href="#" className="text-sm text-primary underline-offset-4 hover:underline">Forgot password?</a>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (<><Loader2 className="mr-2 size-4 animate-spin" /> Signing in...</>) : ("Sign in")}
                </Button>
              </form>

              {/* Providers */}
              <div className="my-6">
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">or continue with</span>
                </div>
              </div>

              {/* <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full" type="button"><Github className="mr-2 size-4" /> GitHub</Button>
                <Button variant="outline" className="w-full" type="button"><Google className="mr-2 size-4" /> Google</Button>
              </div> */}
            </CardContent>

            <CardFooter className="justify-center text-sm text-muted-foreground">
              Don"t have an account?
              <a href="#" className="ml-1 text-primary underline-offset-4 hover:underline">Sign up</a>
            </CardFooter>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* --- Example routing (react-router-dom) ---
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";

const router = createBrowserRouter([{ path: "/login", element: <LoginPage /> }]);
export default function App() { return <RouterProvider router={router} />; }
*/
