import { useState } from 'react';
import { Pin, Reply, MoreHorizontal, Heart, ThumbsUp, Laugh, Clock } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MessageBubble({ message, showAvatar, contact }) {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp) => {
    return timestamp;
  };

  const handleReaction = (emoji) => {
    // TODO: Implement reaction logic
    console.log('Reaction:', emoji, 'to message:', message.id);
  };

  return (
    <div
      className={`flex gap-2 group animate-message-in ${message.isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for received messages */}
      {!message.isOwn && showAvatar && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarImage src={contact.avatar} />
          <AvatarFallback>{contact.name[0]}</AvatarFallback>
        </Avatar>
      )}
      {!message.isOwn && !showAvatar && <div className="w-8" />}

      <div className={`flex flex-col max-w-[70%] ${message.isOwn ? 'items-end' : 'items-start'}`}>
        {/* Message Content */}
        <div className="relative">
          {/* Pinned indicator */}
          {message.isPinned && (
            <div className="flex items-center gap-1 mb-1">
              <Pin className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary">Đã ghim</span>
            </div>
          )}

          {/* Message Bubble */}
          <div
            className={`
              relative px-4 py-2 rounded-lg shadow-soft transition-all duration-fast
              ${message.isOwn 
                ? 'bg-chat-sent text-chat-sent-foreground rounded-br-sm' 
                : 'bg-chat-received text-chat-received-foreground rounded-bl-sm'
              }
              ${showActions ? 'shadow-medium' : ''}
            `}
          >
            {/* Reply indicator */}
            {message.replyTo && (
              <div className="mb-2 p-2 bg-black/10 rounded border-l-2 border-primary">
                <p className="text-xs text-muted-foreground">Trả lời tin nhắn</p>
                <p className="text-sm opacity-80">Nội dung tin nhắn gốc...</p>
              </div>
            )}

            {/* Message Text */}
            <p className="text-sm leading-relaxed break-words">
              {message.text}
            </p>

            {/* Timestamp & Status */}
            <div className={`flex items-center gap-1 mt-1 ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs opacity-60">
                {formatTime(message.timestamp)}
              </span>
              {message.isOwn && (
                <div className="flex">
                  <Clock className="w-3 h-3 opacity-60" />
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {showActions && (
            <div className={`absolute top-0 ${message.isOwn ? '-left-20' : '-right-20'} flex gap-1 z-10`}>
              <Button variant="secondary" size="sm" className="w-6 h-6 p-0 opacity-80 hover:opacity-100">
                <Reply className="w-3 h-3" />
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="w-6 h-6 p-0 opacity-80 hover:opacity-100"
                onClick={() => handleReaction('❤️')}
              >
                <Heart className="w-3 h-3" />
              </Button>
              <Button variant="secondary" size="sm" className="w-6 h-6 p-0 opacity-80 hover:opacity-100">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1">
            {message.reactions.map((reaction, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="px-2 py-0.5 text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                onClick={() => handleReaction(reaction.emoji)}
              >
                {reaction.emoji} {reaction.count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Avatar for sent messages (empty space) */}
      {message.isOwn && <div className="w-8" />}
    </div>
  );
}