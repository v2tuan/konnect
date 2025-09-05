import { Search, MessageCircle, Users, User, Settings, Phone, Video } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { SkeletonConversation } from '../Skeleton/SkeletonConversation'
import { searchUserByUsername } from '@/apis'

export function ChatSidebar({ chats, selectedChat, onChatSelect, currentView, onViewChange }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchList, setSearchList] = useState([])

  const filteredChats = chats.filter(chat =>
    chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (timestamp) => {
    return timestamp
  }

  const getStatusColor = (status) => {
    switch (status) {
    case 'online': return 'bg-status-online'
    case 'away': return 'bg-status-away'
    case 'busy': return 'bg-status-busy'
    case 'offline': return 'bg-status-offline'
    default: return 'bg-status-offline'
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const delayDebounce = setTimeout(async () => {
      try {
        const dataRespone = await searchUserByUsername(searchQuery)
        setSearchList(dataRespone)
      }
      catch (error) {
        console.log(error)
        console.log(error.response.data.message)
        setSearchList([])
      }
      finally {
        setLoading(false)
      }
      // setSearchQuery(e.target.value)
    }, 500)

    return () => {
      clearTimeout(delayDebounce) // Hủy debounce cũ
      controller.abort() // Hủy request cũ nếu user gõ tiếp
    }
  }, [searchQuery])


  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Tìm kiếm bạn bè, tin nhắn..."
            // value={searchQuery}
            onChange={async (e) => {
              onViewChange("search")
              setSearchQuery(e.target.value)
            }}
            className="pl-10 bg-input border-input-border focus:border-input-focus"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 py-2 border-b border-border">
        <div className="flex gap-1">
          <Button
            variant={currentView === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('chat')}
            className="flex-1"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button
            variant={currentView === 'contacts' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('priority')}
            className="flex-1"
          >
            <Users className="w-4 h-4 mr-2" />
            Bạn bè
          </Button>
          <Button 
            variant={currentView === 'profile' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => onViewChange('profile')}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-2" />
            Cá nhân
          </Button>
        </div>
      </div>

      {currentView === "search" && loading &&
        <>
          <SkeletonConversation></SkeletonConversation>
          <SkeletonConversation></SkeletonConversation>
          <SkeletonConversation></SkeletonConversation>
          <SkeletonConversation></SkeletonConversation>
          <SkeletonConversation></SkeletonConversation>
        </>
      }

      {currentView === "search" && !loading && (searchList.length === 0 ? (
        <p className={`p-3 rounded-lg cursor-pointer transition-all duration-fast hover:bg-card-hover`}>No users found</p>
      ) : (
        <>
          {searchList.map((user) => (
            <div
              key={user._id}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-fast hover:bg-card-hover`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.username}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground truncate">{user.username}</h3>
                    {user.fullName && (
                      <span className="text-xs text-muted-foreground">
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">
                      {user.fullName || ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'chat' && (
          <div className="space-y-1 p-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`p-3 rounded-lg cursor-pointer transition-all duration-fast hover:bg-card-hover ${selectedChat?.id === chat.id ? 'bg-primary/10 border border-primary/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={chat.contact.avatar} />
                      <AvatarFallback>{chat.contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(chat.contact.status)}`}></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-foreground truncate">{chat.contact.name}</h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage?.isOwn ? 'Bạn: ' : ''}
                        {chat.lastMessage?.text || 'Chưa có tin nhắn'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs">
                          {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Phone className="w-4 h-4 mr-2" />
            Cuộc gọi
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Video className="w-4 h-4 mr-2" />
            Video
          </Button>
        </div>
      </div>
    </div>
  )
}