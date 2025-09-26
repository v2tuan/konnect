/* eslint-disable no-empty */
import { getConversationByUserId, getConversations, searchUserByUsername } from '@/apis'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { selectCurrentUser, upsertUsers } from '@/redux/user/userSlice'
import { formatTimeAgo, pickPeerStatus } from '@/utils/helper'
import { MessageCircle, Phone, Search, Users, Video } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { SkeletonConversation } from '../Skeleton/SkeletonConversation'
import { usePresenceText } from '@/hooks/use-relative-time'
import { extractId } from '@/utils/helper'
import { API_ROOT } from '@/utils/constant'
import { io } from 'socket.io-client'

const glyphs = (s) => Array.from(String(s ?? ""))

// cắt N ký tự
const cut = (s, n) => {
  const g = glyphs(s)
  return g.length <= n ? s : g.slice(0, n).join("") + "…"
}

// Lấy N từ đầu, M ký tự/từ, và tối đa K ký tự toàn chuỗi
const previewWords = (raw = "", wordLimit = 8, maxTokenLen = 10, maxTotalLen = 20) => {
  const text = String(raw || "").trim()
  if (!text) return ""

  // 1) Tách theo khoảng trắng; cắt từng token nếu > maxTokenLen
  const tokens = text.split(/\s+/).map(t => {
    const g = glyphs(t)
    return g.length > maxTokenLen ? g.slice(0, maxTokenLen).join("") + "…" : t
  })

  // 2) Luôn join lại (kể cả khi tokens.length <= wordLimit)
  let out = tokens.slice(0, wordLimit).join(" ")

  // 3) Giới hạn tổng độ dài
  out = cut(out, maxTotalLen)

  return out
}

