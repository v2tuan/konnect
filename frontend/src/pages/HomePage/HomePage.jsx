"use client"

import * as React from "react"
import NavBar from "@/components/common/NavBar"
import { AppSidebar } from "@/components/common/Sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"

export default function MainLayout() {
  // Chat state
  const [currentView, setCurrentView] = React.useState("chat")
  const [chats, setChats] = React.useState([])
  const [selectedChat, setSelectedChat] = React.useState(null)
  const [contacts, setContacts] = React.useState([])

  // Contact tab state
  const [contactTab, setContactTab] = React.useState("home")

  //cloud state
  const [cloudTab, setCloudTab] = React.useState("cloud")

  const openChatWithContact = (contact) => {
    if (!contact?.id) return
    let existing = chats.find((c) => c.contact?.id === contact.id)
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
    setChats,
    contacts,
    setContacts,
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
          cloudTab={cloudTab}
          onCloudTabChange={setCloudTab}
        />

        {/* Main content area = NavBar + Outlet */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0">
            {/* Truyền state xuống page qua Outlet context */}
            <Outlet context={{ chatState, contactTab, setContactTab, cloudTab, setCloudTab }} />
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
