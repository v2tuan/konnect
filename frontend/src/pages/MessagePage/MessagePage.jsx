import { ChatArea } from "@/components/common/Sidebar/Chat/ChatArea"
import WelcomeScreen from "@/components/common/WelcomeScreen"
import { useCloudChat } from "@/hooks/useCloudChat"
import { selectCurrentUser } from "@/redux/user/userSlice"
import { useSelector } from "react-redux"
import { useParams } from "react-router-dom"

export default function MessagePage() {
  const { conversationId } = useParams()
  const currentUser = useSelector(selectCurrentUser)

  const {
    loading, sending, messages, send,
    startTyping, stopTyping, othersTyping, conversation
  } = useCloudChat({
    mode: "direct",
    currentUserId: currentUser?._id,
    conversationId
  })

  if (!conversationId) return <WelcomeScreen />

  return (
    <div className="h-full w-full">
      <ChatArea
        mode="direct"
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
