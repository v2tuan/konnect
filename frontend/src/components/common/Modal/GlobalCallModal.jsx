import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'
import { useCallStore } from '@/store/useCallStore'
import CallModal from './CallModal'
import { getWebRTCSocket } from '@/lib/socket'

export default function GlobalCallModal() {
  const currentUser = useSelector(selectCurrentUser)
  const { activeCall, closeCall } = useCallStore()

  if (!activeCall || !currentUser) return null

  const handleClose = () => {
    const socket = getWebRTCSocket(currentUser._id)
    
    // ✅ Emit leave/end call
    socket?.emit('call:leave', {
      conversationId: activeCall.conversationId,
      callId: activeCall.callId,
      userId: currentUser._id
    })
    
    // ✅ Emit cancel nếu đang ringing (người gọi hủy)
    socket?.emit('call:cancel', {
      callId: activeCall.callId
    })
    
    closeCall()
  }

  return (
    <CallModal
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
      conversationId={activeCall.conversationId}
      currentUserId={currentUser._id}
      initialMode={activeCall.initialMode}
      callStartedAt={activeCall.callStartedAt}
      callId={activeCall.callId}
    />
  )
}