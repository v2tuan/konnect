"use client"

import { useState } from 'react'
import { Pin, Reply, MoreHorizontal, Heart, ThumbsUp, Laugh, Clock } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function MessageBubble({ message, showAvatar, contact }) {
  const [showActions, setShowActions] = useState(false)

  const formatTime = (timestamp) => {
    return timestamp
  }

  return (
    <div 
      className={`flex gap-2 mb-3 ${message.isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!message.isOwn && showAvatar && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={contact?.avatar} />
          <AvatarFallback>{contact?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-[70%] ${message.isOwn ? 'order-first' : ''}`}>
        <div className={`
          relative p-3 rounded-lg
          ${message.isOwn 
            ? 'bg-blue-500 text-white rounded-br-sm' 
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
          }
        `}>
          {message.isPinned && (
            <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500" />
          )}
          
          <p className="text-sm">{message.text}</p>
          
          {message.reactions && (
            <div className="flex gap-1 mt-1">
              {message.reactions.map((reaction, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {reaction.emoji} {reaction.count}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
          <span>{formatTime(message.timestamp)}</span>
          {message.isOwn && <Clock className="w-3 h-3" />}
        </div>
        
        {showActions && (
          <div className={`flex gap-1 mt-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
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
        )}
      </div>
    </div>
  )
}