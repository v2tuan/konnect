import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, PhoneOff } from "lucide-react"
import { useVoiceAgent } from "@/hooks/useVoiceAgent"

// wave bars cho visual mic local
function useMicActivity(active) {
  const [level, setLevel] = useState(0) // 0..1
  const streamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const dataRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    let stopped = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })
        streamRef.current = stream

        const AC = window.AudioContext || window.webkitAudioContext
        audioCtxRef.current = new AC()
        const src = audioCtxRef.current.createMediaStreamSource(stream)
        analyserRef.current = audioCtxRef.current.createAnalyser()
        analyserRef.current.fftSize = 256
        src.connect(analyserRef.current)

        dataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)

        const loop = () => {
          if (!analyserRef.current || stopped) return
          analyserRef.current.getByteFrequencyData(dataRef.current)
          let sum = 0
          for (let i = 0; i < dataRef.current.length; i++) {
            sum += dataRef.current[i]
          }
          const avg = sum / dataRef.current.length // 0..255
          const normalized = Math.min(1, avg / 128)
          setLevel((prev) => prev * 0.8 + normalized * 0.2)
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      } catch (e) {
        // mic deny
        setLevel(0)
      }
    }

    function stop() {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      analyserRef.current = null
      dataRef.current = null
      setLevel(0)
    }

    if (active) start()
    else stop()

    return stop
  }, [active])

  return level
}

// synthetic wave cho AI (để nó nhấp nháy khi assistant đang nói)
function useSyntheticWave(isSpeaking) {
  const [lvl, setLvl] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!isSpeaking) {
      setLvl(0.05)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    let frame = 0
    const loop = () => {
      frame++
      // tạo nhịp dao động nhẹ 0.2..0.9
      const v =
        0.5 +
        0.4 * Math.sin(frame / 10) +
        0.1 * Math.sin(frame / 2.3)
      setLvl(Math.max(0.1, Math.min(0.95, v)))
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isSpeaking])

  return lvl
}

function Bars({ intensity = 0, bars = 24, colorClass = "bg-primary" }) {
  const multipliers = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        // cao nhất ở giữa
        return 0.4 + 0.6 * Math.sin((i / (bars - 1)) * Math.PI)
      }),
    [bars]
  )

  return (
    <div className="flex items-end gap-[3px] h-10">
      {multipliers.map((m, i) => {
        const h = 0.12 + m * intensity
        return (
          <div
            key={i}
            className={`w-1 rounded-sm ${colorClass}/80 shadow-[0_0_10px_rgba(59,130,246,0.25)]`}
            style={{
              transform: `scaleY(${Math.max(
                0.12,
                Math.min(1, h)
              )})`,
              transformOrigin: "bottom",
              transition: "transform 60ms linear",
            }}
          />
        )
      })}
    </div>
  )
}

