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

/* ========================= Helpers ========================= */

const glyphs = (s) => Array.from(String(s ?? ''))

// cắt N ký tự (safe emoji)
const cut = (s, n) => {
  const g = glyphs(s)
  return g.length <= n ? s : g.slice(0, n).join('') + '…'
}

// Lấy N từ đầu, M ký tự/từ, và tối đa K ký tự toàn chuỗi
const previewWords = (raw = '', wordLimit = 8, maxTokenLen = 10, maxTotalLen = 40) => {
  const text = String(raw || '').trim()
  if (!text) return ''
  const tokens = text.split(/\s+/).map(t => {
    const g = glyphs(t)
    return g.length > maxTokenLen ? g.slice(0, maxTokenLen).join('') + '…' : t
  })
  let out = tokens.slice(0, wordLimit).join(' ')
  out = cut(out, maxTotalLen)
  return out
}

const buildConvFromSocket = (payload) => {
  const conv = payload?.conversation || {}
  const convId = extractId(conv) || extractId(payload?.conversationId)
  const msg = payload?.message || payload

  const type = conv.type || 'group'
  const displayName = conv.displayName || conv.name || conv.group?.name || 'New group'
  const conversationAvatarUrl =
    conv.conversationAvatarUrl || conv.avatarUrl || conv.group?.avatarUrl || ''

  return {
    _id: convId,
    id: convId,
    type,
    displayName,
    conversationAvatarUrl,
    group: conv.group || {
      members: conv.members || conv.groupMembers || []
    },
    lastMessage: msg
      ? {
          _id: msg._id || msg.id,
          textPreview: msg.body?.text ?? msg.text ?? '',
          senderId: msg.senderId || msg.sender?._id || msg.sender?.id,
          sender: msg.sender,
          createdAt: msg.createdAt || Date.now()
        }
      : null
  }
}

/* ===================== Item component ====================== */

