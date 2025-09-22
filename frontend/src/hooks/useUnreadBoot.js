// hooks/useUnreadBoot.js
"use client"

import { useEffect, useRef } from "react"
import { useUnreadStore } from "@/store/useUnreadStore.js"
import { connectSocket, getSocket } from "@/lib/socket"
import { API_ROOT } from "@/utils/constant"

export function useUnreadBoot() {
  const setBulk = useUnreadStore((s) => s.setBulk)
  const setUnread = useUnreadStore((s) => s.setUnread)
  const bootedRef = useRef(false)
  const listenersReadyRef = useRef(false)

  // 1) Kết nối socket + fetch summary ban đầu (1 lần)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true

    connectSocket() // idempotent

    ;(async () => {
      try {
        const res = await fetch(`${API_ROOT}/api/conversation/unreads/summary`, {
          credentials: "include"
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)
        }
        const data = await res.json() // { items, totalConversations, totalMessages }
        setBulk(data.items || [])
      } catch (e) {
        console.error("[useUnreadBoot] fetch summary failed:", e?.message || e)
      }
    })()
  }, [setBulk])

  // 2) Lắng nghe socket realtime + xử lý reconnect
  useEffect(() => {
    const sock = getSocket()
    if (!sock) return

    const onBadgeUpdate = (p) => {
      if (!p || !p.conversationId) return
      setUnread(p.conversationId, p.unread || 0)
    }

    const onConnect = async () => {
      // đồng bộ lại khi reconnect
      try {
        const res = await fetch(`${API_ROOT}/api/conversation/unreads/summary`, {
          credentials: "include"
        })
        if (res.ok) {
          const data = await res.json()
          setBulk(data.items || [])
        }
      } catch {
        // ignore transient errors
      }
    }

    if (!listenersReadyRef.current) {
      sock.on("badge:update", onBadgeUpdate)
      sock.on("connect", onConnect)
      listenersReadyRef.current = true
    }

    return () => {
      if (listenersReadyRef.current) {
        sock.off("badge:update", onBadgeUpdate)
        sock.off("connect", onConnect)
        listenersReadyRef.current = false
      }
    }
  }, [setUnread, setBulk])
}
