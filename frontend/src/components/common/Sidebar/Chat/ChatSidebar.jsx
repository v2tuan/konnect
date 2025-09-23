/* eslint-disable no-empty */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'

import { getConversationByUserId, getConversations, searchUserByUsername } from '@/apis'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonConversation } from '../Skeleton/SkeletonConversation'

import { selectCurrentUser, upsertUsers } from '@/redux/user/userSlice'
import { usePresenceText } from '@/hooks/use-relative-time'
import { extractId, formatTimeAgo, pickPeerStatus } from '@/utils/helper'
import { API_ROOT } from '@/utils/constant'

// ⭐ unread store
import { useUnreadStore } from '@/store/useUnreadStore'

// =========================
// Item riêng để an toàn hook
// =========================
function ConversationListItem({
  conversation,
  usersById,
  isActive,
  unread = 0,
  onClick,
  lastMessageText
}) {
  const id = extractId(conversation)

  const status = conversation.type === 'direct'
    ? pickPeerStatus(conversation, usersById)
    : { isOnline: false, lastActiveAt: null }

  const presenceTextRaw = usePresenceText({
    isOnline: status.isOnline,
    lastActiveAt: status.lastActiveAt
  })

  const tone = presenceTextRaw?.toLowerCase() === 'away'
    ? 'away'
    : (status.isOnline ? 'online' : 'offline')

  const presenceDotClass =
    tone === 'online' ? 'bg-status-online bg-emerald-500'
      : tone === 'away' ? 'bg-status-away bg-amber-400'
        : 'bg-status-offline bg-zinc-400'

  // Văn bản hiển thị: nếu có unread > 0 => "{n} tin nhắn mới"
  const previewText = unread > 0
    ? `${unread > 99 ? '99+' : unread} tin nhắn mới`
    : lastMessageText

  return (
    <div
      key={id}
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-card-hover ${isActive ? 'bg-primary/10 border border-primary/20' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={conversation.conversationAvatarUrl}/>
            <AvatarFallback>{conversation.displayName?.[0]}</AvatarFallback>
          </Avatar>

          {conversation.type === 'direct' && (
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${presenceDotClass}`}/>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className={`truncate ${unread > 0 ? 'font-semibold text-foreground' : 'font-medium'}`}>
              {conversation.displayName}
            </h3>

            {/* Badge tròn nhỏ bên phải thời gian */}
            {unread > 0 && (
              <span
                className="ml-2 shrink-0 min-w-5 h-5 px-2 rounded-full text-[10px] leading-5 bg-primary text-primary-foreground text-center">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className={`text-sm truncate ${unread > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {previewText}
            </p>
            {conversation.lastMessage?.createdAt && (
              <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                {formatTimeAgo(conversation.lastMessage.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================
// ChatSidebar
// =========================
export function ChatSidebar({ currentView, onViewChange }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchList, setSearchList] = useState([])
  const [conversationList, setConversationList] = useState([])
  const [pagination] = useState({ page: 1, limit: 10 })

  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()

  const currentUser = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const usersById = useSelector((state) => state.user.usersById || {})

  // ⭐ unread state
  const unreadMap = useUnreadStore(s => s.map)
  const setUnread = useUnreadStore(s => s.setUnread)

  // socket
  const socketRef = useRef(null)
  const joinedRef = useRef(new Set())

  // -----------------------
  // Utils: text tin cuối
  // -----------------------
  const getLastMessageText = (conv) => {
    const lm = conv.lastMessage
    if (!lm) return 'Chưa có tin nhắn'
    if (!lm.textPreview) return 'Chưa có tin nhắn'

    const sid = typeof lm.senderId === 'object' ? lm.senderId?._id : lm.senderId
    if (sid && String(sid) === String(currentUser?._id)) {
      return `You: ${lm.textPreview}`
    }

    if (conv.type === 'group') {
      let senderName = lm.sender?.fullName || lm.sender?.username
      if (!senderName && Array.isArray(conv.group?.members)) {
        const m = conv.group.members.find(u => String(u.id || u._id) === String(sid))
        senderName = m?.fullName || m?.username
      }
      if (senderName) return `${senderName}: ${lm.textPreview}`
    }

    return lm.textPreview
  }

  // -----------------------
  // Load conversations
  // -----------------------
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { page, limit } = pagination
        const conversations = await getConversations(page, limit)
        if (!mounted) return
        const data = conversations?.data || []
        setConversationList(data)
        const peers = data.map(c => c?.direct?.otherUser).filter(Boolean)
        if (peers.length) dispatch(upsertUsers(peers))
      } catch {
        setConversationList([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [pagination, dispatch])

  // -----------------------
  // Search (debounce)
  // -----------------------
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

  // -----------------------
  // Socket: message:new
  // -----------------------
  useEffect(() => {
    if (loading || socketRef.current) return
    const s = io(API_ROOT, { withCredentials: true })
    socketRef.current = s

    // Join tất cả room hiện có sau khi connect
    s.on('connect', () => {
      try {
        (conversationList || []).forEach(c => {
          const id = extractId(c)
          if (id && !joinedRef.current.has(id)) {
            s.emit('conversation:join', { conversationId: id })
            joinedRef.current.add(id)
          }
        })
      } catch {
      }
    })

    const onNewMessage = (payload) => {
      const convId = extractId(
        payload?.conversationId || payload?.conversation?._id || payload?.conversation
      )
      if (!convId) return
      const msg = payload?.message || payload

      // Cập nhật lastMessage & đẩy conv lên đầu
      setConversationList(prev => {
        const idx = prev.findIndex(c => extractId(c) === convId)
        if (idx === -1) return prev
        const old = prev[idx]
        const updated = {
          ...old,
          lastMessage: {
            _id: msg._id || msg.id,
            textPreview: msg.body?.text ?? msg.text ?? '',
            senderId: msg.senderId,
            createdAt: msg.createdAt || Date.now()
          }
        }
        const next = [...prev]
        next.splice(idx, 1)
        return [updated, ...next]
      })

      // ⭐ Tăng unread nếu:
      // - Không phải phòng đang mở
      // - Và tin nhắn không phải do chính mình gửi
      const myId = String(currentUser?._id || '')
      const senderId = String((msg.senderId && msg.senderId._id) || msg.senderId || '')
      const isMine = myId && senderId && myId === senderId

      if (convId !== activeIdFromURL && !isMine) {
        const curr = unreadMap[convId] || 0
        setUnread(convId, curr + 1)
      }
    }

    s.on('message:new', onNewMessage)
    return () => {
      s.off('message:new', onNewMessage)
      s.disconnect()
      socketRef.current = null
      joinedRef.current.clear()
    }
  }, [loading, conversationList, currentUser?._id, activeIdFromURL, unreadMap, setUnread])

  // Join room khi danh sách thay đổi (sau lần đầu)
  useEffect(() => {
    if (!socketRef.current) return
    try {
      (conversationList || []).forEach(c => {
        const id = extractId(c)
        if (id && !joinedRef.current.has(id)) {
          socketRef.current.emit('conversation:join', { conversationId: id })
          joinedRef.current.add(id)
        }
      })
    } catch {
    }
  }, [conversationList])

  // -----------------------
  // Clicks
  // -----------------------
  const handleClickUser = async (userId) => {
    try {
      const conversation = await getConversationByUserId(userId)
      const id = extractId(conversation?.data)
      if (!id) return
      onViewChange?.('chat')
      // clear local unread để UI phản hồi ngay
      useUnreadStore.getState().setUnread(id, 0)
      navigate(`/chats/${id}`)
    } catch {
    }
  }

  const handleClickConversation = (conv) => {
    const id = extractId(conv)
    if (!id) return
    onViewChange?.('chat')
    // clear local unread để UI phản hồi ngay
    useUnreadStore.getState().setUnread(id, 0)
    navigate(`/chats/${id}`)
  }

  // Memo hóa map unread -> render text preview
  const lastTexts = useMemo(() => {
    const map = {}
    for (const c of conversationList) {
      const id = extractId(c)
      const unread = unreadMap[id] || 0
      if (unread > 0) map[id] = `${unread > 99 ? '99+' : unread} tin nhắn mới`
      else map[id] = getLastMessageText(c)
    }
    return map
  }, [conversationList, unreadMap])

  // ========================
  // Render
  // ========================
  return (
    <div className="h-full flex flex-col">
      {/* Header: Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" viewBox="0 0 24 24"
            fill="none">
            <path d="M21 21l-4.3-4.3m1.8-4.7a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <Input
            placeholder="Tìm kiếm bạn bè, tin nhắn..."
            onChange={(e) => {
              onViewChange?.('search')
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
            <span className="mr-2">💬</span> Chat
          </Button>
          <Button
            variant={currentView === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange?.('priority')}
            className="flex-1"
          >
            <span className="mr-2">👥</span> Bạn bè
          </Button>
        </div>
      </div>

      {/* Skeleton khi search */}
      {currentView === 'search' && loading && (
        <>
          <SkeletonConversation/>
          <SkeletonConversation/>
          <SkeletonConversation/>
          <SkeletonConversation/>
          <SkeletonConversation/>
        </>
      )}

      {/* Kết quả search */}
      {currentView === 'search' && !loading && (
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
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatarUrl}/>
                    <AvatarFallback>{user.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{user.username}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.fullName || ''}
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
                <SkeletonConversation/>
                <SkeletonConversation/>
                <SkeletonConversation/>
              </>
            ) : (
              conversationList.map((conversation) => {
                const id = extractId(conversation)
                const isActive = activeIdFromURL === id
                const unread = unreadMap[id] || 0
                return (
                  <ConversationListItem
                    key={id}
                    conversation={conversation}
                    usersById={usersById}
                    isActive={isActive}
                    unread={unread}
                    lastMessageText={lastTexts[id]}
                    onClick={() => handleClickConversation(conversation)}
                  />
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
            📞 Cuộc gọi
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            🎥 Video
          </Button>
        </div>
      </div>
    </div>
  )
}
