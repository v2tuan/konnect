import { useMemo, useState } from 'react'
import {
  Pin, Reply, MoreHorizontal, Heart, Clock, Check, CheckCheck, FileText, FileSpreadsheet, Archive, Video, Music, File, Download
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

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

  const handleDownload = async (url, filename) => {
    try {
      // Lấy file từ URL
      const response = await fetch(url)
      // blob như biến tạm để lưu trữ file
      const blob = await response.blob()

      // Tạo URL tạm thời cho Blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Tạo thẻ <a> tạm để kích hoạt download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()

      // Giải phóng Blob URL
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed', err)
    }
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
        {message.media && message.media.length > 0 ? (
          (
            <>
              <div className="space-y-2">
                {/* Phân loại media thành images và files */}
                {(() => {
                  const images = message.media.filter(m => m.type === 'image')
                  const files = message.media.filter(m => m.type === 'file')
                  const audios = message.media.filter(m => m.type === 'audio')

                  return (
                    <>
                      {/* Hiển thị images với grid layout */}
                      {images.length > 0 && (
                        <div className={`
            ${images.length === 1 ? 'flex justify-center' :
                            images.length === 2 ? 'grid grid-cols-2 gap-2' :
                              images.length <= 4 ? 'grid grid-cols-2 gap-2 max-w-md' :
                                'grid grid-cols-3 gap-2 max-w-lg'
                          }
          `}>
                          {images.map((media, index) => (
                            <div key={`image-${index}`} className="relative">
                              {message.isPinned && (
                                <Pin className="absolute top-1 right-1 w-3 h-3 text-yellow-500 z-10" />
                              )}
                              <img
                                src={media.url ?? message.body?.media?.url}
                                alt={media.metadata?.filename || "message attachment"}
                                className={`
                    rounded-lg shadow-md object-cover
                    ${images.length === 1 ? 'max-w-sm max-h-96 w-full' :
                                    images.length === 2 ? 'w-full h-32 sm:h-40' :
                                      images.length <= 4 ? 'w-full h-24 sm:h-32' :
                                        'w-full h-20 sm:h-24'
                                  }
                    hover:shadow-lg transition-shadow duration-200 cursor-pointer
                  `}
                                onClick={() => {
                                  // Có thể thêm function để mở ảnh full size
                                  // openImageModal(media.url ?? message.body?.media?.url);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hiển thị files dạng danh sách */}
                      {files.length > 0 && (
                        <div className="space-y-1">
                          {files.map((media, index) => (
                            <div
                              key={`file-${index}`}
                              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-200"
                            >
                              {/* File icon dựa trên mimetype */}
                              <div className="flex-shrink-0">
                                {(() => {
                                  const mimetype = media.metadata?.mimetype || ''
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
                                })()}
                              </div>

                              {/* File info */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {media.metadata?.filename || 'Unknown file'}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>{formatFileSize(media.metadata?.size)}</span>
                                  {/* {media.metadata?.mimetype && (
                                    <span className="text-gray-400">•</span>
                                  )}
                                  {media.metadata?.mimetype && (
                                    <span>{media.metadata.mimetype.split('/')[1]?.toUpperCase()}</span>
                                  )} */}
                                </div>
                              </div>

                              {/* Download icon */}
                              <div className="flex-shrink-0">
                                <button
                                  onClick={() =>
                                    handleDownload(media.secure_url, media.metadata?.filename || 'file.jpg')
                                  }
                                >
                                  <Download className="w-4 h-4 text-gray-400 cursor-pointer" />
                                </button>


                              </div>

                              {/* Pin icon nếu message được pin */}
                              {message.isPinned && (
                                <Pin className="w-3 h-3 text-yellow-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Hiển thị audio */}
                      {audios.length > 0 && (
                        <div className="space-y-2">
                          {audios.map((media, index) => (
                            <div
                              key={`audio-${index}`}
                              className={`flex items-center gap-2 p-2 max-w-xs 
          ${message.isOwn ? 'ml-auto bg-blue-100 text-black rounded-l-lg rounded-tr-lg'
                                  : 'mr-auto bg-gray-100 text-black rounded-r-lg rounded-tl-lg'} 
          shadow-sm`}
                            >
                              {/* Audio player mở rộng đúng flex */}
                              <audio controls className="flex-1 min-w-0">
                                <source src={media.url} type={media.metadata?.mimetype || 'audio/webm'} />
                                Your browser does not support the audio element.
                              </audio>

                              {/* Icon Pin nếu có */}
                              {message.isPinned && (
                                <Pin className="w-4 h-4 text-yellow-500 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                    </>
                  )
                })()}
              </div>

              {/* Reactions - hiển thị bên ngoài container media */}
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
