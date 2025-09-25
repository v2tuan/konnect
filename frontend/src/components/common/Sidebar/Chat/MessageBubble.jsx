import { useMemo, useState } from 'react'
import {
  Pin, Reply, MoreHorizontal, Heart, Clock, Check, CheckCheck
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function pickSender(conversation, message, contact) {
  if (message?.sender) {
    const s = message.sender
    return {
      id: s.id || s._id || message.senderId || null,
      fullName: s.fullName || s.username || contact?.name || 'User',
      username: s.username || null,
      avatarUrl: s.avatarUrl || null
    }
  }

  // 2) Tìm trong group members
  const sid = message?.senderId
  const mems = conversation?.group?.members
  if (sid && Array.isArray(mems) && mems.length) {
    const m = mems.find(u => String(u.id || u._id) === String(sid))
    if (m) {
      return {
        id: m.id || m._id,
        fullName: m.fullName || m.username || contact?.name || 'User',
        username: m.username || null,
        avatarUrl: m.avatarUrl || null
      }
    }
  }

  // 3) Direct fallback (otherUser)
  const other = conversation?.direct?.otherUser
  if (other && String(other.id || other._id) === String(sid)) {
    return {
      id: other.id || other._id,
      fullName: other.fullName || other.username || contact?.name || 'User',
      username: other.username || null,
      avatarUrl: other.avatarUrl || null
    }
  }

  // 4) Cuối cùng dùng contact
  return {
    id: sid || null,
    fullName: contact?.name || 'User',
    username: contact?.username || null,
    avatarUrl: contact?.avatarUrl || null
  }
}

export function MessageBubble({ message, showAvatar, contact, showMeta = true, conversation }) {
  const [hovered, setHovered] = useState(false)
  const isOwn = !!message?.isOwn
  const isGroup = conversation?.type === 'group'

  const sender = useMemo(
    () => pickSender(conversation, message, contact),
    [conversation, message, contact]
  )

  const formatTime = (ts) => {
    if (!ts) return ''
    try {
      const d = typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) : ts
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  const StatusIcon = () => {
    if (!isOwn) return null
    const s = message.status || message.deliveryStatus
    if (s === 'sending') return <Clock className="w-3 h-3 opacity-70" />
    if (s === 'read') return <CheckCheck className="w-3.5 h-3.5 opacity-70" />
    return <Check className="w-3.5 h-3.5 opacity-70" />
  }

  return (
    <div
      className={`flex gap-2 mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar bên trái cho tin nhắn của người khác */}
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={isGroup ? sender?.avatarUrl : conversation?.direct?.otherUser?.avatarUrl} />
          <AvatarFallback>
            {(isGroup ? sender?.fullName : contact?.name)?.charAt?.(0) ?? 'U'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`relative max-w-[70%] ${isOwn ? 'order-first' : ''}`}>
        {/* Tên người gửi (chỉ group + không phải của mình) */}
        {isGroup && !isOwn && (
          <div className="mb-1 ml-1 text-[11px] font-medium text-gray-500">
            {sender?.fullName || sender?.username || 'User'}
          </div>
        )}

        {/* Action bar nổi hai bên bubble */}
        <div
          className={`
            pointer-events-auto absolute top-1/2 -translate-y-1/2
            ${isOwn ? '-left-22' : '-right-22'}
            opacity-0 transition-opacity duration-150
            ${hovered ? 'opacity-100' : 'opacity-0'}
            flex items-center gap-1
          `}
        >
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Reply className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Heart className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </div>

        {/* Bubble */}
        {message.media || message.body?.media ? (
          (
            <>
              {/* Hiển thị media với layout thông minh */}
              <div className={`
  ${message.media.length === 1
              ? 'flex justify-center'
              : message.media.length === 2
                ? 'grid grid-cols-2 gap-2'
                : message.media.length <= 4
                  ? 'grid grid-cols-2 gap-2 max-w-md'
                  : 'grid grid-cols-3 gap-2 max-w-lg'
            }
`}>
                {message.media.map((m, index) => (
                  <div key={index} className="relative">
                    {message.isPinned && (
                      <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500 z-10" />
                    )}
                    <img
                      src={m.url ?? message.body?.media?.url}
                      alt="message attachment"
                      className={`
          rounded-lg shadow-md object-cover
          ${message.media.length === 1
                    ? 'max-w-sm max-h-96 w-full' // Ảnh đơn: hiển thị lớn
                    : message.media.length === 2
                      ? 'w-full h-32 sm:h-40' // 2 ảnh: vừa phải
                      : message.media.length <= 4
                        ? 'w-full h-24 sm:h-32' // 3-4 ảnh: nhỏ hơn
                        : 'w-full h-20 sm:h-24' // 5+ ảnh: rất nhỏ
                  }
          hover:shadow-lg transition-shadow duration-200 cursor-pointer
        `}
                      onClick={() => {
                        // Có thể thêm function để mở ảnh full size
                        // openImageModal(m.url ?? message.body?.media?.url);
                      }}
                    />

                    {/* Hiển thị số thứ tự nếu có nhiều hơn 5 ảnh */}
                    {/* {message.media.length > 5 && (
                      <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                        {index + 1}
                      </div>
                    )} */}
                  </div>
                ))}
              </div>

              {/* Reactions - hiển thị bên ngoài container ảnh */}
              {Array.isArray(message.reactions) && message.reactions.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {message.reactions.map((reaction, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {reaction.emoji} {reaction.count}
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )
        ) : (
          // Nếu là text thì render bubble
          <div
            className={`
      relative p-3 rounded-lg
      ${isOwn
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
          }
    `}
          >
            {message.isPinned && (
              <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500" />
            )}

            <p className="text-sm whitespace-pre-wrap break-words">
              {message.text ?? message.body?.text ?? ''}
            </p>

            {Array.isArray(message.reactions) && message.reactions.length > 0 && (
              <div className="flex gap-1 mt-1">
                {message.reactions.map((reaction, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {reaction.emoji} {reaction.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time + status */}
        {showMeta && (
          <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span>{formatTime(message.createdAt || message.timestamp)}</span>
            <StatusIcon />
          </div>
        )}
      </div>
    </div>
  )
}
