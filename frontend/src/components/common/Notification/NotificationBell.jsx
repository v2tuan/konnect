// src/components/common/Notification/NotificationBell.jsx
"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSocket, connectSocket } from "@/lib/socket"
import { useSelector } from "react-redux"
import { useLocation, useNavigate } from "react-router-dom"
// Nếu bạn có wrapper riêng:
import { list as listNoti } from "@/apis/notifications"

export default function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const me = useSelector((s) => s.user.currentUser?._id)
  const navigate = useNavigate()
  const location = useLocation()
  const isOnNotifications = location.pathname.startsWith("/notifications")

  // init socket + lấy unread ban đầu (friend_request)
  useEffect(() => {
    if (!me) return
    connectSocket(me)
    ;(async () => {
      try {
        const res = await listNoti({ onlyUnread: true, limit: 100, type: "friend_request" })
        const arr = Array.isArray(res?.items) ? res.items : []
        setUnread(arr.length)
      } catch { /* empty */ }
    })()
  }, [me])

  // nghe socket -> chỉ tính friend_request
  useEffect(() => {
    const s = getSocket()
    if (!s) return

    const onNew = (payload) => {
      if (payload?.type !== "friend_request") return
      if (!isOnNotifications) setUnread((u) => u + 1)
    }

    const onBadgeInc = (p) => {
      // (tuỳ backend có phát riêng cho friend_request hay không)
      if (!isOnNotifications) setUnread((u) => u + Number(p?.by ?? 1))
    }

    const onMarkAllRead = (p) => {
      // Nếu BE có gửi type trong event, chỉ clear khi type = friend_request
      if (!p?.type || p.type === "friend_request") setUnread(0)
    }

    s.on("notification:new", onNew)
    s.on("notification:badge:inc", onBadgeInc)
    s.on("notification:mark-all-read", onMarkAllRead)

    return () => {
      s.off("notification:new", onNew)
      s.off("notification:badge:inc", onBadgeInc)
      s.off("notification:mark-all-read", onMarkAllRead)
    }
  }, [isOnNotifications])

  // Vào trang notifications thì clear badge (UX)
  useEffect(() => {
    if (isOnNotifications) setUnread(0)
  }, [isOnNotifications])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate("/notifications")}
      title="Thông báo"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-[18px] text-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Button>
  )
}
