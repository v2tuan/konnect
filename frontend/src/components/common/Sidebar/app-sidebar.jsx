// src/components/.../AppSidebar.tsx(x)
"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Bell, BookUser, Brain, Cloud, GalleryVerticalEnd, Inbox, Trash2 } from "lucide-react"
import { useSelector } from "react-redux"

import { ChatSidebar } from "@/components/common/Sidebar/Chat/ChatSidebar"
import ContactSidebar from "@/components/common/Sidebar/Contact/ContactSidebar"
import { NavUser } from "@/components/common/Sidebar/nav-user"
import ModeToggle from "@/components/common/NavBar/ThemeToggle"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { Button as UIButton } from "@/components/ui/button"

import { useUnreadStore } from "@/store/useUnreadStore"
import { useUnreadBoot } from "@/hooks/useUnreadBoot"

import { listNotifications, markNotificationsRead, updateFriendRequestStatusAPI } from "@/apis"
import NotificationsSidebar from "@/components/common/Notification/NotificationsSidebar.jsx"
import { connectSocket, getSocket } from "@/lib/socket.js";

// ⭐ Helper so sánh id an toàn (JS thuần, không TS annotation để tránh ESLint error)
const eqId = (a, b) => String(a ?? "") === String(b ?? "")
// Nếu là .jsx và ESLint phàn nàn, đổi thành: const eqId = (a, b) => String(a ?? "") === String(b ?? "");

const data = {
  user: { name: "Đặng Đăng Duy", email: "duyproven987@gmail.com", avatar: "/avatars/shadcn.jpg" },
  navMain: [
    { title: "Message", url: "/chats", icon: Inbox },
    { title: "Contact", url: "/contacts", icon: BookUser },
    { title: "Cloud", url: "/chats/cloud", icon: Cloud },
    { title: "Block", url: "/block", icon: Trash2 },
    { title: "Agent Chat", url: "/agent", icon: Brain }
  ]
}

