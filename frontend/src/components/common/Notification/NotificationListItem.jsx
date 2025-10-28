"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, MessageCircle, CheckCheck } from "lucide-react"

const timeAgo = (iso) => {
  if (!iso) return ""
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

const meta = (t) => {
  switch (t) {
    case "friend_request": return { icon: UserPlus, label: "Kết bạn" }
    case "message":        return { icon: MessageCircle, label: "Tin nhắn" }
    case "message_read":   return { icon: CheckCheck,   label: "Đã đọc" }
    default:               return { icon: UserPlus,     label: t || "Khác" }
  }
}

export default function NotificationListItem({
                                               n,
                                               onFriendAction,           // (n, "accept" | "delete")
                                               compact = false,
                                               fullBleed = false      // ⬅️ thêm prop
// true → giảm padding thành p-3
                                             }) {
  const { icon: Icon, label } = meta(n.type)
  const unread = n.status === "unread"

  const name =
    n?.extra?.senderName ||
    n?.extra?.requesterName ||
    n?.title || "Thông báo"

  const avatar =
    n?.extra?.senderAvatar ||
    n?.extra?.requesterAvatar || ""

  const content =
    n.content ||
    n?.extra?.textPreview ||
    "Bạn có một thông báo mới"

  return (
    <div
      data-id={n.id || n._id}
      className={[
        // full-bleed: kéo sát 2 mép theo px-4 của list
        fullBleed ? "-mx-4 px-4" : "",
        "rounded-xl border bg-card transition shadow-sm hover:shadow-md",
        compact ? "py-3" : "py-4",  // padding ngang đã do -mx-4/px-4 xử lý
        unread ? "border-primary/30 ring-1 ring-primary/15" : "border-border"
      ].join(" ")}
    >
      <div className="grid grid-cols-[48px_1fr] gap-3">
        {/* avatar 48px cố định */}
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatar} alt="" />
            <AvatarFallback>{(name?.[0] || "@").toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between leading-none">
            <div className="min-w-0 flex items-center gap-2">
              <span className={["truncate", unread ? "font-semibold" : "font-medium"].join(" ")} title={name}>
                {name}
              </span>
              <Badge variant="secondary" className="h-5 px-2 text-[11px]">{label}</Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground" title={new Date(n.createdAt).toLocaleString()}>
                {timeAgo(n.createdAt)}
              </span>
              {unread && <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />}
            </div>
          </div>

          <p className="mt-1 text-sm text-muted-foreground leading-5 line-clamp-2" title={content}>
            {content}
          </p>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="text-xs">Từ hệ thống</span>
            </div>

            {n.type === "friend_request" && n.status === "unread" && (
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => onFriendAction?.(n, "accept")}>Accept</Button>
                <Button size="sm" variant="outline" onClick={() => onFriendAction?.(n, "delete")}>Decline</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
