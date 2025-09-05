// import { useState, useRef, useEffect } from 'react'
// import { Phone, Video, MoreHorizontal, Search, Pin, Image, Smile, Mic, Send, Paperclip } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
// import { Badge } from '@/components/ui/badge'
// import { MessageBubble } from './MessageBubble'
// import { EmojiPicker } from './EmojiPicker'

// export function ChatArea({ chat, onSendMessage }) {
//   const [messageText, setMessageText] = useState('')
//   const [showEmojiPicker, setShowEmojiPicker] = useState(false)
//   const [isRecording, setIsRecording] = useState(false)
//   const messagesEndRef = useRef(null)
//   const inputRef = useRef(null)

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
//   }

//   useEffect(() => {
//     scrollToBottom()
//   }, [chat.messages])

//   const handleSendMessage = () => {
//     if (messageText.trim()) {
//       onSendMessage(messageText.trim())
//       setMessageText('')
//       setShowEmojiPicker(false)
//     }
//   }

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault()
//       handleSendMessage()
//     }
//   }

//   const handleEmojiSelect = (emoji) => {
//     setMessageText(prev => prev + emoji)
//     inputRef.current?.focus()
//   }

//   const handleVoiceRecord = () => {
//     setIsRecording(!isRecording)
//     // TODO: Implement voice recording
//   }

//   const getStatusColor = (status) => {
//     switch (status) {
//     case 'online': return { color: 'var(--status-online)' }
//     case 'away': return { color: 'var(--status-away)' }
//     case 'busy': return { color: 'var(--status-busy)' }
//     case 'offline': return { color: 'var(--status-offline)' }
//     default: return { color: 'var(--status-offline)' }
//     }
//   }

//   return (
//     <div className="flex flex-col h-full w-full bg-gradient-chat"> {/* thêm w-full */}
//       {/* Header */}
//       <div className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm border-b border-border shadow-soft">
//         <div className="flex items-center gap-3">
//           <div className="relative">
//             <Avatar className="w-10 h-10">
//               <AvatarImage src={chat.contact.avatar} />
//               <AvatarFallback>{chat.contact.name[0]}</AvatarFallback>
//             </Avatar>
//             <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
//               style={{
//                 backgroundColor: chat.contact.status === 'online' ? 'var(--status-online)' :
//                   chat.contact.status === 'away' ? 'var(--status-away)' :
//                     'var(--status-offline)'
//               }}></div>
//           </div>
//           <div>
//             <h2 className="font-semibold text-foreground">{chat.contact.name}</h2>
//             <p className={`text-sm ${getStatusColor(chat.contact.status)}`}>
//               {chat.contact.status === 'online' ? 'Đang hoạt động' :
//                 chat.contact.status === 'away' ? `Hoạt động ${chat.contact.lastSeen} trước` :
//                   `Hoạt động ${chat.contact.lastSeen} trước`}
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <Button variant="ghost" size="sm">
//             <Search className="w-5 h-5" />
//           </Button>
//           <Button variant="ghost" size="sm">
//             <Phone className="w-5 h-5" />
//           </Button>
//           <Button variant="ghost" size="sm">
//             <Video className="w-5 h-5" />
//           </Button>
//           <Button variant="ghost" size="sm">
//             <MoreHorizontal className="w-5 h-5" />
//           </Button>
//         </div>
//       </div>

//       {/* Messages Area */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-4">
//         {/* Pinned Messages */}
//         {chat.messages.some(m => m.isPinned) && (
//           <div className="bg-primary-light/20 rounded-lg p-3 mb-4">
//             <div className="flex items-center gap-2 text-primary mb-2">
//               <Pin className="w-4 h-4" />
//               <span className="text-sm font-medium">Tin nhắn đã ghim</span>
//             </div>
//             {chat.messages.filter(m => m.isPinned).map(message => (
//               <div key={message.id} className="text-sm text-foreground/80">
//                 {message.text}
//               </div>
//             ))}
//           </div>
//         )}

//         {/* Messages */}
//         {chat.messages.map((message, index) => {
//           const prevMessage = chat.messages[index - 1]
//           const showAvatar = !prevMessage || prevMessage.isOwn !== message.isOwn

//           return (
//             <MessageBubble
//               key={message.id}
//               message={message}
//               showAvatar={showAvatar}
//               contact={chat.contact}
//             />
//           )
//         })}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input Area */}
//       <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
//         <div className="flex items-end gap-2">
//           {/* Attachment */}
//           <Button variant="ghost" size="sm" className="shrink-0">
//             <Paperclip className="w-5 h-5" />
//           </Button>

//           {/* Image */}
//           <Button variant="ghost" size="sm" className="shrink-0">
//             <Image className="w-5 h-5" />
//           </Button>

//           {/* Input Container */}
//           <div className="flex-1 relative">
//             <Input
//               ref={inputRef}
//               value={messageText}
//               onChange={(e) => setMessageText(e.target.value)}
//               onKeyPress={handleKeyPress}
//               placeholder="Nhập tin nhắn..."
//               className="pr-12 bg-input border-input-border focus:border-input-focus"
//             />

//             {/* Emoji Button */}
//             <Button
//               variant="ghost"
//               size="sm"
//               onClick={() => setShowEmojiPicker(!showEmojiPicker)}
//               className="absolute right-2 top-1/2 transform -translate-y-1/2"
//             >
//               <Smile className="w-4 h-4" />
//             </Button>

