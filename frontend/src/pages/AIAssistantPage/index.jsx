import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, PhoneOff, Bot } from "lucide-react"
import { useVoiceAgent } from "@/hooks/useVoiceAgent"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"

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

  const user = useSelector(selectCurrentUser)

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

  // auto scroll transcript
  const scrollRef = useRef(null)
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [history, liveTurn])

  // keyframes avatar rung khi nói
  const SpeakingAnimation = () => (
    <style>{`
      @keyframes talk-bounce {
        0%,100% { transform: translateY(0) rotate(0deg) scale(1); }
        20% { transform: translateY(-1px) rotate(-1deg) scale(1.02); }
        40% { transform: translateY(0.5px) rotate(1deg) scale(1.01); }
        60% { transform: translateY(-1px) rotate(-1deg) scale(1.02); }
        80% { transform: translateY(0.5px) rotate(1deg) scale(1.01); }
      }
      .animate-talking {
        animation: talk-bounce 0.6s infinite;
      }
    `}</style>
  )

  // style helpers cho 2 thẻ AI / User
  const aiWrapperClass = [
    "relative flex flex-col rounded-xl border px-4 py-4 bg-background/70 min-w-0 transition-all duration-200",
    aiSpeaking
      ? "ring-2 ring-primary/60 border-primary/50 shadow-[0_0_32px_hsl(var(--primary)/0.35)] bg-primary/5"
      : "border-border opacity-75"
  ].join(" ")

  const userWrapperClass = [
    "relative flex flex-col rounded-xl border px-4 py-4 bg-background/70 min-w-0 transition-all duration-200",
    userSpeaking
      ? "ring-2 ring-emerald-500/60 border-emerald-500/50 shadow-[0_0_32px_rgba(16,185,129,0.35)] bg-emerald-500/5"
      : "border-border opacity-75"
  ].join(" ")

  // avatar wrapper glow + shake nếu đang nói
  const aiAvatarClass = [
    "h-12 w-12 rounded-full overflow-hidden flex items-center justify-center border border-border bg-primary/10 text-primary font-semibold",
    aiSpeaking
      ? "ring-2 ring-primary/60 shadow-[0_0_16px_hsl(var(--primary)/0.45)] animate-talking"
      : ""
  ].join(" ")

  const userAvatarClass = [
    "h-12 w-12 rounded-full overflow-hidden border border-border",
    userSpeaking
      ? "ring-2 ring-emerald-500/60 shadow-[0_0_16px_rgba(16,185,129,0.45)] animate-talking"
      : ""
  ].join(" ")

  return (
    <>
      <SpeakingAnimation />

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

        <CardContent className="p-6 space-y-6">
          {/* HÀNG AVATAR (AI + YOU) */}
          <div className="flex flex-col h-20 md:flex-row md:items-stretch md:gap-4 gap-4">
            {/* Konnect AI */}
            <div className={aiWrapperClass + " flex-1"}>
              <div className="flex items-start justify-between">
                {/* left: avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={aiAvatarClass}>
                    {/* đổi chữ AI thành icon robot */}
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div className="leading-tight min-w-0">
                    <div className="text-foreground font-medium flex items-center gap-2">
                      <span>Konnect AI</span>
                      {aiSpeaking && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Listener / Friend
                    </div>
                  </div>
                </div>

                {/* right: state text */}
                <div className="text-[10px] text-muted-foreground text-right shrink-0 leading-tight">
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
              <div className="flex items-center justify-center h-10 mt-4">
                <Bars intensity={aiLevel} colorClass="bg-primary" />
              </div>
            </div>

            {/* You */}
            <div className={userWrapperClass + " flex-1"}>
              <div className="flex items-start justify-between">
                {/* left: avatar + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={userAvatarClass}>
                    <img
                      src={user.avatarUrl}
                      alt="You"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="leading-tight min-w-0">
                    <div className="text-foreground font-medium flex items-center gap-2">
                      <span>You</span>
                      {userSpeaking && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {callStatus === "active"
                        ? (userSpeaking ? "Talking…" : "Quiet")
                        : "Ready"}
                    </div>
                  </div>
                </div>

                {/* right: mic bars */}
                <div className="h-10 flex items-end shrink-0 ml-4">
                  <Bars
                    intensity={callStatus === "active" ? micLevel : 0}
                    colorClass="bg-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CONTROLS + NOTE (ĐƯA LÊN TRƯỚC TRANSCRIPT) */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            {/* căn giữa nút trong div cha */}
            <div className="w-full flex justify-center">
              {callStatus === "active" || callStatus === "connecting" ? (
                <Button
                  variant="destructive"
                  className="w-64"
                  onClick={stopCall}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              ) : (
                <Button
                  className="w-64 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={startCall}
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Start Voice Session
                </Button>
              )}
            </div>

            <div className="flex justify-end">
              {callStatus === "active" ? (
                <span className="text-[10px] text-primary flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Connected
                </span>
              ) : callStatus === "connecting" ? (
                <span className="text-[10px] text-amber-500 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  Connecting…
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Not in call</span>
              )}
            </div>
          </div>

          {/* TRANSCRIPT (CÓ SCROLLBAR, KHÔNG LÀM TRÀN CARD) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                live transcript
              </div>
            </div>

            <div
              ref={scrollRef}
              className="h-[300px] md:h-[300px] border border-border rounded-lg bg-background/70 p-4 overflow-y-auto text-sm shadow-inner"
            >
              {history.length === 0 && !liveTurn ? (
                <div className="h-full w-full min-h-50 flex items-center justify-center text-muted-foreground text-center px-6 text-xs">
                  Nội dung cuộc gọi.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((t, i) => {
                    const isAI = t.role === "assistant"
                    return (
                      <div
                        key={t.at ?? i}
                        className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 leading-relaxed shadow-sm border transition-colors
                            ${
                              isAI
                                ? "bg-primary/10 border-primary/20 text-foreground"
                                : "bg-emerald-500/10 border-emerald-500/30"
                            }
                          `}
                        >
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-mono flex items-center gap-2">
                            <span>{isAI ? "Konnect AI" : "Bạn"}</span>
                          </div>
                          <div className="whitespace-pre-wrap">{t.textVi}</div>
                        </div>
                      </div>
                    )
                  })}

                  {liveTurn ? (
                    <div
                      className={`flex ${
                        liveTurn.role === "assistant" ? "justify-start" : "justify-end"
                      } opacity-95`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 border shadow-sm transition-colors
                          ${
                            liveTurn.role === "assistant"
                              ? "bg-primary/10 border-primary/20"
                              : "bg-emerald-500/10 border-emerald-500/30"
                          }
                        `}
                      >
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 font-mono flex items-center gap-2">
                          <span>{liveTurn.role === "assistant" ? "Konnect AI" : "Bạn"}</span>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                          </span>
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
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function AIAssistantPage() {
  return (
    <div className="w-full pb-24 pt-2">
      <div className="container mx-auto max-w-6xl px-4">
        {/* voice call panel */}
        <div className="mb-12">
          <VoiceAgentPanel />
        </div>
      </div>
    </div>
  )
}
