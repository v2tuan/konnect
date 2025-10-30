import { useEffect, useMemo, useRef, useState } from "react"
import { getSocket } from "@/lib/socket"
import {
  list as listAPI,
  markRead as markReadAPI,
  markAllRead as markAllReadAPI
} from "@/apis/notifications"

export type Notif = {
  id: string
  type: "message" | "friend_request" | "message_read" | "system" | string
  title?: string
  content?: string
  status: "unread" | "read"
  createdAt?: string
  conversationId?: string
  messageId?: string
  friendshipId?: string
  senderId?: string
  receiverId?: string
  extra?: Record<string, any>
}

type Options = {
  onlyUnread?: boolean
  type?: string | null
  conversationId?: string | null
}

export function useNotifications(opts: Options = {}) {
  const [items, setItems] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const seen = useRef<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const res = await listAPI({
        limit: 20,
        onlyUnread: !!opts.onlyUnread,
        type: opts.type ?? null,
        conversationId: opts.conversationId ?? null
      })
      const arr = Array.isArray(res?.items) ? res.items : []
      // dedupe và set
      const uniq = arr.filter(n => {
        if (!n?.id) return false
        if (seen.current.has(n.id)) return false
        seen.current.add(n.id)
        return true
      })
      setItems(uniq)
      setNextCursor(res?.nextCursor || null)
      setUnreadCount(uniq.filter(n => n.status === "unread").length)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await listAPI({
        limit: 20,
        cursor: nextCursor,
        onlyUnread: !!opts.onlyUnread,
        type: opts.type ?? null,
        conversationId: opts.conversationId ?? null
      })
      const arr = Array.isArray(res?.items) ? res.items : []
      const uniq = arr.filter(n => {
        if (!n?.id) return false
        if (seen.current.has(n.id)) return false
        seen.current.add(n.id)
        return true
      })
      setItems(prev => [...prev, ...uniq])
      setNextCursor(res?.nextCursor || null)
    } finally {
      setLoadingMore(false)
    }
  }

  const prependFromSocket = (n: Notif) => {
    if (!n?.id) return
    if (seen.current.has(n.id)) return
    seen.current.add(n.id)
    setItems(prev => [n, ...prev])
    if (n.status !== "read") setUnreadCount(c => c + 1)
  }

  const markRead = async (ids: string | string[]) => {
    const list = Array.isArray(ids) ? ids : [ids]
    if (!list.length) return
    // optimistic
    setItems(prev => prev.map(x => (list.includes(x.id) ? { ...x, status: "read" } : x)))
    setUnreadCount(c => Math.max(0, c - list.length))
    try {
      await markReadAPI(list)
    } catch {
      // rollback nhẹ: (không bắt buộc, tùy dự án)
      setItems(prev => prev.map(x => (list.includes(x.id) ? { ...x, status: "unread" } : x)))
      setUnreadCount(c => c + list.length)
    }
  }

  const markAllRead = async () => {
    // optimistic
    const unreadIds = items.filter(n => n.status === "unread").map(n => n.id)
    if (!unreadIds.length) return
    setItems(prev => prev.map(n => ({ ...n, status: "read" })))
    const oldUnread = unreadCount
    setUnreadCount(0)
    try {
      await markAllReadAPI({ type: opts.type ?? null, conversationId: opts.conversationId ?? null })
    } catch {
      // rollback
      setItems(prev => prev.map(n => (unreadIds.includes(n.id) ? { ...n, status: "unread" } : n)))
      setUnreadCount(oldUnread)
    }
  }

  // Socket binding
  useEffect(() => {
    load()
    const s = getSocket()
    if (!s) return
    const onNew = (payload: any) => {
      // Chuẩn hóa 1 chút từ backend → FE
      const normalized: Notif = {
        id: String(payload?.id || payload?._id),
        type: payload?.type || "system",
        title: payload?.title || payload?.senderName || "Thông báo",
        content: payload?.content || payload?.extra?.textPreview || "",
        status: "unread",
        createdAt: payload?.createdAt || new Date().toISOString(),
        conversationId: payload?.conversationId || payload?.extra?.conversationId,
        messageId: payload?.message?.id || payload?.message?._id || payload?.messageId,
        friendshipId: payload?.friendshipId,
        senderId: payload?.senderId,
        receiverId: payload?.receiverId,
        extra: payload?.extra || {}
      }
      prependFromSocket(normalized)
    }
    const onBadgeInc = (p: any) => {
      const by = Number(p?.by ?? 1)
      setUnreadCount(c => c + (Number.isFinite(by) ? by : 1))
    }
    const onMarkAllRead = () => setUnreadCount(0)

    s.on("notification:new", onNew)
    s.on("notification:badge:inc", onBadgeInc)
    s.on("notification:mark-all-read", onMarkAllRead)

    return () => {
      s.off("notification:new", onNew)
      s.off("notification:badge:inc", onBadgeInc)
      s.off("notification:mark-all-read", onMarkAllRead)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.onlyUnread, opts.type, opts.conversationId])

  return {
    items,
    loading,
    loadingMore,
    unreadCount,
    nextCursor,
    load,
    loadMore,
    markRead,
    markAllRead,
    prependFromSocket
  }
}
