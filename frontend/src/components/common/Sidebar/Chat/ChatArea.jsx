// ChatArea.jsx
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
// Optional
import { MessageBubble } from './MessageBubble'
import { formatChip, groupByDay } from '@/utils/helper'
import { useCloudChat } from '@/hooks/useCloudChat'

export function ChatArea({
  mode = 'direct',
  conversation = {},
  messages = [],
  onSendMessage,
  onSendFriendRequest, // <-- thêm callback nếu cần
  loading,
  sending
}) {
  const [messageText, setMessageText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const isCloud = mode === 'cloud' || conversation?.type === 'cloud'
  const isDirect = mode === 'direct' || !!conversation?.direct

  const safeName = conversation?.displayName ?? (isCloud ? 'Cloud Chat' : 'Conversation')
  const initialChar = safeName?.charAt(0)?.toUpperCase?.() || 'C'

  const mediaItems = [
    { id: 1, url: 'http://localhost:5173/381.jpg' },
    { id: 2, url: 'http://localhost:5173/382.jpg' },
    { id: 3, url: 'http://localhost:5173/383.jpg' },
    { id: 4, url: 'https://res.cloudinary.com/dfcnz3uuh/image/upload/v1753625197/card-covers/tyi8xnnrzpyie07uzced.png' },
    { id: 5, url: 'https://picsum.photos/120/80?random=5' },
    { id: 6, url: 'https://picsum.photos/120/80?random=6' }
  ]

  const links = [
    {
      title: 'Property Details 01 || Homelenggo - Real...',
      url: 'homelenggonetjs.vercel.app',
      date: '29/08'
    },
    {
      title: 'Home || Homelenggo - Real Estate React...',
      url: 'homelenggonetjs.vercel.app',
      date: '26/08'
    },
    {
      title: 'Zillow: Real Estate, Apartments, Mortg...',
      url: 'www.zillow.com',
      date: '26/08'
    }
  ]

  const getStatusColor = (online) =>
    online ? 'text-emerald-500' : 'text-muted-foreground'

  const togglePanel = () => setIsOpen(!isOpen)

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

              {/* Chấm online: chỉ hiện với direct, KHÔNG hiện với cloud */}
              {isDirect && !isCloud && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                  style={{
                    backgroundColor: conversation?.direct?.otherUser?.status?.isOnline
                      ? 'var(--status-online)'
                      : 'var(--status-offline)'
                  }}
                />
              )}
            </div>

            <div>
              <h2 className="font-semibold text-foreground">
                {safeName}
              </h2>

              {/* Trạng thái: ẩn với cloud */}
              {!isCloud && (
                <p className={`text-sm ${getStatusColor(conversation?.direct?.otherUser?.status?.isOnline)}`}>
                  {conversation?.direct?.otherUser?.status?.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <SearchIcon className="w-5 h-5" />
            </Button>

            {/* Call/Video: ẩn với cloud */}
            {!isCloud && (
              <>
                <Button variant="ghost" size="sm">
                  <Phone className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm">
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
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {/* “Gửi yêu cầu kết bạn”: hiện với direct khi CHƯA friend, ẩn với cloud */}
          {isDirect && !isCloud && !conversation?.friendShip && (
            <div className="flex items-center justify-between w-full p-3 border rounded-lg shadow-sm bg-card">
              <div className="flex items-center text-sm">
                <UserPlus className="w-4 h-4 mr-2" />
                <span>Gửi yêu cầu kết bạn tới người này</span>
              </div>

              <Button
                className="px-3 py-1 text-sm font-medium"
                onClick={() => onSendFriendRequest?.(conversation?.direct?.otherUser?._id)}
              >
                Gửi kết bạn
              </Button>
            </div>
          )}

          {/* Danh sách tin nhắn */}
          {messages.length === 0 && (
            <div className="text-center text-xs opacity-60 mt-10">
              {isCloud ? 'Chưa có ghi chú nào.' : 'Chưa có tin nhắn.'}
            </div>
          )}

          {groupByDay(messages).map((group, gi) => {
            const count = group.items.length
            const first = group.items[0]
            // Chip giữa (ngày hoặc giờ          ngày nếu chỉ 1 tin)
            return (
              <div key={group.key}>
                <div className="flex justify-center my-3">
                  <span className="px-3 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                    {formatChip(first.createdAt || first.timestamp, count)}
                  </span>
                </div>

                {group.items.map((m, mi) => {
                  const showAvatar = false
                  // chỉ bubble cuối ngày mới hiện meta (nếu >1 tin)
                  const showMeta = count > 1 && mi === count - 1

                  if (MessageBubble) {
                    return (
                      <MessageBubble
                        key={m.id || m._id || `${gi}-${mi}`}
                        message={{ ...m }}
                        showAvatar={showAvatar}
                        showMeta={showMeta}
                      />
                    )
                  }

                  // fallback bubble đơn giản
                  return (
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

      {/* Slide Panel - trượt từ phải vào */}
      <div
        className={`fixed flex flex-col top-0 right-0 h-full w-80 shadow-lg transform transition-transform duration-300 ease-in-out border-l ${isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-center p-4 border-b h-18">
          <h2 className="text-lg font-semibold">Conversation information</h2>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto pb-4">
          {/* User Profile */}
          <div className="p-6 text-center border-b">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              {conversation?.conversationAvatarUrl ?
                <Avatar className="w-20 h-20">
                  <AvatarImage src={conversation?.conversationAvatarUrl} />
                  <AvatarFallback>{initialChar}</AvatarFallback>
                </Avatar> : <span className="text-2xl font-bold text-white">{initialChar}</span>
              }
            </div>
            <div className="flex items-center justify-center mb-4">
              <h3 className="text-xl font-semibold">{safeName}</h3>
              <Edit size={16} className="ml-2 cursor-pointer" />
            </div>

            {/* Action buttons */}
            <div className="flex justify-center space-x-8 mb-4">
              <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
                <Bell size={24} className="mb-1" />
                <span className="text-xs">Turn off the notice</span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
                <Pin size={24} className="mb-1" />
                <span className="text-xs">Pin conversation</span>
              </button>
              <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
                <Users size={24} className="mb-1" />
                <span className="text-xs">Create a chat group</span>
              </button>
            </div>
          </div>

          {/* Schedule reminder */}
          {/* <div className="p-4 border-b">
            <div className="flex items-center text-gray-600 mb-2">
              <Clock size={18} className="mr-3" />
              <span className="text-sm">Danh sách nhắc hẹn</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Users size={18} className="mr-3" />
              <span className="text-sm">20 nhóm chung</span>
            </div>
          </div> */}

          <Accordion type="multiple" className="w-full" defaultValue = {["a", "b", "c", "d"]}>

            {/* Media Section */}
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

            {/* Files Section */}
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

            {/* Links Section */}
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

            {/* Privacy Settings */}
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
                    {/* <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        id="hide-chat"
                      />
                      <label
                        htmlFor="hide-chat"
                        className="flex items-center cursor-pointer"
                      >
                        <div className="w-10 h-6 bg-gray-300 rounded-full p-1 transition-colors duration-200">
                          <div className="w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200"></div>
                        </div>
                      </label>
                    </div> */}
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
    </div>
  )
}
