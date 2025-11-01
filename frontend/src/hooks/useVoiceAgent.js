/* eslint-disable no-empty */
import { useCallback, useEffect, useRef, useState } from "react"
import Vapi from "@vapi-ai/web"

/**
 * Hook voice agent realtime kiểu "gọi tâm sự"
 * ------------------------------------------------
 * EXPOSE RA NGOÀI:
 * - callStatus      : "idle" | "connecting" | "active" | "ended"
 * - activeSpeaker   : "user" | "assistant" | null
 * - history         : [{ role, textVi, textEn, at }]
 * - liveTurn        : { role, textVi } | null
 * - startCall()     : () => void
 * - stopCall()      : () => void
 *
 * GIẢI THÍCH STATE:
 * - history    = các câu đã finalize rồi (user/assistant). Không chứa system.
 * - liveTurn   = câu đang nói dở (partial). Chưa finalize.
 * - activeSpeaker = ai đang nói ở thời điểm gần nhất (user | assistant | null).
 * - callStatus = để UI hiển thị "Connecting... / On Call / Ended"
 *
 * LƯU Ý ENV:
 * - Ưu tiên workflow mode (như codeflex): VITE_VAPI_WORKFLOW_ID
 * - Nếu bạn chưa có workflow mà dùng assistant cũ: VITE_VAPI_ASSISTANT_ID
 * - Public key: VITE_VAPI_PUBLIC_KEY
 */

