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
  const [hasMore, setHasMore] = useState(true)
  const socketRef = useRef(null)

  // ===============================
  // ✅ Typing heartbeat (NEW ONLY)
  // ===============================
  const typingKeepAliveRef = useRef(null)
  const isTypingActiveRef = useRef(false)
  const TYPING_KEEPALIVE_MS = 4000 // nên nhỏ hơn server timeout (thường 5–10s)

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
      type: m.type,
      repliedMessage: m.repliedMessage || null
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
          const pageInfo = data?.pageInfo || {}

          setConversation(convo || { id: externalConversationId, type: mode })
          setCid(externalConversationId)
          setMessages(items.map(normalizeIncoming))
          setCursor(pageInfo.nextBeforeSeq ?? null) // ✅ Sửa từ nextBeforeReq
          
          // ✅ FIX: Nếu backend không trả về hasMore, default là true (trừ khi không có messages)
          const shouldHaveMore = pageInfo.hasMore !== undefined 
            ? pageInfo.hasMore 
            : items.length > 0
          
          setHasMore(shouldHaveMore)
          
          console.log('📊 Pagination info:', {
            cursor: pageInfo.nextBeforeSeq,
            hasMore: shouldHaveMore,
            messagesCount: items.length
          })
          
          return
        }

        // 3.2) Nếu cloud mode và chưa có conversationId
        if (mode === "cloud") {
          const res = await getCloudConversation()
          if (!mounted) return

          const convo = res?.conversation
          const id = extractId(convo)
          const items = Array.isArray(res?.messages) ? res.messages : []
          const pageInfo = res?.pageInfo || {}

          setConversation(convo || null)
          setCid(id)
          setMessages(items.map(normalizeIncoming))
          setCursor(pageInfo.nextBeforeSeq ?? null) // Cloud có thể dùng tên khác
          
          const shouldHaveMore = pageInfo.hasMore !== undefined 
            ? pageInfo.hasMore 
            : items.length > 0
          
          setHasMore(shouldHaveMore)
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
      // ✅ Nếu đang typing trước đó, khôi phục ngay sau khi reconnect
      if (isTypingActiveRef.current) {
        socket.emit("typing:start", { conversationId: cid })
      }
    })

    // -------------------------------
    // 4.1) Event Handlers
    // -------------------------------
    const handleNewMessage = (payload) => {
      if (extractId(payload?.conversationId) !== cid) return

      // Lấy message object bên trong payload
      const message = payload.message;
      if (!message) {
        console.error('[useCloudChat] 🛑 Payload không có "message" object!');
        return;
      }

      // === BỔ SUNG LOGIC NICKNAME ===
      const t = message.type;
      const body = message.body;

      if (t === "notification" && body?.subtype === "nickname_changed") {
        const { targetId, nickname } = body;

        console.log('[useCloudChat] ✅ ĐÃ NHẬN nickname changed:', { targetId, nickname });

        // Phát tín hiệu toàn cục để ChatArea và GroupInfoDialog bắt được
        window.dispatchEvent(new CustomEvent('conversation:member-nickname-updated', {
          detail: {
            conversationId: String(cid),
            memberId: String(targetId),
            nickname: (nickname ?? "").trim()
          }
        }));
      }
      // === KẾT THÚC BỔ SUNG ===

      // Chuẩn hoá tin nhắn (đã có)
      const nm = normalizeIncoming(message); // <-- Chuyển dòng này xuống đây
      console.log('New message received via socket:', nm)

      setMessages((prev) => {
        // ... (code cũ của bạn giữ nguyên)
        const exists = prev.find(msg => msg.id === nm.id)
        let next
        if (exists) {
          next = prev.map(msg => (msg.id === nm.id ? { ...msg, ...nm } : msg))
        } else {
          next = [...prev, nm]
        }
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

      // ✅ Ngắt heartbeat nếu đang bật khi unmount/chuyển phòng
      if (typingKeepAliveRef.current) {
        clearInterval(typingKeepAliveRef.current)
        typingKeepAliveRef.current = null
      }
      isTypingActiveRef.current = false
      setOthersTyping(false)
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
          body: { text: message.content, repliedMessage: message.repliedMessage || null }
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
  // 6) Typing emitters (HEARTBEAT)
  // -------------------------------
  const startTyping = () => {
    if (!cid) return
    if (!socketRef.current) return
    if (isTypingActiveRef.current) return // đã bật rồi thì bỏ qua

    // bật cờ + emit ngay lập tức
    isTypingActiveRef.current = true
    socketRef.current.emit("typing:start", { conversationId: cid })

    // duy trì trạng thái bằng heartbeat định kỳ
    typingKeepAliveRef.current = setInterval(() => {
      socketRef.current?.emit("typing:start", { conversationId: cid })
    }, TYPING_KEEPALIVE_MS)
  }

  const stopTyping = () => {
    if (!cid) return
    if (!socketRef.current) return

    // dừng heartbeat
    if (typingKeepAliveRef.current) {
      clearInterval(typingKeepAliveRef.current)
      typingKeepAliveRef.current = null
    }
    isTypingActiveRef.current = false

    // thông báo đã dừng
    socketRef.current.emit("typing:stop", { conversationId: cid })
  }

  // -------------------------------
  // 7) Load tin nhắn cũ
  // -------------------------------
  const loadOlder = async () => {
    if (!cid || !cursor || !hasMore) {
      console.log('⚠️ Cannot load older:', { cid, cursor, hasMore })
      return { hasMore: false }
    }

    console.log('🔄 Loading older messages with cursor:', cursor)

    try {
      const data = await fetchConversationDetail(cid, { 
        beforeSeq: cursor, // ✅ Sửa từ beforeReq sang beforeSeq
        limit: 30 
      })
      
      console.log('📦 Load older response:', data)
      
      const older = Array.isArray(data?.messages) ? data.messages : []
      const pageInfo = data?.pageInfo || {}

      if (!older.length) {
        console.log('✅ No more messages')
        setHasMore(false)
        return { hasMore: false }
      }

      setMessages((prev) => {
        const merged = [...older.map(normalizeIncoming), ...prev]
        merged.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        return merged
      })

      const newCursor = pageInfo.nextBeforeSeq ?? null
      const newHasMore = pageInfo.hasMore ?? false
      
      setCursor(newCursor)
      setHasMore(newHasMore)
      
      console.log('✅ Loaded older messages:', {
        count: older.length,
        newCursor,
        newHasMore
      })
      
      return { 
        hasMore: newHasMore,
        loadedCount: older.length 
      }
    } catch (error) {
      console.error("❌ Load older messages failed:", error)
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
    startTyping,   // gọi khi input focus
    stopTyping,    // gọi khi input blur / rời trang
    othersTyping,
    loadOlder, // ✅ Export loadOlder
    hasMore
  }
}
