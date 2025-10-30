"use client"

import React, { useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import NotificationListItem from "./NotificationListItem"

export default function NotificationsSidebar({
                                               items = [],
                                               loading = false,
                                               loadingMore = false,
                                               onLoadMore,
                                               onFriendAction
                                             }) {
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) onLoadMore?.()
    }
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [onLoadMore])

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Thông báo</h2>
      </div>

      <div className="px-4 py-3 border-b">
        <Input placeholder="Tìm nhanh (client-side)" />
      </div>

      {/* px-4 để làm chuẩn “mép trong” */}
      <div ref={listRef} className="flex-1 overflow-auto px-4 py-2">
        {loading && <div className="text-sm text-muted-foreground">Đang tải…</div>}

        {!loading && items.length === 0 && (
          <div className="text-sm text-muted-foreground">Chưa có thông báo.</div>
        )}

        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id || n._id}>
                {/* fullBleed để ăn trọn bề ngang */}
                <NotificationListItem n={n} onFriendAction={onFriendAction} fullBleed />
              </li>
            ))}
          </ul>
        )}
        {loadingMore && <div className="text-xs text-muted-foreground text-center py-2">Đang tải thêm…</div>}
      </div>
    </div>
  )
}
