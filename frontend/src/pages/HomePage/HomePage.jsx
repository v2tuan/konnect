"use client"

import * as React from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/common/Sidebar/app-sidebar"
import NotificationsBridge from "@/components/common/Notification/NotificationsBridge.jsx"

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  // Chat state
  const [currentView, setCurrentView] = React.useState("chat")
  const [chats, setChats] = React.useState([])
  const [selectedChat, setSelectedChat] = React.useState(null)
  const [contacts, setContacts] = React.useState([])

  // Lấy contactTab từ URL
  const contactTab = React.useMemo(() => {
    const segs = location.pathname.split("/").filter(Boolean)
    return segs[0] === "contacts" ? (segs[1] || "friends") : "friends"
  }, [location.pathname])

  // Điều hướng tab contact qua URL
  const handleContactTabChange = React.useCallback((tab) => {
    navigate(`/contacts/${tab}`)
  }, [navigate])

  // Cloud tab
  const [cloudTab, setCloudTab] = React.useState("cloud")

  const openChatWithContact = React.useCallback((contact) => {
    if (!contact?.id) return
    setChats((prev) => {
      let existing = prev.find((c) => c.contact?.id === contact.id)
      if (!existing) {
        existing = { id: `new-${contact.id}`, contact, messages: [], unreadCount: 0, lastMessage: null }
        prev = [existing, ...prev]
      }
      setSelectedChat(existing)
      setCurrentView("chat")
      return prev
    })
  }, [])

  const handleSendMessage = React.useCallback((text) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChat?.id
          ? {
            ...c,
            messages: [
              ...c.messages,
              {
                id: String(Date.now()),
                text,
                timestamp: new Date().toLocaleTimeString().slice(0, 5),
                isOwn: true,
                type: "text"
              }
            ],
            lastMessage: {
              id: String(Date.now()),
              text,
              timestamp: new Date().toLocaleTimeString().slice(0, 5),
              isOwn: true,
              type: "text"
            }
          }
          : c
      )
    )
  }, [selectedChat?.id])

  // Gom state + handlers, tránh đổi reference mỗi render
  const chatState = React.useMemo(() => ({
    chats,
    setChats,
    contacts,
    setContacts,
    selectedChat,
    currentView,
    onChatSelect: setSelectedChat,
    onViewChange: setCurrentView,
    onContactSelect: openChatWithContact,
    onSendMessage: handleSendMessage
  }), [chats, contacts, selectedChat, currentView, openChatWithContact, handleSendMessage])

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          chatState={chatState}
          contactTab={contactTab}
          onContactTabChange={handleContactTabChange}
          cloudTab={cloudTab}
          onCloudTabChange={setCloudTab}
        />

        {/* ✅ Bridge để lắng nghe socket + render toast ở mọi page trong vùng protected */}
        <NotificationsBridge />

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            <Outlet
              context={{
                chatState,
                contactTab,
                setContactTab: handleContactTabChange,
                cloudTab,
                setCloudTab
              }}
            />
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
