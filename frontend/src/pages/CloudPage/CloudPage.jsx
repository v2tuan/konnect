// CloudPage.jsx
import { ChatArea } from '@/components/common/Sidebar/Chat/ChatArea'
import { useCloudChat } from '@/hooks/useCloudChat'
import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

function normalizeMessage(m) {
  return {
    id: m.id || m._id || String(m.seq ?? Date.now()),
    text: m.body?.text ?? m.text ?? '',
    isOwn: m.isOwn ?? (m.sender === 'me' || m.userId === 'me'), // tuỳ API
    createdAt: m.createdAt ?? m.timestamp ?? Date.now(),
  }
}

export default function CloudPage() {
  const { loading, conversationId, messages, send } = useCloudChat()
  const [sending, setSending] = useState(false)

  const normalizedMessages = useMemo(
    () => (messages || []).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map(normalizeMessage),
    [messages]
  )

  const handleSend = async (text) => {
    if (!text || sending) return
    setSending(true)
    try {
      await send(text) // socket sẽ đẩy message mới về -> messages cập nhật
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  // Conversation tối giản cho cloud
  const conversation = {
    displayName: `My Cloud`,
    conversationAvatarUrl: '/cloud-note-icon.svg'
  }

  return (
    <ChatArea
      mode="cloud"
      conversation={conversation}
      messages={normalizedMessages}
      onSendMessage={handleSend}
      sending={sending}
      loading={loading}
    />
  )
}
