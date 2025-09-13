import { fetchConversationDetail, getCloudConversation, sendMessage } from "@/apis"
import { API_ROOT } from "@/utils/constant"
import { extractId } from "@/utils/helper"
import { useEffect, useMemo, useRef, useState } from "react"
import { io } from "socket.io-client"

export const useCloudChat = (options = {}) => {
  const {
    mode = "cloud",
    currentUserId,
    conversationId: externalConversationId = null,
    initialConversation = null,
  } = options

  const [conversation, setConversation] = useState(initialConversation)
  const [cid, setCid] = useState(externalConversationId)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [othersTyping, setOthersTyping] = useState(false)
  const [cursor, setCursor] = useState(null) //load tin nhan cu hon
  const socketRef = useRef(null)

  const normalizeIncoming = (m) => {
    const base = {
      id: m._id || m.id || String(m.seq ?? Date.now()),
      seq: m.seq ?? 0,
      createdAt: m.createdAt ?? Date.now(),
      body: m.body,
      text: m.body?.text ?? m.text ?? "",
      senderId: m.senderId,
      type: m.type
    }
    if (mode === "cloud") return { ...base, isOwn: true }
    return { ...base, isOwn: String(m.senderId) === String(currentUserId) }
  }

  // 1) Khởi tạo conversation
  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        setLoading(true)

        // Có id từ URL (direct/group) -> set ngay
        if (externalConversationId && mode !== 'cloud') {
          const data = await fetchConversationDetail(externalConversationId)
          if (!mounted) return
          const convo = data?.conversation
          const items = Array.isArray(data?.messages) ? data.messages: []
          setConversation(convo || { id: externalConversationId, type: mode })
          setCid(externalConversationId)
          setMessages(items.map(normalizeIncoming))
          setCursor(data?.pageInfo?.nextBeforeSeq ?? null)
          return
        }

        // Không có id nhưng là cloud -> tự load cloud conversation
        if (mode === "cloud") {
          const res = await getCloudConversation()
          const convo = res?.conversation
          const id = extractId(convo)
          const items = Array.isArray(res?.messages) ? res.messages : []
          if (!mounted) return
          setConversation(convo || null)
          setCid(id)
          setMessages(items.map(normalizeIncoming))
          setCursor(res?.paging?.nextBeforeReq ?? null)
          return
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalConversationId, mode])

  // 2) Socket theo cid
  useEffect(() => {
    if (!cid) return

    const s = io(API_ROOT, { withCredentials: true })
    socketRef.current = s

    s.on("connect", () => {
      s.emit("conversation:join", { conversationId: cid })
    })

    const onNewMessage = (payload) => {
      if (extractId(payload?.conversationId) !== cid) return
      const nm = normalizeIncoming(payload?.message || payload)
      setMessages((prev) => {
        const next = [...prev, nm]
        next.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        return next
      })
    }

    const onTypingStart = (payload) => {
      if (extractId(payload?.conversationId) === cid) setOthersTyping(true)
    }
    const onTypingStop = (payload) => {
      if (extractId(payload?.conversationId) === cid) setOthersTyping(false)
    }

    s.on("message:new", onNewMessage)
    s.on("typing:start", onTypingStart)
    s.on("typing:stop", onTypingStop)

    return () => {
      s.off("message:new", onNewMessage)
      s.off("typing:start", onTypingStart)
      s.off("typing:stop", onTypingStop)
      s.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, mode, currentUserId])

  // 3) Gửi tin
  const send = async (text) => {
    if (!cid || !text || !text.trim() || sending) return
    try {
      setSending(true)
      await sendMessage(cid, text.trim())
    } catch (error) {
      console.error("Send failed", error)
    } finally {
      setSending(false)
    }
  }

  // 4) Typing emitters
  const startTyping = () => {
    if (!cid) return
    socketRef.current?.emit("typing:start", { conversationId: cid })
  }
  const stopTyping = () => {
    if (!cid) return
    socketRef.current?.emit("typing:stop", { conversationId: cid })
  }

  const loadOlder = async () => {
    if (!cid || cursor === null ) return { hasMore: false }
    try {
      const data = await fetchConversationDetail(cid, { beforeReq: cursor, limit: 30 })
      const older = Array.isArray(data?.messages) ? data.messages : []
      if (!older.length) {
        setCursor(null)
        return { hasMore: false }
      }
      setMessages((prev) => {
        const merged = [...older.map(normalizeIncoming), ...prev]
        merged.sort((a, b) => (a.seq??0) - (b.seq ?? 0))
        return merged
      })
      setCursor(data?.pageInfo?.nextBeforeSeq ?? null)
      return { hasMore: data?.pageInfo?.nextBeforeSeq != null }
    } catch (error) {
      console.error(error)
      return { hasMore: false }
    }
  }

  const normalizedMessages = useMemo(() => {
    const arr = [...messages]
    arr.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    return arr
  }, [messages])

  return {
    loading,
    sending,
    conversation,
    conversationId: cid,
    messages: normalizedMessages,
    send,
    startTyping,
    stopTyping,
    othersTyping,
    loadOlder, //load tin nhan cu
    hasMore: cursor != null
  }
}
