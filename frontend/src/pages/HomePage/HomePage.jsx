"use client"

import * as React from "react"
import NavBar from "@/components/common/NavBar"
import { AppSidebar } from "@/components/common/Sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"

const mockContacts = [
  { id: "1", name: "Minh Tuấn", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", status: "online" },
  { id: "2", name: "Thu Hương", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face", status: "away", lastSeen: "2 phút" },
  { id: "3", name: "Đình Nam", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", status: "offline", lastSeen: "1 giờ" },
  { id: "4", name: "Hải Yến", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", status: "online" }
]

const mockMessages = [
  { id: "1", text: "Chào bạn! Bạn có khỏe không? 😊", timestamp: "14:32", isOwn: false, type: "text" },
  { id: "2", text: "Mình khỏe, cảm ơn bạn! Hôm nay thế nào?", timestamp: "14:33", isOwn: true, type: "text" },
  { id: "3", text: "Hôm nay mình đi cafe với bạn bè, vui lắm! 🎉", timestamp: "14:35", isOwn: false, type: "text", isPinned: true },
  { id: "4", text: "Tuyệt vời! Mình cũng muốn đi cà phê với các bạn", timestamp: "14:36", isOwn: true, type: "text" },
  { id: "5", text: "Lần sau mình rủ bạn nhé! 💪", timestamp: "14:37", isOwn: false, type: "text", reactions: [{ emoji: "👍", count: 2 }, { emoji: "❤️", count: 1 }] }
]

const mockChatsInitial = [
  { id: "1", contact: mockContacts[0], messages: mockMessages, unreadCount: 2, lastMessage: mockMessages[mockMessages.length - 1] },
  { id: "2", contact: mockContacts[1], messages: [], unreadCount: 0, lastMessage: { id: "last1", text: "OK nha, hẹn gặp lại!", timestamp: "12:45", isOwn: true, type: "text" } },
  { id: "3", contact: mockContacts[2], messages: [], unreadCount: 5, lastMessage: { id: "last2", text: "Bạn có thời gian rảnh không?", timestamp: "10:30", isOwn: false, type: "text" } }
]

export default function MainLayout() {
  // Chat state
  const [currentView, setCurrentView] = React.useState("chat")
  const [chats, setChats] = React.useState(mockChatsInitial)
  const [selectedChat, setSelectedChat] = React.useState(mockChatsInitial[0])

  // Contact tab state
  const [contactTab, setContactTab] = React.useState("home")

  const openChatWithContact = (contact) => {
    let existing = chats.find((c) => c.contact.id === contact.id)
    if (!existing) {
      existing = { id: `new-${contact.id}`, contact, messages: [], unreadCount: 0, lastMessage: null }
      setChats((prev) => [existing, ...prev])
    }
    setSelectedChat(existing)
    setCurrentView("chat")
  }

  const handleSendMessage = (text) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === selectedChat.id
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
  }

  const chatState = {
    chats,
    contacts: mockContacts,
    selectedChat,
    currentView,
    onChatSelect: setSelectedChat,
    onViewChange: setCurrentView,
    onContactSelect: openChatWithContact,
    onSendMessage: handleSendMessage
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar luôn hiện và tự mở pane giữa theo route (/chats|/contacts) */}
        <AppSidebar
          chatState={chatState}
          contactTab={contactTab}
          onContactTabChange={setContactTab}
        />

        {/* Main content area = NavBar + Outlet */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            {/* Truyền state xuống page qua Outlet context */}
            <Outlet context={{ chatState, contactTab, setContactTab }} />
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
