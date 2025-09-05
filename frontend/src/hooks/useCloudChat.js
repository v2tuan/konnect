import { getCloudConversation, sendMessage } from "@/apis"
import { API_ROOT } from "@/utils/constant"
import { useEffect, useRef, useState } from "react"
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

export const useCloudChat = () => {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const socketRef = useRef(null)

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getCloudConversation()
        const id = extractId(res)
        if (mounted) setConversationId(id)
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
      if (payload.conversationId === conversationId)
        setMessages((prev) => [...prev, payload.message])
    }

    s.on('message:new', onNewMessage)

    return () => {
      s.off('message:new', onNewMessage)
      s.disconnect()
      socketRef.current = null
    }

  }, [conversationId])

  const send = async (text) => {
    if (!conversationId || !text || !text.trim()) return
    try {
      await sendMessage(conversationId, text.trim())
    } catch (error) {
      console.error('Send failed', error)
    }
  }

  return { loading, conversationId, messages, send }
}