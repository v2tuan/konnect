import { ChatArea } from '@/components/common/Sidebar/Chat/ChatArea'
import { Loader2 } from 'lucide-react'
import { useCloudChat } from '@/hooks/useCloudChat'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'

export default function CloudPage() {
  const currentUser = useSelector(selectCurrentUser)
  const currentUserId = currentUser._id

  const {
    loading,
    sending,
    conversation,
    messages,
    send
  } = useCloudChat('cloud', currentUserId)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  // Conversation tối giản cho Cloud (có thể lấy từ API)
  const convUi = {
    displayName: conversation?.group?.name || 'My Cloud',
    conversationAvatarUrl:
      conversation?.group?.avatarUrl || '/cloud-note-icon.svg'
  }

  return (
    <ChatArea
      mode="cloud"
      conversation={convUi}
      messages={messages}
      onSendMessage={send}
      sending={sending}
      loading={loading}
    />
  )
}