function ConversationListItem({ conversation, usersById, isActive, onClick, getLastMessageText }) {
  const id = extractId(conversation)
  const status = conversation.direct
    ? pickPeerStatus(conversation, usersById)
    : { isOnline: false, lastActiveAt: null }

  // Luôn gọi hook để giữ thứ tự hook ổn định
  const presenceTextRaw = usePresenceText({
    isOnline: status.isOnline,
    lastActiveAt: status.lastActiveAt
  })
  // const presenceText = conversation.direct ? presenceTextRaw : null

  const tone = presenceTextRaw?.toLowerCase() === 'away'
    ? 'away'
    : (status.isOnline ? 'online' : 'offline')

  // const presenceTextClass =
  //   tone === 'online' ? 'text-emerald-500'
  //     : tone === 'away' ? 'text-amber-500'
  //       : 'text-muted-foreground'

  const presenceDotClass =
    tone === 'online' ? 'bg-status-online bg-emerald-500'
      : tone === 'away' ? 'bg-status-away bg-amber-400'
        : 'bg-status-offline bg-zinc-400'

  return (
    <div
      key={id}
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-card-hover ${isActive ? 'bg-primary/10 border border-primary/20' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="w-12 h-12">
            <AvatarImage src={conversation.conversationAvatarUrl} />
            <AvatarFallback>{conversation.displayName?.[0]}</AvatarFallback>
          </Avatar>

          {conversation.type=== 'direct' && (
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${presenceDotClass}`}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium truncate">{conversation.displayName}</h3>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground truncate">
              {getLastMessageText(conversation)}
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

export function ChatSidebar({
  currentView,
  onViewChange
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false) // Loading cho pagination
  const [searchList, setSearchList] = useState([])
  const [conversationList, setConversationList] = useState([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [limit] = useState(20) // Số conversation mỗi trang

  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()

  const currentUser = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const usersById = useSelector((state) => state.user.usersById || {} )

  const socketRef = useRef(null)
  const joinedRef = useRef(new Set())

  // Ref cho scroll container để detect scroll
  const scrollContainerRef = useRef(null)

  // Observer cho intersection (detect khi scroll tới cuối)
  const loadMoreRef = useRef(null)

  const getLastMessageText = (conv) => {
    const lm = conv.lastMessage
    if (!lm || !lm.textPreview) return "Chưa có tin nhắn"

    //format lại độ dài tin nhắn
    const body = previewWords(lm.textPreview, 8, 20, 40)

    // nếu senderId = currentUser._id thì thêm prefix
    const sid = typeof lm.senderId === 'object' ? lm.senderId?._id : lm.senderId
    if (sid && String(sid) === String(currentUser._id)) {
      return `You: ${body}`
    }

    if (conv.type === 'group') {
      let senderName = lm.sender?.fullName || lm.sender?.username
      if (!senderName && Array.isArray(conv.group?.members)) {
        const m = conv.group.members.find(u => String(u.id || u._id) === String(sid))
        senderName = m?.fullName || m?.username
      }
      if (senderName) return `${senderName}: ${body}`
    }

    return body
  }

  // Load conversations function
  const loadConversations = useCallback(async (page = 1, isAppend = false) => {
    try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const conversations = await getConversations(page, limit)
      const newConversations = conversations?.data || []

      if (!isAppend) {
        // Trang đầu: thay thế toàn bộ
        setConversationList(newConversations)
      } else {
        // Trang sau: append vào cuối
        setConversationList(prev => [...prev, ...newConversations])
      }

      // Kiểm tra còn trang sau không
      setHasMore(newConversations.length === limit)

      // Upsert users vào Redux
      const peers = newConversations
        .map(c => c?.direct?.otherUser)
        .filter(Boolean)
      if (peers.length) dispatch(upsertUsers(peers))

    } catch (error) {
      console.error('Error loading conversations:', error)
      if (!isAppend) {
        setConversationList([])
      }
    } finally {
      if (page === 1) {
        setLoading(false)
      } else {
        setLoadingMore(false)
      }
    }
  }, [limit, dispatch])

  // Load more function
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    const nextPage = currentPage + 1
    setCurrentPage(nextPage)
    loadConversations(nextPage, true)
  }, [loadingMore, hasMore, currentPage, loadConversations])

  // Initial load conversations
  useEffect(() => {
    setCurrentPage(1)
    setHasMore(true)
    loadConversations(1, false)
  }, [loadConversations])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasMore && !loadingMore && !loading) {
          loadMore()
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '50px', // Trigger khi còn cách 50px tới cuối
        threshold: 0.1
      }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [hasMore, loadingMore, loading, loadMore])

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

  //socket: message:new
  useEffect(() => {
    if (loading || socketRef.current) return
    const s = io(API_ROOT, { withCredentials: true })
    socketRef.current = s

    // Khi connect, join tất cả room có sẵn
    s.on('connect', () => {
      try {
        (conversationList || []).forEach(c => {
          const id = extractId(c)
          if (id && !joinedRef.current.has(id)) {
            s.emit('conversation:join', { conversationId: id })
            joinedRef.current.add(id)
          }
        })
      } catch {}
    })

    const onNewMessage = (payload) => {
      const convId = extractId(
        payload?.conversationId || payload?.conversation?._id || payload?.conversation
      )
      if (!convId) return
      const msg = payload?.message || payload

      setConversationList(prev => {
        const idx = prev.findIndex(c => extractId(c) === convId)
        if (idx === -1) {
          // (tuỳ bạn) có thể fetch lại 1 lần nếu chưa có conv
          return prev
        }
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
    }

    s.on('message:new', onNewMessage)
    return () => {
      s.off('message:new', onNewMessage)
      s.disconnect()
      socketRef.current = null
      joinedRef.current.clear()
    }
  }, [loading])

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
    } catch {}
  }, [conversationList])

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

      {/* Conversation List với Infinite Scroll */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {currentView === 'chat' && (
          <div className="space-y-1 p-2">
            {/* Initial loading skeleton */}
            {loading && conversationList.length === 0 ? (
              <>
                <SkeletonConversation />
                <SkeletonConversation />
                <SkeletonConversation />
              </>
            ) : (
              <>
                {/* Render conversation list */}
                {conversationList.map((conversation) => {
                  const id = extractId(conversation)
                  const isActive = activeIdFromURL === id
                  return (
                    <ConversationListItem
                      key={id}
                      conversation={conversation}
                      usersById={usersById}
                      isActive={isActive}
                      getLastMessageText={getLastMessageText}
                      onClick={() => handleClickConversation(conversation)}
                    />
                  )
                })}

                {/* Load more trigger element */}
                {hasMore && (
                  <div
                    ref={loadMoreRef}
                    className="flex justify-center py-4"
                  >
                    {loadingMore ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Đang tải thêm...</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Scroll để tải thêm
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!loading && conversationList.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có cuộc trò chuyện nào</p>
                  </div>
                )}
              </>
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
