"use client"

import { useEffect, useRef } from "react"
import { API_ROOT } from "@/utils/constant"
import { useUnreadStore } from "@/store/useUnreadStore"
import { getSocket } from "@/lib/socket"

export function useMarkConversationRead(conversationId) {
  const setUnread = useUnreadStore(s => s.setUnread)
  const onceRef = useRef(null)

  useEffect(() => {
    if (!conversationId) return
    // Tránh spam nếu component re-render quá nhanh
    const key = String(conversationId)
    if (onceRef.current === key) return
    onceRef.current = key

    ;(async () => {
      try {
        // 1) Đánh dấu đã đọc đến tin nhắn mới nhất (đồng bộ read-receipt)
        await fetch(`${API_ROOT}/api/conversation/${conversationId}/read-to-latest`, {
          method: "PATCH",
          credentials: "include"
        })

        // 2) Clear tất cả notification type "message" của phòng này
        await fetch(`${API_ROOT}/api/notification/mark-all-read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ type: "message", conversationId })
        })

        // 3) Cập nhật badge local ngay lập tức
        setUnread(conversationId, 0)

        // (tuỳ chọn) bắn socket ra cho các tab khác của chính user này
        const sock = getSocket()
        sock?.emit?.("badge:client-cleared", { conversationId })
      } catch (e) {
        console.error("[useMarkConversationRead] failed:", e?.message || e)
      }
    })()
  }, [conversationId, setUnread])
}

export function useConversationFocus(conversationId) {
  useEffect(() => {
    const sock = getSocket()
    if (!sock || !conversationId) return
    sock.emit("conversation:focus", { conversationId })
    return () => sock.emit("conversation:blur", { conversationId })
  }, [conversationId])
}