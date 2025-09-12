import { useOutletContext, useParams } from "react-router-dom"
import { ChatArea } from "@/components/common/Sidebar/Chat/ChatArea" // đúng path của bạn
import WelcomeScreen from "@/components/common/WelcomeScreen"
import { useCloudChat } from "@/hooks/useCloudChat"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"

export default function MessagePage() {
  const { chatState } = useOutletContext()

  const { conversationId } = useParams()

  if (!conversationId) <WelcomeScreen/>

  const currentUser = useSelector(selectCurrentUser)

  const {
    loading,
    sending,
    messages,
    send,
    startTyping,
    stopTyping,
    othersTyping,
    conversation
  } = useCloudChat({
    mode: "direct",
    currentUserId: currentUser._id,
    conversationId
  })
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
