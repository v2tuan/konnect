import { ChatArea } from '@/components/common/Sidebar/Chat/ChatArea'
import { Loader2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'
import { useNavigate } from 'react-router-dom'
import { useCloudChat } from '@/hooks/use-chat'
import { useEffect, useRef } from 'react'

export default function CloudPage() {
  const navigate = useNavigate()
  const currentUser = useSelector(selectCurrentUser)
  const currentUserId = currentUser?._id

  // Reuse existing hook to resolve the user's cloud (some impls also auto-create)
  const { loading, conversation } = useCloudChat('cloud', currentUserId)

  const triedCreate = useRef(false)

  // When cloud conversation is available → redirect to MessagePage
  useEffect(() => {
    if (!loading && conversation?._id) {
      navigate(`/chats/${conversation._id}`, { replace: true })
    }
  }, [loading, conversation?._id, navigate])

  // Fallback: if not found after loading, create then redirect
  useEffect(() => {
    if (!loading && !conversation?._id && currentUserId && !triedCreate.current) {
      triedCreate.current = true
      ;(async () => {
        try {
          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'cloud' })
          })
          const json = await res.json().catch(() => ({}))
          const cid =
            json?._id ||
            json?.id ||
            json?.conversation?._id ||
            json?.data?._id
          if (cid) {
            navigate(`/chats/${cid}`, { replace: true })
          }
        } catch (e) {
          // noop: keep loader or handle error UI if you want
        }
      })()
    }
  }, [loading, conversation?._id, currentUserId, navigate])

  // Loading while resolving/creating and redirecting
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
