import { getCloudConversation, sendMessage } from "@/apis"
import { API_ROOT } from "@/utils/constant"
import { useEffect, useMemo, useRef, useState } from "react"
import { io } from "socket.io-client"

function extractId(raw) {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (raw._id) return raw._id.toString()
  if (raw.id) return raw.id.toString()
  if (raw.conversationId) return raw.conversationId.toString()
  if (raw.$oid) return raw.$oid.toString()
  return null
}

export const useCloudChat = (mode="cloud", currentUserId) => {
  const [conversation, setConversation] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const socketRef = useRef(null)

  const normalizeIncoming = (m) => {
    const base = {
      id: m._id || m.id || String(m.seq ?? Date.now()),
      seq: m.seq ?? 0,
      createdAt: m.createdAt ?? Date.now(),
      body: m.body,
      text: m.body?.text ?? m.text ?? '',
      senderId: m.senderId,
      type: m.type
    }
    if (mode === 'cloud') return { ...base, isOwn: true }
    return { ...base, isOwn: String(m.senderId) === String(currentUserId) }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getCloudConversation()
        const convo = res?.conversation
        const id = extractId(convo)
        const msgs = Array.isArray(res?.messages) ? res.messages : []

        if (!mounted) return
        setConversation(convo || null)
        setConversationId(id)
        setMessages(msgs.map(normalizeIncoming))
      } catch (e) {
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!conversationId) return
    const s = io(API_ROOT, { withCredentials: true })
    socketRef.current = s

    s.on('connect', () => {
      s.emit('conversation:join', { conversationId })
    })

    const onNewMessage = (payload) => {
      // payload gợi ý: { conversationId, message }
      if (extractId(payload?.conversationId) !== conversationId) return
      const nm = normalizeIncoming(payload?.message || payload)
      // append + giữ thứ tự theo seq
      setMessages((prev) => {
        const next = [...prev, nm]
        next.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
        return next
      })
    }

    s.on('message:new', onNewMessage)

    return () => {
      s.off('message:new', onNewMessage)
      s.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, mode, currentUserId])

  const send = async (text) => {
    if (!conversationId || !text || !text.trim() || sending ) return
    try {
      setSending(true)
      await sendMessage(conversationId, text.trim())
    } catch (error) {
      console.error('Send failed', error)
    } finally {
      setSending(false)
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
    conversationId,
    messages: normalizedMessages,
    send
  }
}