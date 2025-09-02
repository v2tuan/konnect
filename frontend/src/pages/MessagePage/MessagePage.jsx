"use client"

import React from "react"
import { ChatArea } from "@/components/common/Sidebar/Chat/ChatArea"
import { ContactsList } from "@/components/common/Sidebar/Chat/ContactsList"
import { UserProfile } from "@/components/common/Sidebar/Chat/UserProfile"

export default function MessagePage({ chatState }) {
  if (!chatState) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Đang tải...</p>
      </div>
    )
  }

  const {
    selectedChat,
    currentView,
    contacts,
    onContactSelect,
    onSendMessage
  } = chatState

  return (
    <div className="h-full w-full">
      {currentView === "chat" && selectedChat && (
        <ChatArea chat={selectedChat} onSendMessage={onSendMessage} />
      )}
      {currentView === "contacts" && (
        <ContactsList contacts={contacts} onContactSelect={onContactSelect} />
      )}
      {currentView === "profile" && <UserProfile />}
    </div>
  )
}