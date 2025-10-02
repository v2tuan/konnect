/* eslint-disable no-empty */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'

import { deleteConversationAPI, getConversationByUserId, getConversations, leaveGroupAPI, searchUserByUsername } from '@/apis'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonConversation } from '../Skeleton/SkeletonConversation'

import { selectCurrentUser, upsertUsers } from '@/redux/user/userSlice'
import { formatTimeAgo, pickPeerStatus, extractId } from '@/utils/helper'
import { MessageCircle } from 'lucide-react'
import { usePresenceText } from '@/hooks/use-relative-time'
import { useUnreadStore } from '@/store/useUnreadStore'

// 🔌 socket chung
import { connectSocket, getSocket } from '@/lib/socket'
import { toast } from 'react-toastify'
import ConversationMenu from './ConversationMenu'

/* ========================= Helpers ========================= */

const glyphs = (s) => Array.from(String(s ?? ''))

const cut = (s, n) => {
  const g = glyphs(s)
  return g.length <= n ? s : g.slice(0, n).join('') + '…'
}

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

function ConversationListItem({
  conversation,
  usersById,
  isActive,
  unread = 0,
  onClick,
  lastMessageText,
  onDelete,
  onLeave,
  onPin,
  isPinned = false
}) {
  const id = extractId(conversation)

  const status = conversation.type === 'direct'
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

  const previewText = unread > 0
    ? `${unread > 99 ? '99+' : unread} tin nhắn mới`
    : lastMessageText

  return (
    <div
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
            <ConversationMenu
              conversationId={id}
              conversationType={conversation.type}
              onDelete={onDelete}
              onLeave={onLeave}
              onPin={onPin}
              isPinned={isPinned}
            />

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

  // unread state
  const unreadMap = useUnreadStore(s => s.map)
  const setUnread = useUnreadStore(s => s.setUnread)

  // refs
  const joinedRef = useRef(new Set())
  const listenersAttachedRef = useRef(false)

  // Scroll/Observer refs
  const scrollContainerRef = useRef(null)
  const loadMoreRef = useRef(null)
  const observerRef = useRef(null)

  /* ---------- Helpers cho LastMessageText ---------- */
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

  //option for conversation (pin or delete)
  const handleDeleteConversation = async (conversationId) => {
    try {
    // Hiển thị confirmation dialog
      const confirmed = window.confirm('Bạn có chắc chắn muốn xóa lịch sử cuộc trò chuyện này? Hành động này không thể hoàn tác.')

      if (!confirmed) return

      await deleteConversationAPI(conversationId, { action: 'delete' })

      // Cập nhật UI - xóa conversation khỏi danh sách NGAY LẬP TỨC
      setConversationList(prev => {
        console.log('Before filter:', prev.length) // Debug log
        const filtered = prev.filter(conv => {
          const convId = extractId(conv)
          const shouldKeep = convId !== conversationId
          if (!shouldKeep) {
            console.log('Removing conversation:', convId) // Debug log
          }
          return shouldKeep
        })
        console.log('After filter:', filtered.length) // Debug log
        return filtered
      })

      // Xóa unread count cho conversation này
      setUnread(conversationId, 0)

      toast.success('Đã xóa cuộc trò chuyện thành công')

      // Nếu đang xem conversation này, chuyển về trang chính
      if (activeIdFromURL === conversationId) {
        navigate('/')
      }

    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi xóa cuộc trò chuyện')
    }
  }

  const handlePinConversation = async (conversationId) => {
    try {
      const conversation = conversationList.find(conv => extractId(conv) === conversationId)
      const isPinned = conversation?.isPinned || false

      // TODO: Implement pin API when backend is ready
      // await pinConversationAPI(conversationId, isPinned)

      // Cập nhật UI tạm thời (local state)
      setConversationList(prev => prev.map(conv =>
        extractId(conv) === conversationId
          ? { ...conv, isPinned: !isPinned }
          : conv
      ))

      toast.success(`Đã ${isPinned ? 'bỏ ghim' : 'ghim'} cuộc trò chuyện`)

    } catch (error) {
      console.error('Error pinning conversation:', error)
      toast.error(error.message || 'Có lỗi xảy ra')
    }
  }

  const handleLeaveGroup = async (conversationId) => {
    try {
      const confirmed = window.confirm('Bạn có chắc chắn muốn rời khỏi nhóm này?')

      if (!confirmed) return

      // TODO: Implement leave group API
      await leaveGroupAPI(conversationId, { action: 'leave' })

      // Xóa conversation khỏi danh sách
      setConversationList(prev => prev.filter(conv => extractId(conv) !== conversationId))

      // Xóa unread count
      setUnread(conversationId, 0)

      toast.success('Đã rời khỏi nhóm thành công')

      // Nếu đang xem conversation này, chuyển về trang chính
      if (activeIdFromURL === conversationId) {
        navigate('/')
      }

    } catch (error) {
      console.error('Error leaving group:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi rời nhóm')
    }
  }

  //useEffect để lắng nghe event từ ChatSidebarRight
  useEffect(() => {
    const handleConversationDeletedFromOtherComponent = (event) => {
      const { conversationId } = event.detail

      // Cập nhật UI - xóa conversation khỏi danh sách
      setConversationList(prev => {
        console.log('External delete - Before filter:', prev.length)
        const filtered = prev.filter(conv => {
          const convId = extractId(conv)
          const shouldKeep = convId !== conversationId
          if (!shouldKeep) {
            console.log('External delete - Removing conversation:', convId)
          }
          return shouldKeep
        })
        console.log('External delete - After filter:', filtered.length)
        return filtered
      })

      // Xóa unread count
      setUnread(conversationId, 0)

      // Nếu đang xem conversation này, chuyển về trang chính
      if (activeIdFromURL === conversationId) {
        navigate('/')
      }
    }

    window.addEventListener('conversation:deleted', handleConversationDeletedFromOtherComponent)

    return () => {
      window.removeEventListener('conversation:deleted', handleConversationDeletedFromOtherComponent)
    }
  }, [activeIdFromURL, navigate, setUnread])

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

  /* =============== Socket wiring (dùng socket chung) =============== */

  // 1) đảm bảo kết nối socket khi đã có currentUser
  useEffect(() => {
    if (!currentUser?._id) return
    connectSocket(currentUser._id) // no-op nếu đã kết nối
  }, [currentUser?._id])

  // 2) gắn listener một lần + join rooms mỗi lần connect
  useEffect(() => {
    if (!initialLoaded || !currentUser?._id) return
    const s = getSocket()
    if (!s) return

    if (listenersAttachedRef.current) return
    listenersAttachedRef.current = true

    const joinAllRooms = () => {
      try {
        (conversationList || []).forEach(c => {
          const id = extractId(c)
          if (id && !joinedRef.current.has(id)) {
            s.emit('conversation:join', { conversationId: id })
            joinedRef.current.add(id)
          }
        })
      } catch {}
    }

    const onConnect = () => {
      joinAllRooms()
    }

    const onNewMessage = (payload) => {
      const convId = extractId(
        payload?.conversationId || payload?.conversation?._id || payload?.conversation
      )
      if (!convId) return
      const msg = payload?.message || payload

      // Cập nhật lastMessage & đẩy conv lên đầu
      setConversationList(prev => {
        const idx = prev.findIndex(c => extractId(c) === convId)
        if (idx === -1) {
          const draft = buildConvFromSocket(payload)
          try {
            if (!joinedRef.current.has(convId)) {
              s.emit('conversation:join', { conversationId: convId })
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

      // ⭐ Tăng unread nếu: không phải phòng đang mở & không phải mình gửi
      const myId = String(currentUser?._id || '')
      const senderId = String((msg.senderId && msg.senderId._id) || msg.senderId || '')
      const isMine = myId && senderId && myId === senderId

      if (convId !== activeIdFromURL && !isMine) {
        const curr = useUnreadStore.getState().map?.[convId] || 0
        setUnread(convId, curr + 1)
      }
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
          if (!joinedRef.current.has(convId)) {
            s.emit('conversation:join', { conversationId: convId })
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

    s.on('connect', onConnect)
    s.on('message:new', onNewMessage)
    s.on('conversation:created', onConversationCreated)
    s.on('conversation:member:added', onAddedToConversation)

    return () => {
      s.off('connect', onConnect)
      s.off('message:new', onNewMessage)
      s.off('conversation:created', onConversationCreated)
      s.off('conversation:member:added', onAddedToConversation)
      listenersAttachedRef.current = false
    }
  }, [initialLoaded, currentUser?._id, conversationList, activeIdFromURL, setUnread])

  // 3) Khi danh sách hội thoại đổi → đảm bảo đã join đủ (kể cả đang online)
  useEffect(() => {
    const s = getSocket()
    if (!s) return
    try {
      (conversationList || []).forEach(c => {
        const id = extractId(c)
        if (id && !joinedRef.current.has(id)) {
          s.emit('conversation:join', { conversationId: id })
          joinedRef.current.add(id)
        }
      })
    } catch {}
  }, [conversationList])

  // Lắng nghe event local (khi tạo hội thoại mới local)
  useEffect(() => {
    const s = getSocket()
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
          if (s && !joinedRef.current.has(convId)) {
            s.emit('conversation:join', { conversationId: convId })
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
      useUnreadStore.getState().setUnread(id, 0)
      navigate(`/chats/${id}`)
    } catch {}
  }

  const handleClickConversation = (conv) => {
    const id = extractId(conv)
    if (!id) return
    onViewChange?.('chat')
    useUnreadStore.getState().setUnread(id, 0)
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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M21 21l-4.3-4.3m1.8-4.7a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
            variant={isChatView ? 'default' : 'ghost'}
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

      {/* Conversation List với Infinite Scroll */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {isChatView && (
          <div className="space-y-1 p-2">
            {loadingConvs && conversationList.length === 0 ? (
              <>
                <SkeletonConversation />
                <SkeletonConversation />
                <SkeletonConversation />
              </>
            ) : (
              <>
                {conversationList.map((conversation) => {
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
                      lastMessageText={getLastMessageText(conversation)}
                      onClick={() => handleClickConversation(conversation)}
                      onDelete={handleDeleteConversation}
                      onLeave={handleLeaveGroup}
                      onPin={handlePinConversation}
                      isPinned={conversation.isPinned}
                    />
                  )
                })}

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