export function useVoiceAgent() {
  const vapiRef = useRef(null)

  // ===== core call states =====
  const [callStatus, setCallStatus] = useState("idle") // "idle" | "connecting" | "active" | "ended"
  const [activeSpeaker, setActiveSpeaker] = useState(null) // "user" | "assistant" | null

  // lịch sử đã chốt
  const [history, setHistory] = useState([])
  // lượt đang nói dở
  const [liveTurn, setLiveTurn] = useState(null)

  // timer clear activeSpeaker (để speaking… tắt sau 1s im lặng)
  const clearSpeakerTimeoutRef = useRef(null)

  // ===== helper: set ai đang nói và auto-clear sau 1s =====
  const bumpActiveSpeaker = useCallback((role) => {
    setActiveSpeaker(role)
    if (clearSpeakerTimeoutRef.current) {
      clearTimeout(clearSpeakerTimeoutRef.current)
    }
    clearSpeakerTimeoutRef.current = setTimeout(() => {
      setActiveSpeaker(null)
    }, 1000)
  }, [])

  // ===== helper: dịch Việt -> Anh khi finalize =====
  const translateToEnglish = useCallback(async (textVi) => {
    if (!textVi) return ""
    try {
      const url =
        "https://api.mymemory.translated.net/get?q=" +
        encodeURIComponent(textVi) +
        "&langpair=vi|en"
      const res = await fetch(url)
      const data = await res.json().catch(() => null)
      const en =
        data?.responseData?.translatedText ||
        data?.matches?.[0]?.translation ||
        ""
      return en || textVi
    } catch (err) {
      console.warn("[useVoiceAgent] translate fail:", err)
      return textVi
    }
  }, [])

  // ===== when we get partial transcript =====
  const handlePartial = useCallback(
    ({ role, text }) => {
      if (!text?.trim()) return

      bumpActiveSpeaker(role)

      setLiveTurn((prev) => {
        // nếu cùng speaker thì update text
        if (prev && prev.role === role) {
          // tránh kiểu spam "xin ch" -> "xin chào" -> "xin chào em"
          // cứ update thẳng luôn
          return { role, textVi: text }
        }
        // speaker khác => replace
        return { role, textVi: text }
      })
    },
    [bumpActiveSpeaker]
  )

  // ===== when we get final transcript =====
  const handleFinal = useCallback(
    async ({ role, text }) => {
      if (!text?.trim()) return

      bumpActiveSpeaker(role)

      // clear liveTurn nếu nó là cùng speaker
      setLiveTurn((prev) => {
        if (prev && prev.role === role) {
          return null
        }
        return prev
      })

      // dịch 1 lần khi finalize
      const textEn = await translateToEnglish(text)

      setHistory((prev) => {
        // CHỐNG LẶP ASSISTANT:
        // nếu câu mới y chang câu assistant cuối cùng vừa push thì bỏ qua
        const last = prev[prev.length - 1]
        if (
          role === "assistant" &&
          last &&
          last.role === "assistant" &&
          last.textVi === text
        ) {
          return prev
        }

        return [
          ...prev,
          {
            role,
            textVi: text,
            textEn: textEn,
            at: Date.now(),
          },
        ]
      })
    },
    [bumpActiveSpeaker, translateToEnglish]
  )

  // ===== init Vapi client + listeners once =====
  useEffect(() => {
    if (vapiRef.current) return
    const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY
    if (!publicKey) {
      console.error("VITE_VAPI_PUBLIC_KEY is missing")
    } else {
      console.log("[Konnect Voice] VAPI_PUBLIC_KEY =", publicKey)
    }

    const client = new Vapi(publicKey)
    vapiRef.current = client

    client.on("call-start", () => {
      console.log("[Vapi] call-start")
      setCallStatus("active")
      setHistory([])
      setLiveTurn(null)
      setActiveSpeaker(null)
    })

    client.on("call-end", (payload) => {
      console.log("[Vapi] call-end", payload)
      setCallStatus("ended")
      setLiveTurn(null)
      setActiveSpeaker(null)
    })

    // REMOVE the separate handlers: speech-update / transcript / voice-input / model-output
    // and use a single router for "message"
    client.on("message", (evt) => {
      console.log("[Vapi] message", evt)
      const t = evt?.type

      // who is speaking now (visual cue)
      if (t === "speech-update") {
        const role = evt?.role === "assistant" ? "assistant" : "user"
        if (evt?.status === "started") bumpActiveSpeaker(role)
        return
      }

      if (t === "transcript") {
        const role = evt?.role === "assistant" ? "assistant" : "user"
        const text = evt?.transcript || evt?.text || ""
        const final = evt?.transcriptType === "final" || !!evt?.final
        if (!text) return
        return final
          ? handleFinal({ role, text })
          : handlePartial({ role, text })
      }

      if (t === "model-output") {
        const role = "assistant"
        const text = evt?.content || evt?.text || evt?.message || ""
        const final = !!evt?.final
        if (!text) return
        return final
          ? handleFinal({ role, text })
          : handlePartial({ role, text })
      }

      if (t === "voice-input") {
        // Some builds emit assistant TTS input here, or user STT; handle both fields.
        if (typeof evt?.transcript === "string") {
          const role = "user"
          const text = evt.transcript
          const final = !!evt?.final
          if (!text) return
          return final
            ? handleFinal({ role, text })
            : handlePartial({ role, text })
        }
        if (typeof evt?.input === "string") {
          // Assistant “I’m here to help” preamble
          return handleFinal({ role: "assistant", text: evt.input })
        }
        return
      }

      // ignore other types: status-update, conversation-update, etc.
    })

    client.on("status-update", (payload) => {
      console.log("[Vapi] status-update", payload)
    })
    client.on("conversation-update", (payload) => {
      console.log("[Vapi] conversation-update", payload)
    })

    client.on("error", async (err) => {
      console.error("[Vapi error]", err)
      if (err?.error && err.error.json) {
        try {
          const detail = await err.error.json()
          console.error("[Vapi error details json]", detail)
        } catch {}
      }
    })
  }, [handleFinal, handlePartial, bumpActiveSpeaker])

  // ====== START CALL ======================================================
  const startCall = useCallback(async () => {
    if (!vapiRef.current) return

    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID
    console.log("[Konnect Voice] startCall → assistantId =", assistantId)

    if (!assistantId) {
      console.error("VITE_VAPI_ASSISTANT_ID is missing")
      return
    }

    try {
      setCallStatus("connecting")

      /**
       * ✅ Đúng chuẩn assistant mode:
       *  vapi.start(assistantId, {
       *    // metadata (optional)
       *  })
       *
       *  KHÔNG được truyền clientMessages ở đây,
       *  vì SDK sẽ reject (400 Bad Request).
       *  Thay vào đó, phải bật “Send transcripts to client”
       *  và “Send model output to client” trong dashboard của Assistant.
       */
      await vapiRef.current.start(assistantId)

      // nếu thành công → Vapi sẽ emit "call-start"
    } catch (err) {
      console.error("[useVoiceAgent] startCall error:", err)

      // đọc body JSON để hiểu rõ lỗi
      if (err?.error && err.error.json) {
        try {
          const detail = await err.error.json()
          console.error("[Vapi detailed error]", detail)
          /**
           * Ví dụ output:
           * { message: "assistant not found" }
           * { message: "assistant does not support web calls" }
           * { message: "voice is required" }
           */
        } catch {
          console.error("[Vapi detailed error] cannot parse body")
        }
      }
      setCallStatus("idle")
    }
  }, [])


  // ====== STOP CALL =======================================================
  const stopCall = useCallback(() => {
    if (!vapiRef.current) return
    try {
      vapiRef.current.stop()
      // "call-end" event sẽ set callStatus("ended")
    } catch (err) {
      console.error("[useVoiceAgent] stopCall error:", err)
    }
  }, [])

  return {
    callStatus,      // "idle" | "connecting" | "active" | "ended"
    activeSpeaker,   // "user" | "assistant" | null
    history,         // finalized turns
    liveTurn,        // current speaking turn (partial)
    startCall,
    stopCall,
  }
}
