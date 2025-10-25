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
  Mic,
  MoreHorizontal,
  Music,
  Paperclip,
  Phone,
  Reply,
  Search as SearchIcon,
  Send,
  Smile,
  Video,
  X
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { MessageBubble } from './MessageBubble'
import { io } from 'socket.io-client'
import ChatSidebarRight from './ChatSidebarRight'

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
  // ==================== STATE ====================
  const [messageText, setMessageText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isOpen, setIsOpen] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
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

  // ==================== REFS ====================
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const pickerRef = useRef(null)
  const fileRef = useRef(null)
  const imageRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const socketRef = useRef(null)
  const isLoadingOlderRef = useRef(false)
  const shouldScrollToBottomRef = useRef(true)

  // ✅ NEW: Typing heartbeat
  const typingIntervalRef = useRef(null)
  const isInputFocusedRef = useRef(false)

  function startTypingHeartbeat() {
    if (typingIntervalRef.current) return
    onStartTyping?.() // bật ngay
    typingIntervalRef.current = setInterval(() => {
      onStartTyping?.()
    }, 4000) // 4s để giữ trạng thái trên server
  }

  function stopTypingHeartbeat() {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
      typingIntervalRef.current = null
    }
    onStopTyping?.()
  }

  // ==================== SELECTORS ====================
  const currentUser = useSelector(selectCurrentUser)
  const usersById = useSelector(state => state.user.usersById || {})
  const { theme, systemTheme } = useTheme()
  const currentTheme = theme === "system" ? systemTheme : theme

  // ==================== DERIVED STATE ====================
  const type = conversation?.type || mode
  const isCloud = type === 'cloud'
  const isDirect = type === 'direct'
  const isGroup = type === 'group'

  const otherUser = isDirect ? conversation?.direct?.otherUser : null
  const otherUserId = otherUser?._id || otherUser?.id || null
  const friendship = (otherUser && otherUser.friendship) || { status: 'none' }

  const safeName = conversation?.displayName ?? (isCloud ? 'Cloud Chat' : 'Conversation')
  const initialChar = safeName?.charAt(0)?.toUpperCase?.() || 'C'

  const { isOnline, lastActiveAt } = pickPeerStatus(conversation, usersById)
  const presenceText = usePresenceText({ isOnline, lastActiveAt })
  const tone = (presenceText || '').toLowerCase() === 'away' ? 'away' : (isOnline ? 'online' : 'offline')
  const presenceTextClass = tone === 'online' ? 'text-emerald-500' : tone === 'away' ? 'text-amber-500' : 'text-muted-foreground'
  const dotStyle = {
    backgroundColor: tone === 'online' ? 'var(--status-online)' : tone === 'away' ? 'var(--status-away)' : 'var(--status-offline)'
  }

  const toUserIds = isDirect
    ? [otherUserId].filter(Boolean)
    : ((conversation?.group?.members || []).map(m => m?._id || m?.id).filter(id => id && id !== currentUser?._id))

  const isMutedLocal = useMuteStore(s => s.isMuted(conversation?._id))
  const setMutedLocal = useMuteStore(s => s.setMuted)

  // ==================== CALL INVITE ====================
  const { ringing, startCall, cancelCaller } = useCallInvite(currentUser?._id)

  // ==================== FRIENDSHIP SYNC ====================
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

  // ==================== RESET REPLY ON CONVERSATION CHANGE ====================
  useEffect(() => {
    setReplyingTo(null)
    shouldScrollToBottomRef.current = true
  }, [conversation?._id])

  // ==================== SOCKET CONNECTION ====================
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
        window.dispatchEvent(new CustomEvent('conversation-media:refresh', {
          detail: { conversationId: conversation._id, type: t }
        }))
      }
    }

    s.on('message:new', onMessageNew)

    return () => {
      s.off('message:new', onMessageNew)
      if (conversation?._id) s.emit('conversation:leave', conversation._id)
      s.disconnect()
    }
  }, [conversation?._id])

  // ==================== SCROLL TO BOTTOM ====================
  useLayoutEffect(() => {
    if (shouldScrollToBottomRef.current && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 0)
    }
  }, [messages])

  // ==================== AUTO SCROLL TO BOTTOM ON INITIAL LOAD ====================
  useEffect(() => {
    shouldScrollToBottomRef.current = true
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [conversation?._id])

  // ==================== LAZY LOAD OLDER MESSAGES ====================
  const handleScroll = useCallback(async () => {
    const container = messagesContainerRef.current
    if (!container || !onLoadOlder || isLoadingOlderRef.current) return

    if (container.scrollTop < 100 && hasMore) {
      isLoadingOlderRef.current = true
      setLoadingOlder(true)
      shouldScrollToBottomRef.current = false

      const scrollTopBefore = container.scrollTop
      const scrollHeightBefore = container.scrollHeight

      try {
        const result = await onLoadOlder()

        await new Promise(resolve => setTimeout(resolve, 50))

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

  // ==================== DETECT USER SCROLL POSITION ====================
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

  // ==================== EMOJI PICKER OUTSIDE CLICK ====================
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target) && !e.target.closest("button")) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ==================== CLEANUP TYPING ON UNMOUNT ====================
  useEffect(() => {
    return () => {
      stopTypingHeartbeat()
    }
  }, [conversation?._id])

  // ==================== HANDLERS ====================
  const handleCloseReply = () => setReplyingTo(null)

  const togglePanel = () => setIsOpen(!isOpen)

  const handleSendMessage = () => {
    const value = messageText.trim()
    if (!value || sending) return

    // ❌ Không gọi onStopTyping ở đây để giữ trạng thái đang nhập khi vẫn còn focus
    onSendMessage?.({ type: 'text', content: value, repliedMessage: replyingTo?.messageId || null })
    setMessageText('')
    setShowEmojiPicker(false)
    setReplyingTo(null)

    setTimeout(() => {
      inputRef.current?.focus() // duy trì focus -> heartbeat tiếp tục
    }, 0)
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
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
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

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop())
    setIsRecording(false)
  }

  const handleStartCall = (callMode) => {
    if (!toUserIds.length) return
    const callId = `${conversation._id}:${Date.now()}`
    startCall({
      callId,
      conversationId: conversation._id,
      mode: callMode,
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
      setUiFriendship({ status: 'none', direction: null, requestId: null })
      setFriendReq(s => ({ ...s, sent: false }))
      await updateFriendRequestStatusAPI({ requestId: rid, action: 'delete' })
      setFriendReq({ sent: false, requestId: null, loading: false })
    } catch (e) {
      setUiFriendship({ status: 'pending', direction: 'outgoing', requestId: rid })
      setFriendReq(s => ({ ...s, sent: true, loading: false }))
    }
  }

  async function handleMute(duration) {
    if (!conversation?._id) return
    setMutedLocal(conversation._id, true)
    try {
      await muteConversation(conversation._id, duration)
    } catch {
      setMutedLocal(conversation._id, false)
    }
  }

  async function handleUnmute() {
    if (!conversation?._id) return
    setMutedLocal(conversation._id, false)
    try {
      await unmuteConversation(conversation._id)
    } catch {
      setMutedLocal(conversation._id, true)
    }
  }

  // ==================== TYPING HANDLERS (Focus-based) ====================
  const handleInputChange = (e) => {
    const value = e.target.value
    setMessageText(value)
  }

  const handleInputFocus = () => {
    isInputFocusedRef.current = true
    startTypingHeartbeat()
  }

  const handleInputBlur = () => {
    isInputFocusedRef.current = false
    stopTypingHeartbeat()
  }

  // ==================== RENDER ====================
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main Chat Area */}
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

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative py-4"
        >
          {loadingOlder && (
            <div className="flex justify-center py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
              <LoaderCircle className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

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
                    return (
                      <MessageBubble
                        key={m.id || m._id || `${gi}-${mi}`}
                        message={{ ...m }}
                        showAvatar={showAvatar}
                        showMeta={showMeta}
                        conversation={conversation}
                        setReplyingTo={setReplyingTo}
                      />
                    )
                  })}
                </div>
              )
            })}

            <div ref={messagesEndRef} />

            {/* Typing Indicator */}
            {othersTyping && (
              <div className='flex items-end space-x-2 py-2 px-1 animate-fadeIn'>
                <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                  <AvatarImage src={conversation?.direct?.otherUser?.avatarUrl} />
                  <AvatarFallback>
                    {conversation?.direct?.otherUser?.displayName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="relative px-4 py-3 rounded-2xl bg-muted/80 backdrop-blur-sm rounded-bl-sm">
                  <div className="flex items-center space-x-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-foreground/60 rounded-full"
                        style={{
                          animation: 'typing-dot 1.4s ease-in-out infinite',
                          animationDelay: `${i * 0.2}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-sidebar backdrop-blur-sm border-t border-border shrink-0">
          {/* Reply Preview */}
          {replyingTo && (
            <div className="mb-3 bg-primary/5 border-l-4 border-primary rounded p-3 flex items-start justify-between">
              <div className="flex flex-1 items-center gap-3">
                {replyingTo.media && (
                  <>
                    {(() => {
                      const images = replyingTo.media.filter(m => m.type === 'image')
                      const files = replyingTo.media.filter(m => m.type === 'file')
                      const audios = replyingTo.media.filter(m => m.type === 'audio')

                      if (images.length > 0) {
                        return (
                          <div className="flex-shrink-0">
                            <img src={images[0]?.url} alt="Preview" className="w-12 h-12 rounded object-cover" />
                          </div>
                        )
                      } else if (files.length > 0) {
                        const mimetype = files[0].metadata?.mimetype || ''
                        if (mimetype.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />
                        if (mimetype.includes('word') || mimetype.includes('document')) return <FileText className="w-8 h-8 text-blue-500" />
                        if (mimetype.includes('sheet') || mimetype.includes('excel')) return <FileSpreadsheet className="w-8 h-8 text-green-500" />
                        if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return <Archive className="w-8 h-8 text-yellow-600" />
                        if (mimetype.includes('video')) return <Video className="w-8 h-8 text-purple-500" />
                        if (mimetype.includes('audio')) return <Music className="w-8 h-8 text-pink-500" />
                        return <File className="w-8 h-8 text-gray-500" />
                      } else if (audios.length > 0) {
                        return (
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <AudioLines className="w-6 h-6 text-muted-foreground" />
                            </div>
                          </div>
                        )
                      }
                      return null
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

                <button onClick={handleCloseReply} className="ml-3 flex-shrink-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input Row */}
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
              <Input
                ref={inputRef}
                value={messageText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder={isCloud ? "Viết ghi chú..." : "Nhập tin nhắn..."}
                className="pr-12"
              />

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
                  <EmojiPicker
                    theme={currentTheme === "dark" ? "dark" : "light"}
                    onEmojiClick={(emojiData) => {
                      handleEmojiClick(emojiData)
                      setTimeout(() => inputRef.current?.focus(), 0)
                    }}
                  />
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
                <Mic className={`${isRecording ? 'animate-pulse' : ''} w-5 h-5`} />
              </Button>
            )}
          </div>

          {/* Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 mt-2 text-destructive">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
              <span className="text-sm">Đang ghi âm...</span>
            </div>
          )}

          {/* Audio Preview */}
          {audioUrl && (
            <div className="flex items-center space-x-2 p-2 bg-background rounded-md mt-2">
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

      {/* Typing animation CSS */}
      <style>{`
        @keyframes typing-dot {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