function VoiceAgentPanel() {
  const {
    callStatus, activeSpeaker, history, liveTurn, startCall, stopCall,
  } = useVoiceAgent()

  // mic level cho user
  const micLevel = useMicActivity(callStatus === "active")
  // AI wave nhảy nếu assistant đang nói
  const aiLevel = useSyntheticWave(callStatus === "active" && activeSpeaker === "assistant")

  // helper status text
  const headerStatusText = (() => {
    if (callStatus === "active") return "Live · Connected"
    if (callStatus === "connecting") return "Connecting…"
    if (callStatus === "ended") return "Call ended"
    return "Idle · Tap to start"
  })()

  // hiển thị trạng thái nói
  const aiSpeaking = activeSpeaker === "assistant" && callStatus === "active"
  const userSpeaking = activeSpeaker === "user" && callStatus === "active"

  // NEW: auto scroll transcript
  const scrollRef = useRef(null)
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [history, liveTurn])

  return (
    <Card className="bg-card/90 backdrop-blur-md border border-border/70 overflow-hidden relative">
      {/* subtle gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_-10%,hsl(var(--primary)/0.12),transparent_60%)]" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background/70">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
          <span className="text-sm text-primary font-medium tracking-wide">
            Konnect Voice Session
          </span>
        </div>
        <div
          className={[
            "text-xs px-2 py-1 rounded-md border",
            callStatus === "active"
              ? "text-primary border-primary/40 bg-primary/10"
              : callStatus === "connecting"
              ? "text-amber-500 border-amber-500/40 bg-amber-500/10"
              : callStatus === "ended"
              ? "text-muted-foreground border-border bg-background/60"
              : "text-muted-foreground border-border bg-background/60",
          ].join(" ")}
        >
          {headerStatusText}
        </div>
      </div>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: status + controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Konnect AI card */}
            <div
              className={[
                "px-4 py-4 border rounded-lg bg-background/70 flex flex-col gap-3 transition-all",
                aiSpeaking ? "border-primary/50 shadow-[0_0_24px_hsl(var(--primary)/0.25)]" : "border-border",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "h-12 w-12 rounded-full overflow-hidden flex items-center justify-center",
                      aiSpeaking ? "ring-2 ring-primary/60 shadow-[0_0_16px_hsl(var(--primary)/0.35)]" : "",
                      "border border-border bg-primary/10",
                    ].join(" ")}
                  >
                    <span className="text-primary font-semibold">AI</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-foreground font-medium">Konnect AI</div>
                    <div className="text-xs text-muted-foreground">Listener / Friend</div>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground text-right">
                  {callStatus === "active" ? (
                    <>
                      <div className={aiSpeaking ? "text-primary font-medium" : ""}>
                        {aiSpeaking ? "Speaking…" : "Listening…"}
                      </div>
                      <div className="opacity-70">realtime</div>
                    </>
                  ) : callStatus === "connecting" ? (
                    <>
                      <div className="font-medium text-muted-foreground/80">Connecting…</div>
                      <div className="opacity-70">please allow mic</div>
                    </>
                  ) : callStatus === "ended" ? (
                    <>
                      <div className="font-medium text-muted-foreground/80">Ended</div>
                      <div className="opacity-70">tap to start new</div>
                    </>
                  ) : (
                    <>
                      <div className="font-medium text-muted-foreground/80">Ready</div>
                      <div className="opacity-70">tap to start</div>
                    </>
                  )}
                </div>
              </div>

              {/* AI wave */}
              <div className="flex items-center justify-center h-10">
                <Bars intensity={aiLevel} colorClass="bg-primary" />
              </div>
            </div>

            {/* User card */}
            <div
              className={[
                "px-4 py-4 border rounded-lg bg-background/70 flex items-center justify-between transition-all",
                userSpeaking ? "border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.25)]" : "border-border",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "h-12 w-12 rounded-full overflow-hidden border",
                    userSpeaking ? "ring-2 ring-emerald-500/60" : "border-border",
                  ].join(" ")}
                >
                  <img
                    src="https://i.pravatar.cc/100?u=you-konnect"
                    alt="You"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="leading-tight">
                  <div className="text-foreground font-medium">You</div>
                  <div className="text-xs text-muted-foreground">
                    {callStatus === "active" ? (userSpeaking ? "Talking…" : "Quiet") : "Ready"}
                  </div>
                </div>
              </div>

              {/* mic bars */}
              <div className="h-10 flex items-end">
                <Bars intensity={callStatus === "active" ? micLevel : 0} colorClass="bg-emerald-500" />
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {callStatus === "active" || callStatus === "connecting" ? (
                <Button variant="destructive" className="flex-1" onClick={stopCall}>
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              ) : (
                <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={startCall}>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Voice Session
                </Button>
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
              Talk like you’re chatting with a close friend. I’ll listen first, then answer back. Waves
              react to your mic while on call.
            </p>
          </div>

          {/* RIGHT COLUMN: Transcript */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                live transcript
              </div>
              <div className="text-[10px] text-muted-foreground">
                {callStatus === "active" ? "streaming…" : callStatus === "connecting" ? "connecting…" : "idle"}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 h-[420px] border border-border rounded-lg bg-background/70 p-4 overflow-y-auto text-sm"
            >
              {history.length === 0 && !liveTurn ? (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-center px-6 text-xs">
                  Nói điều bạn muốn bằng tiếng Việt. Mình sẽ lắng nghe và phản hồi theo lượt.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((t, i) => {
                    const isAI = t.role === "assistant"
                    return (
                      <div key={t.at ?? i} className={`flex ${isAI ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed shadow-sm border
                          ${isAI ? "bg-primary/10 border-primary/20 text-foreground" : "bg-emerald-500/10 border-emerald-500/30"}
                        `}>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-mono">
                            {isAI ? "Konnect AI" : "Bạn"}
                          </div>
                          <div className="whitespace-pre-wrap">{t.textVi}</div>
                        </div>
                      </div>
                    )
                  })}

                  {liveTurn ? (
                    <div className={`flex ${liveTurn.role === "assistant" ? "justify-start" : "justify-end"} opacity-95`}>
                      <div className={`max-w-[85%] rounded-2xl px-3 py-2 border shadow-sm
                        ${liveTurn.role === "assistant" ? "bg-primary/10 border-primary/20" : "bg-emerald-500/10 border-emerald-500/30"}
                      `}>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-mono">
                          {liveTurn.role === "assistant" ? "Konnect AI" : "Bạn"}
                        </div>
                        <div className="whitespace-pre-wrap">
                          {liveTurn.textVi}
                          <span className="animate-pulse"> …</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-2">
              {callStatus === "active" ? (
                <span className="text-[10px] text-primary flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Connected
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Not in call</span>
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
        {/* gallery/header */}
        <div className="relative bg-card/90 backdrop-blur-md border border-border rounded-lg overflow-hidden mb-10">
          <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent_60%)] pointer-events-none" />
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
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Programs</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-2">
              Explore personalized fitness plans created by the Konnect AI agent
            </p>
            <p className="text-xs text-muted-foreground">Realtime voice + structured plans</p>
          </div>
        </div>

        {/* voice call panel */}
        <div className="mb-12">
          <VoiceAgentPanel />
        </div>
      </div>
    </div>
  )
}
