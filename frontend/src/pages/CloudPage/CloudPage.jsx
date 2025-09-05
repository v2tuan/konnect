import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useCloudChat } from '@/hooks/useCloudChat'
import { Loader2, Send, Trash2, Search } from 'lucide-react'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function groupByDate(messages) {
  const map = {}
  messages.forEach(m => {
    const d = new Date(m.createdAt || Date.now()).toISOString().slice(0,10)
    ;(map[d] ||= []).push(m)
  })
  return Object.entries(map).sort((a,b)=> a[0] < b[0] ? -1 : 1)
}

export default function CloudPage() {
  const { loading, conversationId, messages, send } = useCloudChat()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [query, setQuery] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return messages
    return messages.filter(m => (m.body?.text || '').toLowerCase().includes(q))
  }, [messages, query])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  const handleSend = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      await send(value)        // Socket sẽ đẩy message mới về
      setText('')
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

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-5 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-semibold text-sm truncate">Cloud Chat cá nhân</h1>
          <p className="text-[11px] opacity-60 truncate">
            Conversation: {conversationId?.slice(0,8)}…
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 opacity-60" />
            <input
              className="pl-6 pr-2 py-1 rounded border text-xs w-48"
              placeholder="Tìm kiếm..."
              value={query}
              onChange={(e)=> setQuery(e.target.value)}
            />
          </div>
          <button
            className="text-xs text-red-500 flex items-center gap-1 opacity-40 cursor-not-allowed"
            title="Chưa hỗ trợ"
            disabled
          >
            <Trash2 className="size-3" /> Clear
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-5 py-4 space-y-6">
        {grouped.length === 0 && (
          <div className="text-center text-xs opacity-60 mt-10">
            Không có ghi chú nào.
          </div>
        )}
        {grouped.map(([date, msgs]) => (
          <section key={date}>
            <div className="sticky top-0 z-10 mb-3 flex justify-center">
              <span className="rounded-full bg-muted px-3 py-1 text-[10px] tracking-wide uppercase font-medium text-foreground/70">
                {date}
              </span>
            </div>
            <div className="space-y-3">
              {msgs.sort((a,b)=> (a.seq||0)-(b.seq||0)).map(m => (
                <div
                  key={m._id}
                  className="group rounded-lg border bg-card p-3 shadow-sm relative"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 text-[10px] font-mono opacity-50 select-none w-9">
                      #{m.seq}
                    </div>
                    <div className="flex-1">
                      <pre className="whitespace-pre-wrap text-xs font-sans leading-relaxed">
                        {m.body?.text}
                      </pre>
                      <div className="mt-2 flex items-center gap-3 text-[10px] opacity-50">
                        <span>{formatTime(m.createdAt)}</span>
                        <span>ID: {m._id?.slice(0,6)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 hidden gap-2 group-hover:flex">
                    <button className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/70">
                      Copy
                    </button>
                    <button className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/70">
                      Pin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => { e.preventDefault(); handleSend() }}
        className="border-t p-4 flex gap-2"
      >
        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết ghi chú / tin nhắn..."
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="rounded-md bg-blue-600 px-4 text-sm font-medium text-white flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Gửi
        </button>
      </form>
    </div>
  )
}