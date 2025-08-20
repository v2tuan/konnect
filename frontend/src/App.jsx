import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function App() {
  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Welcome 👋</h1>
          <p className="text-sm text-muted-foreground">Tailwind + shadcn/ui + Vite</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button onClick={() => alert(email ? `Hello, ${email}` : "Enter email!")}>
          Continue
        </Button>
      </Card>
    </div>
  );
}
