"use client"

import { ChatArea } from "@/components/common/Sidebar/Chat/ChatArea"
import WelcomeScreen from "@/components/common/WelcomeScreen"
import { useCloudChat } from "@/hooks/use-chat"
import { selectCurrentUser } from "@/redux/user/userSlice"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"

// ⭐ import hook mark read
import { useConversationFocus, useMarkConversationRead } from "@/hooks/use-conversation.js"

export default function MessagePage() {
  const { conversationId } = useParams()
  const currentUser = useSelector(selectCurrentUser)

  // ⭐ Gọi hook: đánh dấu đã đọc + clear notification của phòng
  useMarkConversationRead(conversationId)
  useConversationFocus(conversationId)

  const {
    loading, sending, messages, send,
    startTyping, stopTyping, othersTyping, conversation
  } = useCloudChat({
    mode: "direct", // hook param unchanged
    currentUserId: currentUser?._id,
    conversationId
  })

  if (!conversationId) return <WelcomeScreen/>

  // Infer UI mode from conversation.type (cloud/direct/group)
  const chatMode =
    conversation?.type === "cloud"
      ? "cloud"
      : conversation?.type === "group"
      ? "group"
      : "direct"

  return (
    <div className="h-full w-full">
      <ChatArea
        mode={chatMode}
        conversation={conversation || { _id: conversationId }}
        messages={messages}
        loading={loading}
        sending={sending}
        onSendMessage={send}
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
        othersTyping={othersTyping}
      />
    </div>
  )
}
