import { useEffect, useRef, useState } from "react"
import { getWebRTCSocket } from "@/lib/socket"

export function useCallInvite(currentUserId) {
  const [incoming, setIncoming] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const s = getWebRTCSocket(currentUserId)
    socketRef.current = s

    const onIncoming = (data) => setIncoming({ ...data, receivedAt: Date.now() })
    const onCancelled = () => setIncoming(null)

    s.on("call:incoming", onIncoming)
    s.on("call:cancelled", onCancelled)

    return () => {
      s.off("call:incoming", onIncoming)
      s.off("call:cancelled", onCancelled)
    }
  }, [currentUserId])

  const invite = ({ conversationId, mode, toUserIds, fromUser, peer, timeoutMs = 30000 }) => {
    socketRef.current?.emit("call:invite", {
      conversationId, mode, toUserIds, fromUser, peer, timeoutMs
    })
  }

  const cancel = ({ toUserIds, conversationId }) => {
    socketRef.current?.emit("call:cancel", { toUserIds, conversationId })
    setIncoming(null)
  }

  const accept = ({ toUserId, conversationId }) => {
    socketRef.current?.emit("call:accept", { toUserId, conversationId })
  }

  const reject = ({ toUserId, conversationId, reason }) => {
    socketRef.current?.emit("call:reject", { toUserId, conversationId, reason })
    setIncoming(null)
  }

  return { incoming, invite, cancel, accept, reject }
}
