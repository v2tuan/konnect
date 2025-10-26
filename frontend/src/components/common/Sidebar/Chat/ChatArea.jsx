import { submitFriendRequestAPI, updateFriendRequestStatusAPI } from '@/apis'
import { muteConversation, unmuteConversation } from "@/apis/index.js"
import { useTheme } from '@/components/theme-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePresenceText } from '@/hooks/use-relative-time'
import { useCallInvite } from '@/hooks/useCallInvite'
import { selectCurrentUser } from '@/redux/user/userSlice'
import { useMuteStore } from "@/store/useMuteStore"
import { formatChip, groupByDay, pickPeerStatus } from '@/utils/helper'
import EmojiPicker from 'emoji-picker-react'
import {
  Archive,
  AudioLines,
  File,
  FileSpreadsheet,
  FileText,
  Image,
  LoaderCircle,
  Check,
  Mic,
  MoreHorizontal,
  Music,
  Paperclip,
  Phone,
  Reply,
  Search as SearchIcon,
  Send,
  Smile,
  UserPlus,
  Video,
  X
} from 'lucide-react'
import { use, useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import CallModal from '../../Modal/CallModal'
import { MessageBubble } from './MessageBubble'
import { io } from 'socket.io-client'
import ChatSidebarRight from './ChatSidebarRight'
import { set } from 'date-fns'

// ===== mention helpers (local, không đụng file khác) =====
const reEscape = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")

function buildMentionRegex(candidates = []) {
  const names = candidates
    .map(c => (c.fullName || c.username || c.name || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length) // ưu tiên tên dài hơn
    .map(reEscape)
  if (!names.length) return null
  // Tìm "@Tên Có Khoảng Trắng" nguyên vẹn, không ăn chữ sau cùng (word-boundary)
  return new RegExp(`@(?:${names.join("|")})(?=\\b)`, "g")
}

function findMentions(text = "", mentionRe) {
  if (!mentionRe) return []
  const out = []
  let m
  while ((m = mentionRe.exec(text)) !== null) {
    const raw = m[0] // "@Duy 36"
    out.push({
      raw,
      name: raw.slice(1), // "Duy 36"
      start: m.index,
      end: m.index + raw.length
    })
  }
  return out
}

// Render HTML highlight cho lớp overlay input:
// - vẫn hiển thị '@'
// - tô xanh toàn bộ phần TÊN (không chỉ chữ sát '@')
function highlightInputHTML(text = "", mentions = []) {
  if (!mentions.length) return text.replace(/\n/g, "<br/>")
  let html = ""
  let i = 0
  for (const mt of mentions) {
    html += text.slice(i, mt.start)
    const at = text[mt.start] // '@'
    const name = text.slice(mt.start + 1, mt.end)
    html += `${at}<span class="text-primary font-medium underline decoration-transparent">${name}</span>`
    i = mt.end
  }
  html += text.slice(i)
  return html.replace(/\n/g, "<br/>")
}

export function ChatArea({
  mode = 'direct',
  conversation = {},
  messages = [],
  onSendMessage,
  sending,
  onStartTyping,
  onStopTyping,
  othersTyping = false,
  onLoadOlder,
  hasMore = false
}) {
  const [messageText, setMessageText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const pickerRef = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)

  const { theme, systemTheme } = useTheme()
  const currentTheme = theme === "system" ? systemTheme : theme

  // ---------- @mention: state & refs (chỉ thêm) ----------
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(-1)
  const [mentionList, setMentionList] = useState([])
  const mentionListRef = useRef(null)
  // ------------------------------------------------------

  const [replyingTo, setReplyingTo] = useState({
    sender: 'Dang Duy',
    content: 'Nộp Project cuối kỳ lần 2Bài tập Opened: Thứ Bảy, 19 tháng 7 2025, 2:04 PM Due: Thứ Bảy, 4 tháng 10 2025, 12:45 PM Nộp các nội dung sau: 1. Danh sác...'
  })

  const handleCloseReply = () => {
    setReplyingTo(null)
  }

  useEffect(() => {
    setReplyingTo(null)
  }, [conversation?._id])

  // loại cuộc trò chuyện
  const type = conversation?.type || mode
  const isCloud = type === 'cloud'
  const isDirect = type === 'direct'
  const isGroup = type === 'group'

  // other user + friendship
  const otherUser = isDirect ? conversation?.direct?.otherUser : null
  const otherUserId = otherUser?._id || otherUser?.id || null
  const friendship = (otherUser && otherUser.friendship) || { status: 'none' }

  const [uiFriendship, setUiFriendship] = useState({
    status: 'none',
    direction: null,
    requestId: null
  })
  const [friendReq, setFriendReq] = useState({
    sent: false,
    requestId: null,
    loading: false
  })

  useEffect(() => {
    setUiFriendship({
      status: friendship?.status ?? 'none',
      direction: friendship?.direction ?? null,
      requestId: friendship?.requestId ?? null
    })
    const sentFromAPI = friendship?.status === 'pending' && friendship?.direction === 'outgoing'
    setFriendReq(s => ({
      ...s,
      sent: !!sentFromAPI,
      requestId: friendship?.requestId ?? null,
      loading: false
    }))
  }, [conversation?._id, otherUserId, friendship?.status, friendship?.direction, friendship?.requestId])

  // ✅ banner flags (giữ outgoing, thêm incoming)
  const shouldShowFriendBanner = isDirect && !!otherUserId && uiFriendship.status !== 'accepted'
  const outgoingSent = uiFriendship.status === 'pending' && uiFriendship.direction === 'outgoing'
  const isIncoming = uiFriendship.status === 'pending' && uiFriendship.direction === 'incoming'
  const otherName = otherUser?.fullName || otherUser?.username || 'Người dùng'

  // handlers friend request (giữ cũ + thêm incoming accept/decline)
  const handleSendFriendRequest = async () => {
    if (!otherUserId || friendReq.loading) return
    try {
      setFriendReq(s => ({ ...s, loading: true }))
      const res = await submitFriendRequestAPI(otherUserId)
      const requestId = res?.requestId || res?.data?.requestId || res?.data?._id || res?._id || null
      setUiFriendship({ status: 'pending', direction: 'outgoing', requestId })
      setFriendReq({ sent: true, requestId, loading: false })
    } catch (e) {
      setFriendReq(s => ({ ...s, loading: false }))
    }
  }

  const handleCancelFriendRequest = async () => {
    const rid = uiFriendship.requestId
    if (!rid || friendReq.loading) return
    try {
      setFriendReq(s => ({ ...s, loading: true }))
      // optimistic
      setUiFriendship({ status: 'none', direction: null, requestId: null })
      setFriendReq(s => ({ ...s, sent: false }))
      await updateFriendRequestStatusAPI({ requestId: rid, action: 'delete' })
      setFriendReq({ sent: false, requestId: null, loading: false })
    } catch (e) {
      // rollback
      setUiFriendship({ status: 'pending', direction: 'outgoing', requestId: rid })
      setFriendReq(s => ({ ...s, sent: true, loading: false }))
    }
  }

  // ✅ NEW: người nhận Accept / Decline
  const handleAcceptIncomingRequest = async () => {
    const rid = uiFriendship.requestId
    if (!rid || friendReq.loading) return
    try {
      setFriendReq(s => ({ ...s, loading: true }))
      await updateFriendRequestStatusAPI({ requestId: rid, action: 'accept' })
      setUiFriendship({ status: 'accepted', direction: null, requestId: rid })
      setFriendReq(s => ({ ...s, loading: false }))
    } catch (e) {
      setFriendReq(s => ({ ...s, loading: false }))
    }
  }

  const handleDeclineIncomingRequest = async () => {
    const rid = uiFriendship.requestId
    if (!rid || friendReq.loading) return
    try {
      setFriendReq(s => ({ ...s, loading: true }))
      await updateFriendRequestStatusAPI({ requestId: rid, action: 'delete' })
      setUiFriendship({ status: 'none', direction: null, requestId: null })
      setFriendReq({ sent: false, requestId: null, loading: false })
    } catch (e) {
      setFriendReq(s => ({ ...s, loading: false }))
    }
  }

  const currentUser = useSelector(selectCurrentUser)
  const safeName = conversation?.displayName ?? (isCloud ? 'Cloud Chat' : 'Conversation')
  const initialChar = safeName?.charAt(0)?.toUpperCase?.() || 'C'

  // presence (✅ gọn: chỉ định nghĩa 1 lần, tránh trùng biến)
  const usersById = useSelector(state => state.user.usersById || {})
  const { isOnline, lastActiveAt } = pickPeerStatus(conversation, usersById)
  const presenceText = usePresenceText({ isOnline, lastActiveAt })
  const tone =
    (presenceText || '').toLowerCase() === 'away'
      ? 'away'
      : (isOnline ? 'online' : 'offline')
  const presenceTextClass =
    tone === 'online' ? 'text-emerald-500'
      : tone === 'away' ? 'text-amber-500'
        : 'text-muted-foreground'
  const dotStyle = {
    backgroundColor:
      tone === 'online' ? 'var(--status-online)'
        : tone === 'away' ? 'var(--status-away)'
          : 'var(--status-offline)'
  }

  // gọi điện
  const [call, setCall] = useState(null)
  const { ringing, startCall, cancelCaller, setOnOpenCall } = useCallInvite(currentUser?._id)
  useEffect(() => {
    setOnOpenCall((conversationId, mode, acceptedAt, callId) => {
      setCall({ conversationId, mode, startedAt: acceptedAt, callId })
    })
  }, [setOnOpenCall])

  const toUserIds = isDirect
    ? [otherUserId].filter(Boolean)
    : ((conversation?.group?.members || [])
      .map(m => m?._id || m?.id)
      .filter(id => id && id !== currentUser?._id))

  const handleStartCall = (mode) => {
    if (!toUserIds.length) return
    const callId = `${conversation._id}:${Date.now()}`
    startCall({
      callId,
      conversationId: conversation._id,
      mode,
      toUserIds,
      me: {
        id: currentUser._id,
        name: currentUser.displayName || currentUser.username,
        avatarUrl: currentUser.avatarUrl
      },
      peer: otherUser ? {
        name: otherUser.displayName || otherUser.username,
        avatarUrl: otherUser.avatarUrl
      } : null
    })
  }

  const togglePanel = () => setIsOpen(!isOpen)

  const handleSendMessage = () => {
    const value = messageText.trim()
    if (!value || sending) return

    // map tên → id (nếu BE cần)
    const mapNameToId = new Map(
      mentionCandidates.map(u => [
        (u.fullName || u.username || u.name || "").trim(),
        (u.id || u._id)
      ])
    )
    const payloadMentions = mentions.map(m => ({
      userId: mapNameToId.get(m.name) || null,
      name: m.name,
      start: m.start,
      end: m.end
    }))

    onSendMessage?.({
      type: 'text',
      content: value,
      repliedMessage: replyingTo?.messageId || null,
      mentions: payloadMentions
    })

    setMessageText('')
    setShowEmojiPicker(false)
    setReplyingTo(null)
  }


  const handleSendAudioMessage = () => {
    if (!audioUrl || sending) return
    const blob = audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: "audio/webm" }) : null
    if (!blob) return
    onSendMessage?.({ type: 'audio', content: blob })
    setAudioUrl(null)
    audioChunksRef.current = []
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji
    const input = inputRef.current
    if (input) {
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newText = messageText.substring(0, start) + emoji + messageText.substring(end)
      setMessageText(newText)
      setTimeout(() => {
        input.focus()
        input.setSelectionRange(start + emoji.length, start + emoji.length)
      }, 0)
    }
  }
  const isMutedLocal = useMuteStore(s => s.isMuted(conversation?._id))
  const setMutedLocal = useMuteStore(s => s.setMuted)

  async function handleMute(duration) {
    if (!conversation?._id) return
    setMutedLocal(conversation._id, true) // optimistic
    try {
      await muteConversation(conversation._id, duration) // "forever" | 2 | 4 | 8 | 12 | 24
    } catch {
      setMutedLocal(conversation._id, false) // rollback
    }
  }

  async function handleUnmute() {
    if (!conversation?._id) return
    setMutedLocal(conversation._id, false)
    try { await unmuteConversation(conversation._id) }
    catch { setMutedLocal(conversation._id, true) }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target) && !(e.target).closest("button")) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const [loadingOlder, setLoadingOlder] = useState(false)
  const messagesContainerRef = useRef(null)
  const isLoadingOlderRef = useRef(false)
  const shouldScrollToBottomRef = useRef(true)

  // ✅ Lazy load older messages khi scroll lên top
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current
    if (!container || !onLoadOlder || isLoadingOlderRef.current) return

    // Khi scroll gần top (< 100px) và còn tin nhắn cũ
    if (container.scrollTop < 100 && hasMore) {
      isLoadingOlderRef.current = true
      setLoadingOlder(true)
      shouldScrollToBottomRef.current = false

      // Lưu vị trí scroll trước khi load
      const scrollTopBefore = container.scrollTop
      const scrollHeightBefore = container.scrollHeight

      try {
        const result = await onLoadOlder()

        // Đợi DOM update
        await new Promise(resolve => setTimeout(resolve, 50))

        // Giữ nguyên vị trí scroll
        if (container && result?.loadedCount > 0) {
          const scrollHeightAfter = container.scrollHeight
          const heightDiff = scrollHeightAfter - scrollHeightBefore
          container.scrollTop = scrollTopBefore + heightDiff
        }
      } catch (error) {
        console.error('Failed to load older messages:', error)
      } finally {
        setLoadingOlder(false)
        isLoadingOlderRef.current = false
      }
    }
  }, [hasMore, onLoadOlder])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // ✅ Detect user scroll position
  const handleUserScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
    shouldScrollToBottomRef.current = isAtBottom
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleUserScroll)
    return () => container.removeEventListener('scroll', handleUserScroll)
  }, [handleUserScroll])

  // ✅ Auto scroll to bottom only if user is at bottom
  useLayoutEffect(() => {
    if (shouldScrollToBottomRef.current && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 0)
    }
  }, [messages])

  // ✅ Force scroll to bottom when conversation changes
  useEffect(() => {
    shouldScrollToBottomRef.current = true
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [conversation?._id])

  const handleFileClick = () => fileRef.current?.click()
  const handleImageClick = () => imageRef.current?.click()

  const handleFileChange = (e) => {
    const files = e.target.files
    if (!files) return
    const fileArray = Array.from(files)
    onSendMessage?.({ type: 'file', content: fileArray })
    e.target.value = null
  }

  const handleImageChange = (e) => {
    const files = e.target.files
    if (!files) return
    const fileArray = Array.from(files)
    onSendMessage?.({ type: 'image', content: fileArray })
    e.target.value = null
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error accessing microphone", err)
    }
  }
  const socketRef = useRef(null)

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_WS_URL, { withCredentials: true })
    const s = socketRef.current
    if (conversation?._id) {
      s.emit('conversation:join', conversation._id)
    }
    const onMessageNew = (payload) => {
      if (!payload || payload.conversationId !== conversation?._id) return
      const t = payload.message?.type
      if (['image', 'video', 'audio', 'file'].includes(t)) {
        window.dispatchEvent(new CustomEvent('conversation-media:refresh', { detail: { conversationId: conversation._id, type: t } }))
      }
    }
    s.on('message:new', onMessageNew)
    return () => {
      s.off('message:new', onMessageNew)
      if (conversation?._id) s.emit('conversation:leave', conversation._id)
      s.disconnect()
    }
  }, [conversation?._id])
  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
    setIsRecording(false)
  }

  // ----- mention state -----
  const [mentions, setMentions] = useState([])
  const highlighterRef = useRef(null)

  // Ứng viên mention (chỉ với group)
  const mentionCandidates = (
    isGroup ? (conversation?.group?.members || []) : []
  ).filter(m => (m?.id || m?._id) && (m?.fullName || m?.username || m?.name))

  const mentionRe = useMemo(
    () => buildMentionRegex(mentionCandidates),
    [conversation?._id] // đủ để re-build khi đổi group
  )

  const recomputeMentions = useCallback((text) => {
    const found = findMentions(text, mentionRe)
    setMentions(found)
    if (highlighterRef.current) {
      highlighterRef.current.innerHTML = highlightInputHTML(text, found)
    }
  }, [mentionRe])

  useEffect(() => {
    setMentions([])
    if (highlighterRef.current) highlighterRef.current.innerHTML = ""
  }, [conversation?._id])

  useEffect(() => { recomputeMentions(messageText) }, [messageText, recomputeMentions])

  const typingTimerRef = useRef(null)
  // thời gian không gõ nữa thì gửi stop (ms)
  const TYPING_STOP_DELAY = 10000

  const emitTypingStart = useCallback(() => {
  // báo bắt đầu gõ
    onStartTyping?.()

    // reset timer; nếu trong vòng 2s không gõ nữa thì stop
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      onStopTyping?.()
      typingTimerRef.current = null
    }, TYPING_STOP_DELAY)
  }, [onStartTyping, onStopTyping])


  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main */}
      <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out ${isOpen ? 'mr-80' : 'mr-0'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-sidebar backdrop-blur-sm border-b border-border shadow-soft">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={conversation?.conversationAvatarUrl} />
                <AvatarFallback>{initialChar}</AvatarFallback>
              </Avatar>
              {isDirect && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background" style={dotStyle} />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{safeName}</h2>
              {!isCloud && !isGroup && (
                <p className={`text-sm ${presenceTextClass}`}>{presenceText}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <SearchIcon className="w-5 h-5" />
            </Button>

            {!isCloud && (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleStartCall('audio')}>
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleStartCall('video')}>
                  <Video className="w-5 h-5" />
                </Button>
              </>
            )}

            <Button variant="ghost" size="sm" onClick={togglePanel}>
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ✅ FRIEND REQUEST BANNER */}
        {shouldShowFriendBanner && (
          <div className="px-4 py-3 bg-primary/5 border-b border-primary/20">
            {/* Case 1: Chưa gửi lời mời */}
            {uiFriendship.status === 'none' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Gửi lời mời kết bạn đến người này
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleSendFriendRequest}
                  disabled={friendReq.loading}
                  className="h-8"
                >
                  {friendReq.loading ? (
                    <>
                      <LoaderCircle className="w-3 h-3 mr-1 animate-spin" />
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Thêm bạn bè
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Case 2: Đã gửi lời mời (outgoing) */}
            {outgoingSent && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LoaderCircle className="w-4 h-4 text-amber-500 animate-spin" />
                  <span className="text-sm">
                    Đã gửi lời mời kết bạn đến <strong>{otherName}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelFriendRequest}
                  disabled={friendReq.loading}
                  className="h-8"
                >
                  {friendReq.loading ? 'Đang hủy...' : 'Hủy lời mời'}
                </Button>
              </div>
            )}

            {/* Case 3: Nhận lời mời (incoming) */}
            {isIncoming && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">
                    <strong>{otherName}</strong> đã gửi lời mời kết bạn
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAcceptIncomingRequest}
                    disabled={friendReq.loading}
                    className="h-8"
                  >
                    <Check />
                    {friendReq.loading ? 'Đang xử lý...' : 'Accept'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeclineIncomingRequest}
                    disabled={friendReq.loading}
                    className="h-8"
                  >
                    <X/>
                    Decline
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative py-4"
        >
          {/* Loading indicator */}
          {loadingOlder && (
            <div className="flex justify-center py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
              <LoaderCircle className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No more messages */}
          {!hasMore && messages.length > 0 && (
            <div className="text-center text-xs text-muted-foreground py-2">
              Không còn tin nhắn cũ hơn
            </div>
          )}

          <div className="space-y-3 pt-2 px-4">
            {messages.length === 0 && (
              <div className="text-center text-xs opacity-60 mt-10">
                {isCloud ? 'Chưa có ghi chú nào.' : 'Chưa có tin nhắn.'}
              </div>
            )}

            {groupByDay(messages).map((group, gi) => {
              const count = group.items.length
              const first = group.items[0]
              return (
                <div key={group.key}>
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                      {formatChip(first.createdAt || first.timestamp, count)}
                    </span>
                  </div>

                  {group.items.map((m, mi) => {
                    const showAvatar = true
                    const showMeta = count > 1 && mi === count - 1
                    return MessageBubble ? (
                      <MessageBubble
                        key={m.id || m._id || `${gi}-${mi}`}
                        message={{ ...m }}
                        showAvatar={showAvatar}
                        showMeta={showMeta}
                        conversation={conversation}
                        setReplyingTo={setReplyingTo}
                      />
                    ) : (
                      <div
                        key={m.id || m._id || `${gi}-${mi}`}
                        className={`max-w-[75%] rounded-md border p-3 text-sm ${m.isOwn ? 'ml-auto bg-primary/10' : 'mr-auto bg-card'}`}
                      >
                        <div className="whitespace-pre-wrap">{m.text ?? m.body?.text}</div>
                        {showMeta && (
                          <div className="mt-1 text-[10px] opacity-60">
                            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
            {othersTyping && (
              <div className='flex items-end space-x-2 py-2 px-1 animate-fadeIn'>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={conversation?.direct?.otherUser?.avatarUrl} />
                </Avatar>

                <div className="relative p-3 rounded-lg bg-secondary text-gray-900 rounded-bl-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"
                          style={{
                            animationDelay: `${i * 200}ms`,
                            animationDuration: '1.4s',
                            animationTimingFunction: 'ease-in-out',
                            animationIterationCount: 'infinite'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </ div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-sidebar backdrop-blur-sm border-t border-border shrink-0">
          {/* Reply Preview Bar */}
          {replyingTo && (
            <div className="mb-3 bg-primary/5 border-l-4 border-primary rounded p-3 flex items-start justify-between">
              <div className="flex flex-1 items-center gap-3">
                {/* Thumbnail ảnh nếu có */}
                {replyingTo.media && (
                  <>
                    {(() => {
                      const images = replyingTo.media.filter(m => m.type === 'image')
                      const files = replyingTo.media.filter(m => m.type === 'file')
                      const audios = replyingTo.media.filter(m => m.type === 'audio')
                      if (images.length > 0) {
                        return (
                          <div className="flex-shrink-0">
                            <img
                              src={images[0]?.url}
                              alt="Preview"
                              className="w-12 h-12 rounded object-cover"
                            />
                          </div>
                        )
                      } else if (files.length > 0) {
                        const mimetype = files[0].metadata?.mimetype || ''
                        if (mimetype.includes('pdf')) {
                          return <FileText className="w-8 h-8 text-red-500" />
                        } else if (mimetype.includes('word') || mimetype.includes('document')) {
                          return <FileText className="w-8 h-8 text-blue-500" />
                        } else if (mimetype.includes('sheet') || mimetype.includes('excel')) {
                          return <FileSpreadsheet className="w-8 h-8 text-green-500" />
                        } else if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) {
                          return <Archive className="w-8 h-8 text-yellow-600" />
                        } else if (mimetype.includes('video')) {
                          return <Video className="w-8 h-8 text-purple-500" />
                        } else if (mimetype.includes('audio')) {
                          return <Music className="w-8 h-8 text-pink-500" />
                        } else {
                          return <File className="w-8 h-8 text-gray-500" />
                        }
                      } else if (audios.length > 0) {
                        return (
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <AudioLines className="w-6 h-6 text-muted-foreground" />
                            </div>
                          </div>
                        )
                      } else {
                        return null
                      }
                    })()}
                  </>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex text-sm font-semibold items-center gap-1">
                      <Reply className='h-4 w-4' /> Reply {replyingTo.sender}
                    </span>
                  </div>
                  <p className="text-xs truncate overflow-hidden whitespace-nowrap max-w-4xl">
                    {replyingTo.content}
                  </p>

                </div>
                <button
                  onClick={handleCloseReply}
                  className="ml-3 tion-colors flex-shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-end gap-2">
            <Input type="file" ref={fileRef} onChange={handleFileChange} className="hidden" />
            <Input type="file" ref={imageRef} onChange={handleImageChange} accept="image/*" className="hidden" multiple />

            <Button variant="ghost" size="sm" className="shrink-0" onClick={handleFileClick}>
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="shrink-0" onClick={handleImageClick}>
              <Image className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              {/* -------- overlay highlight cho @mention (không ảnh hưởng layout) -------- */}
              <div
                className="absolute inset-0 pointer-events-none px-3 py-2 text-sm leading-[1.25rem] whitespace-pre-wrap overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: highlightInputHTML(messageText, mentions)
                }}
              />

              <Input
                ref={inputRef}
                value={messageText}
                onChange={(e) => {
                  const v = e.target.value
                  setMessageText(v)

                  // báo đang gõ (debounce qua emitTypingStart đã khai báo bên ngoài)
                  emitTypingStart()

                  // gợi ý @mention chỉ khi là nhóm
                  if (conversation?.type !== 'group') { setMentionOpen(false); return }
                  const caret = e.target.selectionStart || v.length

                  // tìm token hiện tại (từ cuối lên đầu tới khi gặp space/newline)
                  let i = caret - 1
                  while (i >= 0 && v[i] !== ' ' && v[i] !== '\n') i--
                  const start = i + 1

                  if (v[start] !== '@') { setMentionOpen(false); return }

                  const q = v.slice(start + 1, caret).trim().toLowerCase()
                  const rawMembers = (conversation?.members || conversation?.group?.members || [])
                  const list = [
                    { id: '__ALL__', name: '@All' },
                    ...rawMembers.map(m => ({
                      id: String(m._id || m.id),
                      name: m.fullName || m.name || m.username || ''
                    }))
                  ].filter(m => !q ? true : (m.name || '').toLowerCase().includes(q))

                  setMentionList(list.slice(0, 8))
                  setMentionIndex(list.length ? 0 : -1)
                  setMentionOpen(list.length > 0)
                }}
                onKeyDown={(e) => {
                  // phím thường -> đang gõ
                  if (e.key !== 'Enter') {
                    emitTypingStart()
                  }

                  if (mentionOpen) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setMentionIndex(i => Math.min(i + 1, mentionList.length - 1))
                      return
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setMentionIndex(i => Math.max(i - 1, 0))
                      return
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const pick = mentionList[mentionIndex] || mentionList[0]
                      if (pick) {
                        const el = inputRef.current
                        const pos = el.selectionStart
                        let i = pos - 1
                        while (i >= 0 && messageText[i] !== ' ' && messageText[i] !== '\n') i--
                        const start = i + 1
                        const label = pick.id === '__ALL__' ? '@All' : `@${pick.name}`
                        const next = messageText.slice(0, start) + label + ' ' + messageText.slice(pos)
                        setMessageText(next)
                        setMentionOpen(false)
                        requestAnimationFrame(() => {
                          el.focus()
                          const newPos = start + label.length + 1
                          el.setSelectionRange(newPos, newPos)
                        })
                      }
                      return
                    }
                    if (e.key === 'Escape') {
                      setMentionOpen(false)
                      return
                    }
                  }

                  // Enter để gửi (không Shift)
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                onFocus={() => {
                  emitTypingStart()
                }}
                onBlur={() => {
                  if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
                  typingTimerRef.current = null
                  onStopTyping?.()
                }}
                placeholder={isCloud ? "Viết ghi chú..." : "Nhập tin nhắn..."}
                className="pr-12 text-transparent caret-foreground bg-transparent relative"
              />


              {/* nút emoji giữ nguyên */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-2 top-1/2 -translate-y-1/2"
                type="button"
              >
                <Smile className="w-4 h-4" />
              </Button>

              {showEmojiPicker && (
                <div ref={pickerRef} className="absolute bottom-12 right-0 z-50">
                  <EmojiPicker theme={currentTheme === "dark" ? "dark" : "light"} onEmojiClick={handleEmojiClick} />
                </div>
              )}

              {/* popup gợi ý mention (chỉ thêm) */}
              {mentionOpen && (
                <div
                  ref={mentionListRef}
                  className="absolute z-50 left-0 bottom-12 w-[280px] max-h-60 overflow-y-auto rounded-lg border bg-popover shadow-lg"
                >
                  {mentionList.map((u, idx) => (
                    <button
                      key={u.id || idx}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted ${idx === mentionIndex ? 'bg-muted' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        const el = inputRef.current
                        const pos = el.selectionStart
                        let i = pos - 1
                        while (i >= 0 && messageText[i] !== ' ' && messageText[i] !== '\n') i--
                        const start = i + 1
                        const label = u.id === '__ALL__' ? '@All' : `@${u.name}`
                        const next = messageText.slice(0, start) + label + ' ' + messageText.slice(pos)
                        setMessageText(next)
                        setMentionOpen(false)
                        requestAnimationFrame(() => {
                          el.focus()
                          const newPos = start + label.length + 1
                          el.setSelectionRange(newPos, newPos)
                        })
                      }}
                    >
                      {u.id === '__ALL__' ? (
                        <div className="w-8 h-8 grid place-items-center rounded-full bg-primary/10">＠</div>
                      ) : (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.id === '__ALL__' ? 'Gửi tất cả' : u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">@{u.id === '__ALL__' ? 'All' : u.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(messageText.trim() || sending) ? (
              <Button onClick={handleSendMessage} className="shrink-0" disabled={sending}>
                {sending ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            ) : (
              <Button
                variant={isRecording ? 'destructive' : 'ghost'}
                size="sm"
                onClick={isRecording ? stopRecording : startRecording}
                className="shrink-0"
                type="button"
              >
                <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
              </Button>
            )}
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 mt-2 text-destructive">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
              <span className="text-sm">Đang ghi âm...</span>
            </div>
          )}

          {audioUrl && (
            <div className="flex items-center space-x-2 p-2 bg-background rounded-md">
              <Button onClick={() => setAudioUrl(null)} className="shrink-0 p-2 bg-red-100 hover:bg-red-200 rounded-full">
                <X className="w-4 h-4 text-red-600" />
              </Button>
              <audio src={audioUrl} controls className="flex-1 h-8 outline-none" />
              <Button onClick={handleSendAudioMessage} className="shrink-0 p-2 bg-green-100 hover:bg-green-200 rounded-full" disabled={sending}>
                <Send className="w-4 h-4 text-green-600" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <ChatSidebarRight conversation={conversation} isOpen={isOpen} />

      {/* Call Ringing Banner */}
      {ringing && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 bg-card border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
          <img src={ringing.peer?.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          <div className="mr-4">
            <div className="text-sm font-semibold">{ringing.peer?.name}</div>
            <div className="text-xs text-muted-foreground">
              Đang gọi… còn {Math.ceil((ringing.leftMs || 0) / 1000)}s
            </div>
          </div>
          <Button size="sm" variant="destructive" onClick={() => cancelCaller(toUserIds)}>
            Hủy
          </Button>
        </div>
      )}

      {/* Call Modal */}
      {call && (
        <CallModal
          open={!!call}
          onOpenChange={(o) => setCall(o ? call : null)}
          conversationId={conversation?._id}
          currentUserId={currentUser?._id}
          initialMode={call.mode}
          callStartedAt={call.acceptedAt}
          callId={call.callId}
        />
      )}
    </div>
  )
}