export function AppSidebar(props) {
  const { chatState, contactTab, onContactTabChange, ...rest } = (() => {
    const clone = { ...props }
    delete clone.cloudTab
    delete clone.onCloudTabChange
    return clone
  })()

  const { open, setOpen } = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const me = useSelector((s) => s.user.currentUser?._id)
  const isMessage = location.pathname.startsWith("/chats")
  const isContact = location.pathname.startsWith("/contacts")
  const isNotification = location.pathname.startsWith("/notifications")

  useUnreadBoot()
  const totalConversations = useUnreadStore((s) => s.totalConversations)

  // ========= Notifications state =========
  const [notifs, setNotifs] = useState([])          // danh sách hiển thị trong panel
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [badgeCount, setBadgeCount] = useState(0)   // số ở nút chuông (khi KHÔNG đứng ở /notifications)

  // Số item chưa đọc trong list (khi ĐANG đứng ở /notifications)
  const unreadNotiCountInList = (Array.isArray(notifs) ? notifs : []).filter((n) => n.status === "unread").length

  // ⭐ Mark read theo friendshipId, đồng bộ cả server + local + badge
  const markRequestNotifsAsRead = React.useCallback(async (friendshipId) => {
    if (!friendshipId) return

    // 1) lấy id từ local list
    const localIds = (Array.isArray(notifs) ? notifs : [])
    .filter(n =>
      n?.status === "unread" &&
      (eqId(n?.friendshipId, friendshipId) || eqId(n?.extra?.friendshipId, friendshipId))
    )
    .map(n => n.id || n._id)
    .filter(Boolean)

    // 2) nếu local không có (ví dụ panel đang đóng), fetch unread page để tìm
    let targetIds = [...localIds]
    if (targetIds.length === 0) {
      try {
        const res = await listNotifications({ onlyUnread: true, limit: 100, type: "friend_request" })
        const arr = Array.isArray(res) ? res : (res?.items ?? [])
        targetIds = arr
        .filter(n => eqId(n?.friendshipId, friendshipId) || eqId(n?.extra?.friendshipId, friendshipId))
        .map(n => n.id || n._id)
        .filter(Boolean)
      } catch { /* ignore */ }
    }

    if (targetIds.length === 0) return

    // 3) gọi API mark read
    try { await markNotificationsRead(targetIds) } catch { /* ignore */ }

    // 4) cập nhật local list (nếu đang mở panel)
    setNotifs(curr =>
      (Array.isArray(curr) ? curr : []).map(n =>
        targetIds.includes(n.id || n._id)
          ? { ...n, status: "read", readAt: new Date().toISOString() }
          : n
      )
    )

    // 5) cập nhật badge nếu KHÔNG đứng ở /notifications
    if (!isNotification) {
      setBadgeCount(c => Math.max(0, c - targetIds.length))
    }
  }, [notifs, isNotification])

  // Load danh sách khi mở panel
  const loadNotifications = async () => {
    setLoadingNotifs(true)
    try {
      const notificationsArray = await listNotifications({
        limit: 30,
        onlyUnread: false,
        type: "friend_request"
      })
      const items = Array.isArray(notificationsArray) ? notificationsArray : (notificationsArray?.items ?? [])
      setNotifs(items)
    } catch (e) {
      console.error("load notifications failed:", e)
      setNotifs([])
    } finally {
      setLoadingNotifs(false)
    }
  }

  // Badge boot + socket badge listeners (chạy cả khi không mở panel)
  useEffect(() => {
    if (!me) return
    connectSocket(me)

    if (!isNotification) {
      (async () => {
        try {
          const res = await listNotifications({ onlyUnread: true, limit: 100, type: "friend_request" })
          const arr = Array.isArray(res) ? res : (res?.items ?? [])
          setBadgeCount(arr.length)
        } catch { /* empty */ }
      })()
    }

    const s = getSocket()
    if (!s) return

    const onBadgeInc = (p) => {
      if (!location.pathname.startsWith("/notifications")) {
        setBadgeCount((c) => c + Number(p?.by ?? 1))
      }
    }
    const onMarkAllRead = (p) => {
      if (!p?.type || p.type === "friend_request") {
        setBadgeCount(0)
      }
    }
    s.on("notification:badge:inc", onBadgeInc)
    s.on("notification:mark-all-read", onMarkAllRead)
    return () => {
      s.off("notification:badge:inc", onBadgeInc)
      s.off("notification:mark-all-read", onMarkAllRead)
    }
  }, [me, isNotification, location.pathname])

  // Socket listeners khi ĐANG mở panel /notifications
  useEffect(() => {
    if (!isNotification) return
    setBadgeCount(0) // khi đã vào panel, badge hiển thị từ unread trong list

    const s = getSocket()
    if (!s) {
      console.warn("Socket not available in AppSidebar")
      return
    }

    const onNewNotification = (payload) => {
      if (payload?.type === "friend_request") {
        setNotifs((currentNotifs) => {
          const filteredList = (Array.isArray(currentNotifs) ? currentNotifs : []).filter(n => n.id !== payload.id)
          return [payload, ...filteredList]
        })
      }
    }
    const onMarkAllRead = (payload) => {
      if (!payload?.type || payload.type === "friend_request") {
        setNotifs((currentNotifs) =>
          (Array.isArray(currentNotifs) ? currentNotifs : []).map((n) => ({ ...n, status: "read", readAt: new Date().toISOString() }))
        )
      }
    }
    const onUpdateNotification = (payload) => {
      setNotifs((currentNotifs) =>
        (Array.isArray(currentNotifs) ? currentNotifs : []).map((n) =>
          n.id === payload.id ? { ...n, ...payload } : n
        )
      )
    }

    s.on("notification:new", onNewNotification)
    s.on("notification:mark-all-read", onMarkAllRead)
    s.on("notification:updated", onUpdateNotification)

    return () => {
      s.off("notification:new", onNewNotification)
      s.off("notification:mark-all-read", onMarkAllRead)
      s.off("notification:updated", onUpdateNotification)
    }
  }, [isNotification])

  // Actions trong panel
  const markOneReadLocal = (id) => {
    setNotifs((curr) =>
      (Array.isArray(curr) ? curr : []).map((n) => (n.id === id ? { ...n, status: "read", readAt: new Date().toISOString() } : n))
    )
  }
  const markOneRead = async (notif) => {
    try {
      await markNotificationsRead([notif.id])
      markOneReadLocal(notif.id)
    } catch (e) {
      console.error("mark read failed:", e)
    }
  }
  const handleFriendAction = async (notif, action) => {
    try {
      const requestId =
        (notif && notif.friendshipId) ||
        (notif && notif.extra && (notif.extra.friendshipId || notif.extra.requestId))
      if (!requestId) return

      await updateFriendRequestStatusAPI({ requestId, action })
      // cập nhật item đang bấm
      markOneReadLocal(notif.id)
      try { await markNotificationsRead([notif.id]) } catch { /* empty */ }

      // ⭐ Quan trọng: đồng bộ các item khác cùng friendshipId + badge
      markRequestNotifsAsRead(requestId)
    } catch (e) {
      console.error("Friend action failed:", e)
      alert(`Action [${action}] failed. Please try again.`)
    }
  }

  // Auto open/close middle pane
  useEffect(() => {
    const shouldOpen = isMessage || isContact || isNotification
    if (open !== shouldOpen) setOpen(shouldOpen)
  }, [isMessage, isContact, isNotification, open, setOpen])

  useEffect(() => {
    if (isNotification) loadNotifications()
  }, [isNotification])

  // ⭐ Lắng nghe sự kiện global từ ChatArea / FriendRequest → đồng bộ list + badge
  useEffect(() => {
    const handleAction = (event) => {
      const { requestId: eventRequestId } = event.detail || {}
      if (!eventRequestId) return

      // 1) cập nhật list local (nếu có item)
      let dec = 0
      setNotifs((currentNotifs) => {
        const list = Array.isArray(currentNotifs) ? currentNotifs : []
        const updated = list.map(n => {
          const fid = n?.friendshipId || n?.extra?.friendshipId
          if (n.status === "unread" && fid && eqId(fid, eventRequestId)) {
            dec += 1
            return { ...n, status: "read", readAt: new Date().toISOString() }
          }
          return n
        })
        return updated
      })

      // 2) gọi mark read theo friendshipId (đồng bộ server + giảm badge khi cần)
      markRequestNotifsAsRead(eventRequestId)

      // 3) nếu KHÔNG đứng ở /notifications, trừ badge ngay lập tức cho mượt (phòng khi API chậm)
      if (!location.pathname.startsWith("/notifications") && dec > 0) {
        setBadgeCount(c => Math.max(0, c - dec))
      }
    }

    window.addEventListener("friendship:action", handleAction)
    return () => window.removeEventListener("friendship:action", handleAction)
  }, [markRequestNotifsAsRead, location.pathname])

  const displayBadgeCount = isNotification ? unreadNotiCountInList : badgeCount

  return (
    <>
      <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row" {...rest}>
        {/* Left rail */}
        <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon))] border-r">

          <SidebarHeader className="flex items-center justify-center">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip={{ children: "Konnect", hidden: false }}
                  className="relative flex h-12 w-full items-center justify-center gap-0 p-0 leading-none group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!p-0"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                    <GalleryVerticalEnd className="h-4 w-4 block" />
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent className="flex items-center">
            <SidebarGroup>
              <SidebarGroupContent className="flex flex-col items-center px-0">
                <SidebarMenu>
                  {data.navMain.map((item) => {
                    const active = location.pathname.startsWith(item.url)
                    const needPanel = item.url === "/chats" || item.url === "/contacts"
                    const isMessageItem = item.url === "/chats"
                    return (
                      <SidebarMenuItem key={item.title} className="relative overflow-visible">
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          className="w-full justify-center px-0 overflow-visible"
                          tooltip={{ children: item.title, hidden: false }}
                          onClick={() => setOpen(needPanel)}
                        >
                          <NavLink to={item.url} className="relative flex items-center justify-center">
                            <item.icon className="block" />
                            {isMessageItem && totalConversations > 0 && (
                              <span
                                className="absolute z-10 top-0 right-0 translate-x-1/3 -translate-y-1/3 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] px-1 leading-none flex items-center justify-center shadow-sm"
                                aria-label={`${totalConversations} conversations have new messages`}
                              >
                                {totalConversations > 99 ? "99+" : totalConversations}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="flex items-center justify-center gap-3 relative">
            {/* Chuông → /notifications */}
            <UIButton
              variant="ghost"
              size="icon"
              onClick={() => {
                navigate("/notifications")
                setOpen(true)
              }}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {displayBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center px-1">
                  {displayBadgeCount > 99 ? "99+" : displayBadgeCount}
                </span>
              )}
            </UIButton>

            <ModeToggle />
            <NavUser />
          </SidebarFooter>
        </Sidebar>

        {/* Middle pane - Message list */}
        {open && isMessage && props.chatState && (
          <Sidebar collapsible="none" className="w-[450px] border-r">
            <ChatSidebar
              chats={chatState.chats}
              contacts={chatState.contacts}
              selectedChat={chatState.selectedChat}
              onChatSelect={chatState.onChatSelect}
              currentView={chatState.currentView}
              onViewChange={chatState.onViewChange}
            />
          </Sidebar>
        )}

        {/* Middle pane - Contact */}
        {open && isContact && (
          <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
            <ContactSidebar value={contactTab || "home"} onValueChange={onContactTabChange || (() => {})} />
          </Sidebar>
        )}

        {/* Middle pane - Notifications */}
        {open && isNotification && (
          <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
            <NotificationsSidebar
              items={notifs}
              loading={loadingNotifs}
              onReload={loadNotifications}
              onFriendAction={handleFriendAction}
              onMarkRead={markOneRead}
            />
          </Sidebar>
        )}
      </Sidebar>
    </>
  )
}