//             {/* Emoji Picker */}
//             {showEmojiPicker && (
//               <div className="absolute bottom-full right-0 mb-2 z-50">
//                 <EmojiPicker onEmojiSelect={handleEmojiSelect} />
//               </div>
//             )}
//           </div>

//           {/* Voice/Send */}
//           {messageText.trim() ? (
//             <Button onClick={handleSendMessage} className="shrink-0">
//               <Send className="w-4 h-4" />
//             </Button>
//           ) : (
//             <Button
//               variant={isRecording ? 'destructive' : 'ghost'}
//               size="sm"
//               onClick={handleVoiceRecord}
//               className="shrink-0"
//             >
//               <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
//             </Button>
//           )}
//         </div>

//         {/* Recording indicator */}
//         {isRecording && (
//           <div className="flex items-center gap-2 mt-2 text-destructive">
//             <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
//             <span className="text-sm">Đang ghi âm...</span>
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }

import { useState, useRef, useEffect } from 'react'
import { Phone, Video, MoreHorizontal, Search, UserPlus, Image, Smile, Mic, Send, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageBubble } from './MessageBubble'
import { EmojiPicker } from './EmojiPicker'

export function ChatArea({ chat, onSendMessage }) {
  const [messageText, setMessageText] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chat.messages])

  const handleSendMessage = () => {
    if (messageText.trim()) {
      onSendMessage(messageText.trim())
      setMessageText('')
      setShowEmojiPicker(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji) => {
    setMessageText(prev => prev + emoji)
    inputRef.current?.focus()
  }

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording)
    // TODO: Implement voice recording
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return { color: 'var(--status-online)' }
      case 'away': return { color: 'var(--status-away)' }
      case 'busy': return { color: 'var(--status-busy)' }
      case 'offline': return { color: 'var(--status-offline)' }
      default: return { color: 'var(--status-offline)' }
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-gradient-chat"> {/* thêm w-full */}
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={chat.avatarUrl} />
              <AvatarFallback>{chat.username}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
              style={{
                backgroundColor: chat.status === 'online' ? 'var(--status-online)' :
                  chat.status === 'away' ? 'var(--status-away)' :
                    'var(--status-offline)'
              }}></div>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{chat.fullName}</h2>
            <p className={`text-sm ${getStatusColor(chat.status)}`}>
              {/* {chat.status && chat.status === 'online' ? 'Đang hoạt động' :
                chat.status === 'away' ? `Hoạt động ${chat.contact.lastSeen} trước` :
                  `Hoạt động ${chat.contact.lastSeen} trước`} */}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Nếu chưa là bạn bè thì hiển thị gửi lời mời kết bạn */}
        {!chat.friendShip && (
          <div className="flex items-center justify-between w-full p-3 border rounded-lg shadow-sm">
            {/* Icon + text */}
            <div className="flex items-center space-x-2 text-sm">
              <UserPlus className="w-4 h-4 mr-2" />
              <span>Gửi yêu cầu kết bạn tới người này</span>
            </div>

            {/* Button */}
            <Button className="px-3 py-1 text-sm font-medium">
              Gửi kết bạn
            </Button>

            {/* Menu dots */}
            {/* <button className="p-1 ml-2 rounded hover:bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="w-4 h-4 text-gray-500"
              >
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
              </svg>
            </button> */}
          </div>

        )}
        {/* Pinned Messages */}
        {/* {chat.messages.some(m => m.isPinned) && (
          <div className="bg-primary-light/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Pin className="w-4 h-4" />
              <span className="text-sm font-medium">Tin nhắn đã ghim</span>
            </div>
            {chat.messages.filter(m => m.isPinned).map(message => (
              <div key={message.id} className="text-sm text-foreground/80">
                {message.text}
              </div>
            ))}
          </div>
        )} */}

        {/* Messages */}
        {/* {chat.messages.map((message, index) => {
          const prevMessage = chat.messages[index - 1]
          const showAvatar = !prevMessage || prevMessage.isOwn !== message.isOwn

          return (
            <MessageBubble
              key={message.id}
              message={message}
              showAvatar={showAvatar}
              contact={chat.contact}
            />
          )
        })}
        <div ref={messagesEndRef} /> */}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card/80 backdrop-blur-sm border-t border-border">
        <div className="flex items-end gap-2">
          {/* Attachment */}
          <Button variant="ghost" size="sm" className="shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>

          {/* Image */}
          <Button variant="ghost" size="sm" className="shrink-0">
            <Image className="w-5 h-5" />
          </Button>

          {/* Input Container */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              className="pr-12 bg-input border-input-border focus:border-input-focus"
            />

            {/* Emoji Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
              <Smile className="w-4 h-4" />
            </Button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              </div>
            )}
          </div>

          {/* Voice/Send */}
          {messageText.trim() ? (
            <Button onClick={handleSendMessage} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant={isRecording ? 'destructive' : 'ghost'}
              size="sm"
              onClick={handleVoiceRecord}
              className="shrink-0"
            >
              <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
            </Button>
          )}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 mt-2 text-destructive">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
            <span className="text-sm">Đang ghi âm...</span>
          </div>
        )}
      </div>
    </div>
  )
}