function ConversationListItem({ conversation, usersById, isActive, onClick, getLastMessageText }) {
  const id = extractId(conversation)
  const status = conversation.direct
    ? pickPeerStatus(conversation, usersById)
    : { isOnline: false, lastActiveAt: null }

  const presenceTextRaw = usePresenceText({
    isOnline: status.isOnline,
    lastActiveAt: status.lastActiveAt
  })

  const tone =
    presenceTextRaw?.toLowerCase() === 'away'
      ? 'away'
      : status.isOnline
        ? 'online'
        : 'offline'

  const presenceDotClass =
    tone === 'online'
      ? 'bg-status-online bg-emerald-500'
      : tone === 'away'
        ? 'bg-status-away bg-amber-400'
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

          {conversation.type === 'direct' && (
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

/* ======================= Main component ===================== */

export function ChatSidebar({ currentView, onViewChange }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchList, setSearchList] = useState([])

  // Conversation state
  const [conversationList, setConversationList] = useState([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [limit] = useState(20)

  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()

  const currentUser = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const usersById = useSelector((state) => state.user.usersById || {})

  // Socket & room joined
  const socketRef = useRef(null)
  const joinedRef = useRef(new Set())

  // Scroll/Observer refs
  const scrollContainerRef = useRef(null)
  const loadMoreRef = useRef(null)
  const observerRef = useRef(null)

  /* =============== Helpers =============== */

  const getLastMessageText = useCallback(
    (conv) => {
      const lm = conv.lastMessage
      if (!lm || !lm.textPreview) return 'Chưa có tin nhắn'

      const body = previewWords(lm.textPreview, 8, 20, 40)
      const sid =
        typeof lm.senderId === 'object' ? lm.senderId?._id : lm.senderId

      if (sid && String(sid) === String(currentUser?._id)) {
        return `You: ${body}`
      }

      if (conv.type === 'group') {
        let senderName = lm.sender?.fullName || lm.sender?.username
        if (!senderName && Array.isArray(conv.group?.members)) {
          const m = conv.group.members.find(
            (u) => String(u.id || u._id) === String(sid)
          )
          senderName = m?.fullName || m?.username
        }
        if (senderName) return `${senderName}: ${body}`
      }
      return body
    },
    [currentUser?._id]
  )

  /* =============== Load conversations =============== */

  const loadConversations = useCallback(
    async (page = 1, isAppend = false) => {
      try {
        if (page === 1) setLoadingConvs(true)
        else setLoadingMore(true)

        const conversations = await getConversations(page, limit)
        const newConversations = conversations?.data || []

        setConversationList(prev => (isAppend ? [...prev, ...newConversations] : newConversations))

        setHasMore(newConversations.length === limit)

        const peers = newConversations
          .map((c) => c?.direct?.otherUser)
          .filter(Boolean)
        if (peers.length) dispatch(upsertUsers(peers))

        if (page === 1) setInitialLoaded(true)
      } catch (error) {
        console.error('Error loading conversations:', error)
        if (!isAppend) setConversationList([])
      } finally {
        if (page === 1) setLoadingConvs(false)
        else setLoadingMore(false)
      }
    },
    [limit, dispatch]
  )

  // Initial load
  useEffect(() => {
    setCurrentPage(1)
    setHasMore(true)
    loadConversations(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setCurrentPage(prev => {
      const nextPage = prev + 1
      loadConversations(nextPage, true)
      return nextPage
    })
  }, [loadingMore, hasMore, loadConversations])

  /* =============== IntersectionObserver =============== */

  const attachObserver = useCallback(() => {
    if (currentView !== 'chat') return
    const sentinel = loadMoreRef.current
    if (!sentinel) return
    if (loadingConvs) return

    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    const rootEl = scrollContainerRef.current || null
    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry && entry.isIntersecting && hasMore && !loadingMore) {
          loadMore()
        }
      },
      {
        root: rootEl,
        rootMargin: '80px',
        threshold: 0.1
      }
    )
    observerRef.current.observe(sentinel)
  }, [currentView, loadingConvs, hasMore, loadingMore, loadMore])

  useEffect(() => {
    attachObserver()
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [attachObserver])

  /* =============== Search (debounce) =============== */

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchList([])
      setLoadingSearch(false)
      onViewChange?.('chat')
      return
    }
    const controller = new AbortController()
    setLoadingSearch(true)
    const t = setTimeout(async () => {
      try {
        const data = await searchUserByUsername(searchQuery)
        setSearchList(data || [])
      } catch {
        setSearchList([])
      } finally {
        setLoadingSearch(false)
      }
    }, 500)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [searchQuery, onViewChange])

  /* =============== Socket wiring =============== */

  useEffect(() => {
    if (!initialLoaded || socketRef.current) return

    const s = io(API_ROOT, { withCredentials: true })
    socketRef.current = s

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
          const draft = buildConvFromSocket(payload)
          try {
            if (socketRef.current && !joinedRef.current.has(convId)) {
              socketRef.current.emit('conversation:join', { conversationId: convId })
              joinedRef.current.add(convId)
            }
          } catch {}
          return [draft, ...prev]
        }

        const old = prev[idx]
        const updated = {
          ...old,
          lastMessage: {
            _id: msg._id || msg.id,
            textPreview: msg.body?.text ?? msg.text ?? '',
            senderId: msg.senderId || msg.sender?._id || msg.sender?.id,
            sender: msg.sender,
            createdAt: msg.createdAt || Date.now()
          }
        }
        const next = [...prev]
        next.splice(idx, 1)
        return [updated, ...next]
      })
    }

    const onConversationCreated = (payload) => {
      const conversation = payload?.conversation
      if (!conversation) return
      const convId = extractId(conversation)
      if (!convId) return

      const currentUserId = currentUser?._id
      const isUserInConversation =
        conversation.type === 'group'
          ? conversation.group?.members?.some(
              (m) => String(m._id || m.id) === String(currentUserId)
            )
          : conversation.type === 'direct' &&
            (String(conversation.direct?.otherUser?._id) === String(currentUserId) ||
              String(conversation.direct?.user?._id) === String(currentUserId))

      if (!isUserInConversation) return

      setConversationList(prev => {
        if (prev.some(c => extractId(c) === convId)) return prev

        const newConv = {
          ...conversation,
          _id: convId,
          id: convId,
          displayName: conversation.displayName || conversation.name || 'New Conversation',
          conversationAvatarUrl: conversation.conversationAvatarUrl || conversation.avatarUrl || '',
          lastMessage: null
        }

        try {
          if (socketRef.current && !joinedRef.current.has(convId)) {
            socketRef.current.emit('conversation:join', { conversationId: convId })
            joinedRef.current.add(convId)
          }
        } catch {}

        return [newConv, ...prev]
      })
    }

    const onAddedToConversation = (payload) => {
      const conversation = payload?.conversation
      const addedUserId = payload?.userId
      if (!conversation || String(addedUserId) !== String(currentUser?._id)) return
      onConversationCreated(payload)
    }

    s.on('message:new', onNewMessage)
    s.on('conversation:created', onConversationCreated)
    s.on('conversation:member:added', onAddedToConversation)

    return () => {
      s.off('message:new', onNewMessage)
      s.off('conversation:created', onConversationCreated)
      s.off('conversation:member:added', onAddedToConversation)
      s.disconnect()
      socketRef.current = null
      joinedRef.current.clear()
    }
  }, [initialLoaded, currentUser?._id, conversationList])

  // Đảm bảo join đủ room khi list thay đổi
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

  // Lắng nghe sự kiện local
  useEffect(() => {
    const onLocalCreated = (e) => {
      const conversation = e?.detail?.conversation
      if (!conversation) return
      const convId = extractId(conversation)
      if (!convId) return

      setConversationList(prev => {
        if (prev.some(c => extractId(c) === convId)) return prev

        const newConv = {
          ...conversation,
          _id: convId,
          id: convId,
          displayName: conversation.displayName || conversation.name || 'New Conversation',
          conversationAvatarUrl:
            conversation.conversationAvatarUrl || conversation.avatarUrl || '',
          lastMessage: null
        }

        try {
          if (socketRef.current && !joinedRef.current.has(convId)) {
            socketRef.current.emit('conversation:join', { conversationId: convId })
            joinedRef.current.add(convId)
          }
        } catch {}

        return [newConv, ...prev]
      })
    }
    window.addEventListener('local:conversation:created', onLocalCreated)
    return () => window.removeEventListener('local:conversation:created', onLocalCreated)
  }, [])

  /* =============== Actions =============== */

  const handleClickUser = async (userId) => {
    try {
      const conversation = await getConversationByUserId(userId)
      const id = extractId(conversation?.data)
      if (!id) return
      onViewChange?.('chat')
      navigate(`/chats/${id}`)
    } catch {}
  }

  const handleClickConversation = (conv) => {
    const id = extractId(conv)
    if (!id) return
    onViewChange?.('chat')
    navigate(`/chats/${id}`)
  }

  /* ======================= Render ======================= */

  const isChatView = currentView === 'chat'
  const isSearchView = currentView === 'search'

  return (
    <div className="h-full flex flex-col">
      {/* Header: Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
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
            variant={isChatView ? 'default' : 'ghost'}
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
      {isSearchView && loadingSearch && (
        <>
          <SkeletonConversation />
          <SkeletonConversation />
          <SkeletonConversation />
          <SkeletonConversation />
          <SkeletonConversation />
        </>
      )}

      {/* Kết quả search */}
      {isSearchView && !loadingSearch && (
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
                      {user.fullName || ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Conversation List với Infinite Scroll */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isChatView && (
          <div className="space-y-1 p-2">
            {/* Initial loading skeleton */}
            {loadingConvs && conversationList.length === 0 ? (
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
                  <div ref={loadMoreRef} className="flex justify-center py-4">
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
                {!loadingConvs && conversationList.length === 0 && (
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
