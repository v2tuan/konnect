import { useState, useRef, useEffect } from 'react'
import {
  Phone, Video, MoreHorizontal, Search as SearchIcon, UserPlus,
  Image, Smile, Mic, Send, Paperclip
} from 'lucide-react'
import { Bell, Pin, Users, Edit, ExternalLink, Shield, EyeOff, TriangleAlert, Trash } from 'lucide-react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from "@/components/ui/switch"
import { MessageBubble } from './MessageBubble'
import { formatChip, groupByDay, pickPeerStatus } from '@/utils/helper'
import { usePresenceText } from '@/hooks/use-relative-time'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'
import CallModal from '../../Modal/CallModal'
import { useCallInvite } from '@/components/common/Modal/CallInvite'
import CreateGroupDialog from '../../Modal/CreateGroupModel'
import { submitFriendRequestAPI, updateFriendRequestStatusAPI } from '@/apis'

export function ChatArea({
  mode = 'direct',
  conversation = {},
  messages = [],
  onSendMessage,
  onSendFriendRequest,
  sending,
  onStartTyping,
  onStopTyping,
  othersTyping = false
}) {
  const [messageText, setMessageText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // trạng thái yêu cầu kết bạn
  const [friendReq, setFriendReq] = useState({
    sent: false,
    requestId: null,
    loading: false
  })

  // === Loại cuộc trò chuyện: dựa đúng vào conversation.type ===
  const type = conversation?.type || mode
  const isCloud = type === 'cloud'
  const isDirect = type === 'direct'
  const isGroup  = type === 'group'

  // === Dùng cho banner request friend (đúng key từ API mẫu) ===
  const otherUser = isDirect ? conversation?.direct?.otherUser : null
  const otherUserId = otherUser?._id || otherUser?.id || null
  // "không quá khắt khe": undefined hoặc false đều coi là chưa phải bạn
  const shouldShowFriendBanner = isDirect && !isCloud && !!otherUserId && (otherUser?.isFriend !== true)

  const handleSendFriendRequest = async () => {
    if (!otherUserId || friendReq.loading) return
    try {
      setFriendReq((s) => ({ ...s, loading: true }))
      const res = await submitFriendRequestAPI(otherUserId)
      const requestId =
        res?.data?.id || res?.data?._id || res?.id || res?._id || res?.data?.requestId || null
      setFriendReq({ sent: true, requestId, loading: false })
      // optional: gọi onSendFriendRequest?.(otherUserId)
    } catch (e) {
      setFriendReq((s) => ({ ...s, loading: false }))
    }
  }

  const handleCancelFriendRequest = async () => {
    if (!friendReq.requestId || friendReq.loading) return
    try {
      setFriendReq((s) => ({ ...s, loading: true }))
      await updateFriendRequestStatusAPI({ requestId: friendReq.requestId, action: 'delete' })
      setFriendReq({ sent: false, requestId: null, loading: false })
    } catch (e) {
      setFriendReq((s) => ({ ...s, loading: false }))
    }
  }

  const currentUser = useSelector(selectCurrentUser)

  const safeName = conversation?.displayName ?? (isCloud ? 'Cloud Chat' : 'Conversation')
  const initialChar = safeName?.charAt(0)?.toUpperCase?.() || 'C'
  const [call, setCall] = useState(null) // { mode: 'audio' | 'video' } | null

  const { ringing, startCall, cancelCaller, setOnOpenCall } = useCallInvite(currentUser?._id)

  useEffect(() => {
    setOnOpenCall((mode, acceptedAt) => setCall({ mode, acceptedAt }))
  }, [setOnOpenCall])

  // Danh sách người nhận chuông
  const toUserIds = isDirect
    ? [otherUserId].filter(Boolean)
    : ((conversation?.group?.members || [])
        .map(m => m?._id || m?.id)
        .filter(id => id && id !== currentUser?._id))

  const handleStartCall = (mode) => {
    if (!conversation?._id || toUserIds.length === 0) return
    startCall({
      conversationId: conversation._id,
      mode, // 'audio' | 'video'
      toUserIds,
      me:   { id: currentUser?._id, name: currentUser?.fullName, avatarUrl: currentUser?.avatarUrl },
      peer: isDirect
        ? { id: otherUserId, name: otherUser?.fullName, avatarUrl: otherUser?.avatarUrl }
        : { id: 'group', name: safeName, avatarUrl: conversation?.conversationAvatarUrl },
      onOpenCall: (m, acceptedAt) => setCall({ mode: m, acceptedAt })
    })
  }

  const mediaItems = [
    { id: 1, url: 'http://localhost:5173/381.jpg' },
    { id: 2, url: 'http://localhost:5173/382.jpg' },
    { id: 3, url: 'http://localhost:5173/383.jpg' },
    { id: 4, url: 'https://res.cloudinary.com/dfcnz3uuh/image/upload/v1753625197/card-covers/tyi8xnnrzpyie07uzced.png' },
    { id: 5, url: 'https://picsum.photos/120/80?random=5' },
    { id: 6, url: 'https://picsum.photos/120/80?random=6' }
  ]

  const links = [
    { title: 'Property Details 01 || Homelenggo - Real...', url: 'homelenggonetjs.vercel.app', date: '29/08' },
    { title: 'Home || Homelenggo - Real Estate React...', url: 'homelenggonetjs.vercel.app', date: '26/08' },
    { title: 'Zillow: Real Estate, Apartments, Mortg...', url: 'www.zillow.com', date: '26/08' }
  ]

  const togglePanel = () => setIsOpen(!isOpen)

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

  const handleSendMessage = () => {
    const value = messageText.trim()
    if (!value || sending) return
    onSendMessage?.(value)
    setMessageText('')
    setShowEmojiPicker(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  return (
    <div className="h-full flex">
      {/* Main */}
      <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ease-in-out ${isOpen ? 'mr-80' : 'mr-0'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm border-b border-border shadow-soft">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={conversation?.conversationAvatarUrl} />
                <AvatarFallback>{initialChar}</AvatarFallback>
              </Avatar>

              {isDirect && !isCloud && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                  style={dotStyle}
                />
              )}
            </div>

            <div>
              <h2 className="font-semibold text-foreground">{safeName}</h2>
              {!isCloud && (
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
        <div className="flex-1 min-h-0 overflow-y-auto relative py-4">
          {/* === STICKY BANNER TRÊN CÙNG === */}
          {shouldShowFriendBanner && (
            <div className="sticky top-0 z-20 border-b">
              <div className="pointer-events-none absolute -bottom-6 left-0 right-0 h-6 from-card to-transparent" />
              <div className="flex items-center justify-between w-full p-3 bg-card">
                <div className="flex items-center text-sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  {friendReq.sent ? (
                    <span>Bạn đã gửi yêu cầu kết bạn đến người này</span>
                  ) : (
                    <span>Gửi yêu cầu kết bạn tới người này</span>
                  )}
                </div>

                {friendReq.sent ? (
                  <Button
                    variant="outline"
                    className="px-3 py-1 text-sm font-medium"
                    disabled={friendReq.loading}
                    onClick={handleCancelFriendRequest}
                  >
                    Huỷ
                  </Button>
                ) : (
                  <Button
                    className="px-3 py-1 text-sm font-medium"
                    disabled={friendReq.loading}
                    onClick={handleSendFriendRequest}
                  >
                    Gửi kết bạn
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* danh sách tin nhắn */}
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

        {/* Input */}
        <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border shrink-0">
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="sm" className="shrink-0">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" className="shrink-0">
              <Image className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => onStartTyping?.()}
                onBlur={() => onStopTyping?.()}
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
            </div>

            {messageText.trim() ? (
              <Button onClick={handleSendMessage} className="shrink-0" disabled={sending}>
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant={isRecording ? 'destructive' : 'ghost'}
                size="sm"
                onClick={() => setIsRecording(v => !v)}
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
        </div>
      </div>

      {/* Slide Panel */}
      <div
        className={`fixed flex flex-col top-0 right-0 h-full w-80 shadow-lg transform transition-transform duration-300 ease-in-out border-l ${isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center p-4 border-b h-18">
          <h2 className="text-lg font-semibold">Conversation information</h2>
        </div>

        <div className="flex-1 overflow-y-auto pb-4">
          <div className="p-6 text-center border-b">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              {conversation?.conversationAvatarUrl ? (
                <Avatar className="w-20 h-20">
                  <AvatarImage src={conversation?.conversationAvatarUrl} />
                  <AvatarFallback>{initialChar}</AvatarFallback>
                </Avatar>
              ) : (
                <span className="text-2xl font-bold text-white">{initialChar}</span>
              )}
            </div>
            <div className="flex items-center justify-center mb-4">
              <h3 className="text-xl font-semibold">{safeName}</h3>
              <Edit size={16} className="ml-2 cursor-pointer" />
            </div>

            <div className="flex justify-center space-x-8 mb-4">
              <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
                <Bell size={24} className="mb-1" />
                <span className="text-xs">Turn off the notice</span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
                <Pin size={24} className="mb-1" />
                <span className="text-xs">Pin conversation</span>
              </button>
              <CreateGroupDialog/>
            </div>
          </div>

          <Accordion type="multiple" className="w-full" defaultValue={["a", "b", "c", "d"]}>
            <AccordionItem value="a">
              <AccordionTrigger className="text-base p-4">Ảnh/Video</AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {mediaItems.slice(0, 6).map((item) => (
                      <div key={item.id} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={item.url}
                          alt={`Media ${item.id}`}
                          className="w-full h-full object-cover hover:opacity-80 cursor-pointer transition-opacity"
                        />
                      </div>
                    ))}
                  </div>
                  <Button variant={"ghost"} className="w-full text-center text-blue-600 text-sm py-2 hover:bg-accent rounded transition-colors">
                    Xem tất cả
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="b">
              <AccordionTrigger className="text-base p-4">File</AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4">
                  <div className="text-center py-6">
                    <p className="text-sm">Chưa có file nào</p>
                  </div>
                  <Button variant={"ghost"} className="w-full text-center text-blue-600 text-sm py-2 rounded transition-colors">
                    Xem tất cả
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="c">
              <AccordionTrigger className="text-base p-4">Link</AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4">
                  <div className="space-y-3 mb-3">
                    {links.map((link, index) => (
                      <div key={index} className="flex items-start p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                        <ExternalLink size={16} className="mt-1 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{link.title}</p>
                          <p className="text-xs text-blue-600 truncate">{link.url}</p>
                        </div>
                        <span className="text-xs flex-shrink-0 ml-2">{link.date}</span>
                      </div>
                    ))}
                  </div>
                  <Button variant={"ghost"} className="w-full text-center text-blue-600 text-sm py-2 rounded transition-colors">
                    Xem tất cả
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="d">
              <AccordionTrigger className="text-base p-4">Thiết lập bảo mật</AccordionTrigger>
              <AccordionContent>
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Shield size={18} className="mr-3" />
                      <div>
                        <p className="text-sm font-medium">Tin nhắn tự xóa</p>
                        <p className="text-xs">Không bao giờ</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <EyeOff size={18} className="mr-3" />
                      <span className="text-sm font-medium">Ẩn trò chuyện</span>
                    </div>
                    <Switch id="airplane-mode"
                      className="
                        data-[state=checked]:bg-primary
                        data-[state=unchecked]:bg-muted-foreground
                      "
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="p-4 border-t">
            <div className="flex items-centers mb-2">
              <TriangleAlert size={18} className="mr-3" />
              <span className="text-sm">Báo xấu</span>
            </div>
            <div className="flex items-center text-destructive">
              <Trash size={18} className="mr-3" />
              <span className="text-sm">Xóa lịch sử trờ chuyện</span>
            </div>
          </div>
        </div>
      </div>

      {ringing && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 bg-card border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
          <img
            src={ringing.peer?.avatarUrl}
            alt=""
            className="w-10 h-10 rounded-full object-cover"
          />
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

      {/* modal call */}
      {call && (
        <CallModal
          open={!!call}
          onOpenChange={(o) => setCall(o ? call : null)}
          conversationId={conversation?._id}
          currentUserId={currentUser?._id}
          initialMode={call.mode}
          callStartedAt={call.acceptedAt}
        />
      )}
    </div>
  )
}
