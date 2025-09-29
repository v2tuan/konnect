import { fetchConversationDetail, getCloudConversation, sendMessage } from "@/apis"
import { API_ROOT } from "@/utils/constant"
import { extractId } from "@/utils/helper"
import { useEffect, useMemo, useRef, useState } from "react"
import { io } from "socket.io-client"

/**
 * Custom Hook: useCloudChat
 * Quản lý chat theo cloud/direct với socket realtime
 */
export const useCloudChat = (options = {}) => {
  // -------------------------------
  // 1) Options & States
  // -------------------------------
  const {
    mode = "cloud", // cloud | direct
    currentUserId,
    conversationId: externalConversationId = null,
    initialConversation = null
  } = options

  const [conversation, setConversation] = useState(initialConversation)
  const [cid, setCid] = useState(externalConversationId)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [othersTyping, setOthersTyping] = useState(false)
  const [cursor, setCursor] = useState(null) // cursor để load tin nhắn cũ
  const socketRef = useRef(null)

  // -------------------------------
  // 2) Helper: Chuẩn hóa tin nhắn
  // -------------------------------
  const normalizeIncoming = (m) => {
    const base = {
      id: m._id || m.id || String(m.seq ?? Date.now()),
      seq: m.seq ?? 0,
      createdAt: m.createdAt ?? Date.now(),
      body: m.body,
      media: m.media || null,
      reactions: m.reactions || [],
      text: m.body?.text ?? m.text ?? "",
      senderId: m.senderId,
      type: m.type
    }

    // Cloud mode mặc định là own
    if (mode === "cloud") return { ...base, isOwn: true }

    return { ...base, isOwn: String(m.senderId) === String(currentUserId) }
  }

  // -------------------------------
  // 3) Load Conversation & Messages
  // -------------------------------
  useEffect(() => {
    let mounted = true

    const initConversation = async () => {
      try {
        setLoading(true)

        // 3.1) Nếu có conversationId từ URL (direct/group)
        if (externalConversationId && mode !== "cloud") {
          const data = await fetchConversationDetail(externalConversationId)
          console.log('Init conversation data:', data)
          if (!mounted) return

          const convo = data?.conversation
          const items = Array.isArray(data?.messages) ? data.messages : []

          setConversation(convo || { id: externalConversationId, type: mode })
          setCid(externalConversationId)
          setMessages(items.map(normalizeIncoming))
          setCursor(data?.pageInfo?.nextBeforeSeq ?? null)
          return
        }

        // 3.2) Nếu cloud mode và chưa có conversationId
        if (mode === "cloud") {
          const res = await getCloudConversation()
          if (!mounted) return

          const convo = res?.conversation
          const id = extractId(convo)
          const items = Array.isArray(res?.messages) ? res.messages : []

          setConversation(convo || null)
          setCid(id)
          setMessages(items.map(normalizeIncoming))
          setCursor(res?.paging?.nextBeforeReq ?? null)
          return
        }

      } catch (error) {
        console.error("Init conversation failed:", error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initConversation()
    return () => { mounted = false }
  }, [externalConversationId, mode])

  // -------------------------------
  // 4) Socket Realtime
  // -------------------------------
  useEffect(() => {
    if (!cid) return

    const socket = io(API_ROOT, { withCredentials: true })
    socketRef.current = socket

    // Join room conversation
    socket.on("connect", () => {
      socket.emit("conversation:join", { conversationId: cid })
    })

    // -------------------------------
    // 4.1) Event Handlers
    // -------------------------------
    const handleNewMessage = (payload) => {
      if (extractId(payload?.conversationId) !== cid) return
      const nm = normalizeIncoming(payload?.message || payload)
      console.log('New message received via socket:', nm)

      setMessages((prev) => {
        const exists = prev.find(msg => msg.id === nm.id)

        let next
        if (exists) {
          // Cập nhật tin nhắn cũ
          next = prev.map(msg => (msg.id === nm.id ? { ...msg, ...nm } : msg))
        } else {
          // Thêm tin nhắn mới
          next = [...prev, nm]
        }

        // Sắp xếp theo seq
        next.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        return next
      })

    }

    const handleTypingStart = (payload) => {
      if (extractId(payload?.conversationId) === cid) setOthersTyping(true)
    }

    const handleTypingStop = (payload) => {
      if (extractId(payload?.conversationId) === cid) setOthersTyping(false)
    }

    // -------------------------------
    // 4.2) Listen Events
    // -------------------------------
    socket.on("message:new", handleNewMessage)
    socket.on("typing:start", handleTypingStart)
    socket.on("typing:stop", handleTypingStop)

    // -------------------------------
    // 4.3) Cleanup
    // -------------------------------
    return () => {
      socket.off("message:new", handleNewMessage)
      socket.off("typing:start", handleTypingStart)
      socket.off("typing:stop", handleTypingStop)
      socket.disconnect()
      socketRef.current = null
    }
  }, [cid, mode, currentUserId])

  // -------------------------------
  // 5) Gửi tin nhắn
  // -------------------------------
  /**
 * Gửi tin nhắn dạng text, file, image, audio
 * @param {Object} message
 * @param {"text"|"image"|"file"|"audio"} message.type
 * @param {string|File|Blob} message.content
 */
  const send = async (message) => {
    // Nếu chưa có conversation hoặc đang gửi → dừng
    if (!cid || sending) return
    if (!message?.content) return

    setSending(true) // đánh dấu đang gửi

    try {
      let payload
      let isFormData = false

      // Chuẩn bị payload theo type
      if (message.type === "text") {
        payload = {
          type: "text",
          body: { text: message.content }
        }
      }
      else if (["image", "file", "audio"].includes(message.type)) {
        // Tạo FormData để upload file/blob
        payload = new FormData()
        payload.append("type", message.type)
        if (Array.isArray(message.content)) {
          message.content.forEach(f => {
            payload.append("file", f) // thêm nhiều file vào cùng key "file"
          })
        } else {
          payload.append("file", message.content) // trường hợp chỉ 1 file
        }
        isFormData = true
      }
      else {
        console.warn("Unsupported message type:", message.type)
        return
      }

      // Gửi payload lên server
      await sendMessage(cid, payload, isFormData)
    }
    catch (error) {
      console.error("Send message failed:", error)
    }
    finally {
      setSending(false) // reset trạng thái gửi
    }
  }


  const sendViaSocket = (type, content) => {
    if (!cid || !socketRef.current) return

    let payload

    if (type === "text") {
      payload = { conversationId: cid, message: { type: "text", body: { text: content } } }
    } else if (type === "image" || type === "audio" || type === "file") {
      // content là File/Blob
      const reader = new FileReader()
      reader.onload = () => {
        const arrayBuffer = reader.result
        payload = {
          conversationId: cid,
          message: {
            type,
            data: arrayBuffer,
            fileName: content.name,
            fileSize: content.size
          }
        }
        socketRef.current.emit("message:new", payload)
      }
      reader.readAsArrayBuffer(content)
      return
    }

    socketRef.current.emit("message:new", payload)
  }


  // -------------------------------
  // 6) Typing emitters
  // -------------------------------
  const startTyping = () => {
    if (!cid) return
    socketRef.current?.emit("typing:start", { conversationId: cid })
  }

  const stopTyping = () => {
    if (!cid) return
    socketRef.current?.emit("typing:stop", { conversationId: cid })
  }

  // -------------------------------
  // 7) Load tin nhắn cũ
  // -------------------------------
  const loadOlder = async () => {
    if (!cid || cursor === null) return { hasMore: false }

    try {
      const data = await fetchConversationDetail(cid, { beforeReq: cursor, limit: 30 })
      console.log('Load older messages data:', data)
      const older = Array.isArray(data?.messages) ? data.messages : []

      if (!older.length) {
        setCursor(null)
        return { hasMore: false }
      }

      setMessages((prev) => {
        const merged = [...older.map(normalizeIncoming), ...prev]
        merged.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        return merged
      })

      setCursor(data?.pageInfo?.nextBeforeSeq ?? null)
      return { hasMore: data?.pageInfo?.nextBeforeSeq != null }
    } catch (error) {
      console.error("Load older messages failed:", error)
      return { hasMore: false }
    }
  }

  // -------------------------------
  // 8) Messages đã được sắp xếp
  // -------------------------------
  const normalizedMessages = useMemo(() => {
    const arr = [...messages]
    arr.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    return arr
  }, [messages])

  // -------------------------------
  // 9) Return values
  // -------------------------------
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
    loadOlder,
    hasMore: cursor != null
  }
}
