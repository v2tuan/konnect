import { useCloudChat } from '@/hooks/useCloudChat'
import React, { useState } from 'react'

function CloudSidebar() {
  const { loading, messages, send } = useCloudChat()
  const { text, setText } = useState('')

  if (loading) return <div className="p-4">Loading</div>

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m._id} className="rounded border p-2">
            <div className="text-xs opacity-60">#{m.seq}</div>
            <div>{m.body?.text}</div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          send(text)
          setText('')
        }}
        className="flex gap-2 border-t p-2"
      >
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Gửi tin nhắn đã lưu…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => {
            // (optional) typing indicator
            // socketRef.current?.emit('typing:start', { conversationId })
          }}
          onBlur={() => {
            // (optional)
            // socketRef.current?.emit('typing:stop', { conversationId })
          }}
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white">
          Gửi
        </button>
      </form>
    </div>
  )
}

export default CloudSidebar