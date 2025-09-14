/* eslint-disable no-empty */
import { getConversationByUserId, getConversations, searchUserByUsername } from '@/apis'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { selectCurrentUser, upsertUsers } from '@/redux/user/userSlice'
import { formatTimeAgo, pickPeerStatus, renderPresenceText } from '@/utils/helper'
import { MessageCircle, Phone, Search, Users, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { SkeletonConversation } from '../Skeleton/SkeletonConversation'

function extractId(raw) {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (raw._id) return String(raw._id)
  if (raw.id) return String(raw.id)
  if (raw.conversationId) return String(raw.conversationId)
  return null
}

export function ChatSidebar({
  currentView,
  onViewChange
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchList, setSearchList] = useState([])
  const [conversationList, setConversationList] = useState([])
  const [pagination, setPage] = useState({ page: 1, limit: 10 })

  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()

  const currentUser = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const usersById = useSelector((state) => state.user.usersById || {} )

  const getLastMessageText = (conv) => {
    const lm = conv.lastMessage
    if (!lm) return "Chưa có tin nhắn"
    if (!lm.textPreview) return "Chưa có tin nhắn"

    // nếu senderId = currentUser._id thì thêm prefix
    if (lm.senderId && String(lm.senderId.id) === String(currentUser._id)) {
      return `You: ${lm.textPreview}`
    }
    return lm.textPreview
  }

  // Load conversations
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { page, limit } = pagination
        const conversations = await getConversations(page, limit)
        if (!mounted) return
        setConversationList(conversations?.data || [])
        const peers = (conversations?.data || [])
          .map(c => c?.direct?.otherUser)
          .filter(Boolean)
        if (peers.length) dispatch(upsertUsers(peers))
      } catch {
        setConversationList([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [pagination])

  // Search user (debounce)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchList([])
      setLoading(false)
      onViewChange?.('chat')
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchUserByUsername(searchQuery)
        setSearchList(data || [])
      } catch {
        setSearchList([])
      } finally {
        setLoading(false)
      }
    }, 500)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [searchQuery, onViewChange])

  const getStatusDotClass = (isOnline) => (isOnline ? 'bg-status-online' : 'bg-status-offline')

  // Click user trong search → lấy/khởi tạo conversation rồi ROUTE
  const handleClickUser = async (userId) => {
    try {
      const conversation = await getConversationByUserId(userId)
      const id = extractId(conversation?.data)
      if (!id) return
      onViewChange?.('chat')
      navigate(`/chats/${id}`)
    } catch {}
  }

  // Click item trong list → ROUTE
  const handleClickConversation = (conv) => {
    const id = extractId(conv)
    if (!id) return
    onViewChange?.('chat')
    navigate(`/chats/${id}`)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header: Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Tìm kiếm bạn bè, tin nhắn..."
            onChange={(e) => {
              onViewChange?.("search")
              setSearchQuery(e.target.value)
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex gap-1">
          <Button
            variant={currentView === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange?.('chat')}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button
            variant={currentView === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange?.('priority')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Bạn bè
          </Button>
        </div>
      </div>

      {/* Skeleton khi search */}
      {currentView === "search" && loading && (
        <>
          <SkeletonConversation />
          <SkeletonConversation />
          <SkeletonConversation />
          <SkeletonConversation />
          <SkeletonConversation />
        </>
      )}

      {/* Kết quả search */}
      {currentView === "search" && !loading && (
        searchList.length === 0 ? (
          <p className="p-3 rounded-lg">No users found</p>
        ) : (
          <div className="overflow-y-auto">
            {searchList.map((user) => (
              <div
                key={extractId(user)}
                className="p-3 rounded-lg cursor-pointer hover:bg-primary/10"
                onClick={() => handleClickUser(user.id || user._id)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{user.username}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.fullName || ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'chat' && (
          <div className="space-y-1 p-2">
            {loading ? (
              <>
                <SkeletonConversation />
                <SkeletonConversation />
                <SkeletonConversation />
              </>
            ) : (
              conversationList.map((conversation) => {
                const id = extractId(conversation)
                const isActive = activeIdFromURL === id
                return (
                  <div
                    key={id}
                    onClick={() => handleClickConversation(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-card-hover
                      ${isActive ? 'bg-primary/10 border border-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={conversation.conversationAvatarUrl} />
                          <AvatarFallback>{conversation.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        {conversation.direct && (() => {
                          const { isOnline } = pickPeerStatus(conversation, usersById)
                          return (
                            <div
                              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusDotClass(isOnline)}`}
                            />
                          )
                        }
                        )()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium truncate">{conversation.displayName}</h3>
                          {conversation.lastMessage?.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {getLastMessageText(conversation)}
                          </p>
                          {conversation.direct && (() => {
                            const { isOnline, lastActiveAt } = pickPeerStatus(conversation, usersById)
                            return (
                              <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                                {renderPresenceText(isOnline, lastActiveAt)}
                              </span>
                            )
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Phone className="w-4 h-4 mr-2" />
            Cuộc gọi
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Video className="w-4 h-4 mr-2" />
            Video
          </Button>
        </div>
      </div>
    </div>
  )
}
