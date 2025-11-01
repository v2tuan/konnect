import { useEffect, useRef, useState, useCallback } from "react"
import Vapi from "@vapi-ai/web"

export function useVoiceAgent() {
  const vapiRef = useRef(null)
  const [isCalling, setIsCalling] = useState(false)
  const [logs, setLogs] = useState([]) // [{ role: "user"|"assistant"|"system", text: "..." }]

  // init Vapi client 1 lần
  useEffect(() => {
    if (!vapiRef.current) {
      const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY
      vapiRef.current = new Vapi(publicKey)

      // sự kiện: cuộc gọi bắt đầu
      vapiRef.current.on("call-start", () => {
        setIsCalling(true)
        setLogs(prev => [
          ...prev,
          { role: "system", text: "📞 Connected to Konnect AI assistant" }
        ])
      })

      // sự kiện: cuộc gọi kết thúc
      vapiRef.current.on("call-end", () => {
        setIsCalling(false)
        setLogs(prev => [
          ...prev,
          { role: "system", text: "👋 Call ended" }
        ])
      })

      // sự kiện transcript (cả user lẫn assistant)
      // theo SDK, event 'message' với type 'transcript' sẽ đưa text đã nghe/đã nói
      vapiRef.current.on("message", (msg) => {
        if (msg?.type === "transcript") {
          // msg.role thường là 'user' hoặc 'assistant'
          setLogs(prev => [
            ...prev,
            { role: msg.role, text: msg.transcript || "" }
          ])
        }
      })
    }
  }, [])

  const startCall = useCallback(async (metaOverride) => {
    if (!vapiRef.current) return
    const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID

    // vapi.start(...) mở realtime voice call tới assistant đã cấu hình trên dashboard. :contentReference[oaicite:5]{index=5}
    // metaOverride là optional nếu bạn muốn gửi context động (userId, conversationId,...)
    vapiRef.current.start(
      assistantId,
      metaOverride // ví dụ { variableValues: { username: "Duy" } }
    )
  }, [])

  const stopCall = useCallback(() => {
    if (!vapiRef.current) return
    vapiRef.current.stop()
  }, [])

  return {
    isCalling,
    logs,
    startCall,
    stopCall,
  }
}
