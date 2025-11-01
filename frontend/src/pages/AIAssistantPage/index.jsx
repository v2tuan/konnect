import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronRight, Dumbbell, Sparkles, Users, Clock, Apple, Shield, Mic, PhoneOff } from "lucide-react"
import { useVoiceAgent } from "@/hooks/useVoiceAgent"

function VoiceAgentPanel() {
  const { isCalling, logs, startCall, stopCall } = useVoiceAgent()

  return (
    <Card className="bg-card/90 backdrop-blur-sm border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/70">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-sm text-primary font-medium">Realtime Voice Assistant</span>
        </div>
        <div className="text-sm text-muted-foreground">{isCalling ? "Connected" : "Idle"}</div>
      </div>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent/User tiles */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-background/70">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden border border-border bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">AI</span>
                </div>
                <div className="leading-tight">
                  <div className="text-foreground font-medium">Konnect Agent</div>
                  <div className="text-xs text-muted-foreground">Fitness & Diet Coach</div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{isCalling ? "Speaking..." : "Ready"}</span>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border border-border rounded-lg bg-background/70">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full overflow-hidden border border-border">
                  <img src="https://i.pravatar.cc/100?u=you-konnect" alt="You" className="h-full w-full object-cover" />
                </div>
                <div className="leading-tight">
                  <div className="text-foreground font-medium">You</div>
                  <div className="text-xs text-muted-foreground">Ready</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!isCalling ? (
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => startCall()}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Voice Session
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={stopCall}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Make sure VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID are set in your .env.
            </p>
          </div>

          {/* Transcript / logs */}
          <div className="lg:col-span-2">
            <div className="h-[360px] border border-border rounded-lg bg-background/70 p-4 overflow-y-auto text-sm">
              {logs.length === 0 ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                  Conversation logs will appear here.
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-primary shrink-0">{l.role === "assistant" ? "AI" : l.role === "user" ? "You" : "•"}</span>
                      <span className="text-foreground">{l.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AIAssistantPage() {
  return (
    <div className="w-full pb-24 pt-10">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header: Program Gallery */}
        <div className="bg-card/90 backdrop-blur-sm border border-border rounded-lg overflow-hidden mb-10">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/70">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-sm text-primary font-medium">Program Gallery</span>
            </div>
            <div className="text-sm text-muted-foreground">Featured Plans</div>
          </div>

          <div className="p-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-foreground">AI-Generated </span>
              <span className="text-primary">Programs</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Explore personalized fitness plans created by the Konnect AI agent
            </p>

            <div className="flex items-center justify-center gap-16 mt-10 font-mono">
              <div className="flex flex-col items-center">
                <p className="text-3xl text-primary">500+</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">PROGRAMS</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-3xl text-primary">3min</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">CREATION TIME</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-3xl text-primary">100%</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wide mt-1">PERSONALIZED</p>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Agent Panel */}
        <div className="mb-12">
          <VoiceAgentPanel />
        </div>

      </div>
    </div>
  )
}