"use client"

import { useState } from 'react'
import {
  Pin, Reply, MoreHorizontal, Heart, Clock,
  Check, CheckCheck
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function MessageBubble({ message, showAvatar, contact, showMeta = true }) {
  const [hovered, setHovered] = useState(false)

  const formatTime = (ts) => {
    if (!ts) return ''
    try {
      const d = typeof ts === 'string' || typeof ts === 'number' ? new Date(ts) : ts
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  const isOwn = !!message?.isOwn

  // Icon trạng thái gửi cho tin nhắn của mình
  const StatusIcon = () => {
    if (!isOwn) return null
    const s = message.status || message.deliveryStatus // tuỳ server
    if (s === 'sending') return <Clock className="w-3 h-3 opacity-70" />
    if (s === 'read') return <CheckCheck className="w-3.5 h-3.5 opacity-70" />
    // 'sent' | 'delivered' | default
    return <Check className="w-3.5 h-3.5 opacity-70" />
  }

  return (
    <div
      className={`flex gap-2 mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar bên trái cho message của người khác (tuỳ nhóm direct) */}
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={contact?.avatar} />
          <AvatarFallback>{contact?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}

      {/* Wrapper để định vị action bar mà không ảnh hưởng layout */}
      <div className={`relative max-w-[70%] ${isOwn ? 'order-first' : ''}`}>
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
        <div
          className={`
            relative p-3 rounded-lg
            ${isOwn
              ? 'bg-blue-500 text-white rounded-br-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
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

        {/* Time + status (không còn action bar dưới nữa) */}
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
