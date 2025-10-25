"use client"

import { ChatArea } from "@/components/common/Sidebar/Chat/ChatArea"
import WelcomeScreen from "@/components/common/WelcomeScreen"
import { useCloudChat } from "@/hooks/use-chat"
import { useConversationFocus, useMarkConversationRead } from "@/hooks/use-conversation"
import { selectCurrentUser } from "@/redux/user/userSlice"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"

export default function MessagePage() {
  const { conversationId } = useParams()
  const currentUser = useSelector(selectCurrentUser)

  useMarkConversationRead(conversationId)
  useConversationFocus(conversationId)

  const {
    loading, sending, messages, send,
    startTyping, stopTyping, othersTyping, conversation,
    loadOlder, hasMore // ✅ Get loadOlder & hasMore
  } = useCloudChat({
    mode: "direct",
    currentUserId: currentUser?._id,
    conversationId
  })

  if (!conversationId) return <WelcomeScreen/>

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
        onSendMessage={send}
        sending={sending}
        onStartTyping={startTyping}
        onStopTyping={stopTyping}
        othersTyping={othersTyping}
        onLoadOlder={loadOlder} // ✅ Pass loadOlder
        hasMore={hasMore} // ✅ Pass hasMore
      />
    </div>
  )
}
