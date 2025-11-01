/* eslint-disable no-empty */
/* eslint-disable no-undef */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, UserPlus, Users, Filter, Phone, Video, MessageCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { getFriendsAPI } from '@/apis'
import UserProfilePanel from '@/components/common/Modal/UserProfilePanel'
import { useNavigate } from 'react-router-dom'
import { getConversationByUserId, getConversations, findUserById, submitFriendRequestAPI, removeFriendAPI } from '@/apis'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '@/redux/user/userSlice'
import { useCallInvite } from '@/hooks/useCallInvite'

function relativeFromNow(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / (60 * 1000))
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return `${days} ngày trước`
}

const getStatusColor = (status) => (status === 'online' ? 'bg-status-online' : 'bg-status-offline')

const getStatusText = (contact /** @type {FriendUI} */) => {
  if (contact.status === 'online') return 'Online'
  return contact.lastActiveAt ? `Hoạt động ${relativeFromNow(contact.lastActiveAt)}` : 'Offline'
}

// Chuẩn hóa dữ liệu cho UserProfilePanel
function mapToUserProfile(contact) {
  if (!contact) return {}
  return {
    id: contact.id || contact._id,
    fullName: contact.fullName || contact.name || contact.username || 'Người dùng',
    username: contact.username || '',
    avatarUrl: contact.avatarUrl || contact.avatar || '',
    coverUrl: contact.coverUrl || '',
    bio: contact.bio || '',
    dateOfBirth: contact.dateOfBirth || contact.birthday || '',
    phone: contact.phone || '',
    photos: contact.photos || [],
    mutualGroups: typeof contact.mutualGroups === 'number' ? contact.mutualGroups : 0,
    friendship: contact.friendship || null
  }
}

export function ListFriend({ onFriendSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'online' | 'offline'

  const [friends, setFriends] = useState([]) /** @type {[FriendUI[], any]} */
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Profile panel state
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileUser, setProfileUser] = useState(null)
  const [profileMutualCount, setProfileMutualCount] = useState(0)

  // Navigation state
  const navigate = useNavigate()
  const [navLoadingId, setNavLoadingId] = useState(null)

  // Current user + call hook
  const currentUser = useSelector(selectCurrentUser)
  const { startCall, ringing, cancelCaller } = useCallInvite(currentUser?._id)

  // Keep last dial targets for cancel
  const lastDialIdsRef = useRef([])

  const openProfile = async (contact, e) => {
    e?.stopPropagation?.()
    setProfileUser(mapToUserProfile(contact))
    setProfileOpen(true)

    // 1) Load full profile
    try {
      const detail = await findUserById(contact.id)
      const raw = detail?.data || detail?.user || detail || {}
      const merged = mapToUserProfile({
        ...contact,
        id: raw._id || raw.id || contact.id,
        fullName: raw.fullName || raw.name || contact.name,
        username: raw.username || contact.username,
        avatarUrl: raw.avatarUrl || contact.avatar,
        coverUrl: raw.coverUrl || '',
        bio: raw.bio || '',
        dateOfBirth: raw.dateOfBirth || raw.birthday || '',
        phone: raw.phone || '',
        photos: raw.photos || [],
        friendship: raw.friendship || null
      })
      setProfileUser(merged)
    } catch {
      // fallback đã set ở trên
    }

    // 2) Tính số nhóm chung
    try {
      let page = 1
      const limit = 50
      let total = 0
      while (page <= 5) {
        const res = await getConversations(page, limit)
        const list = res?.data || []
        const groups = list.filter(c => c?.type === 'group')
        for (const g of groups) {
          const members = g?.group?.members || g?.members || []
          const hasFriend = members.some(m => String(m._id || m.id) === String(contact.id))
          if (hasFriend) total += 1
        }
        if (list.length < limit) break
        page += 1
      }
      setProfileMutualCount(total)
    } catch {
      setProfileMutualCount(0)
    }
  }
  const closeProfile = () => setProfileOpen(false)

  // Add/Remove friend handlers for ProfilePanel
  const handleAddFriend = async (u) => {
    const uid = u?.id || u?._id
    if (!uid) return
    try {
      await submitFriendRequestAPI(uid)
      // Optionally update local profile friendship
      setProfileUser(p => ({ ...(p || {}), friendship: { status: 'pending', direction: 'outgoing' } }))
    } catch (e) {}
  }

  const handleUnfriend = async (u) => {
    const uid = u?.id || u?._id
    if (!uid) return
    try {
      await removeFriendAPI(uid)
      // Remove from current list
      setFriends(prev => prev.filter(f => String(f.id) !== String(uid)))
      setProfileOpen(false)
    } catch (e) {}
  }

  // Derived: isFriend for panel
  const isFriendForPanel = useMemo(() => {
    if (!profileUser) return false
    const inList = friends.some(f => String(f.id) === String(profileUser.id || profileUser._id))
    const accepted = profileUser?.friendship?.status === 'accepted'
    return accepted || inList
  }, [friends, profileUser])

  const openChat = async (contact, e) => {
    e?.stopPropagation?.()
    // Ưu tiên prop nếu parent muốn tự xử lý
    if (onFriendSelect) {
      onFriendSelect(contact)
      return
    }
    try {
      setNavLoadingId(contact.id)
      const res = await getConversationByUserId(contact.id)
      const id =
        res?.data?._id || res?.data?.id || res?.id || res?._id
      if (id) navigate(`/chats/${id}`)
    } finally {
      setNavLoadingId(null)
    }
  }

  // Call trực tiếp không mở ChatArea
  const startDirectCall = async (contact, mode = 'audio', e) => {
    e?.stopPropagation?.()
    if (!currentUser?._id) return
    try {
      setNavLoadingId(contact.id)
      const res = await getConversationByUserId(contact.id)
      const conversationId = res?.data?._id || res?.data?.id || res?.id || res?._id
      if (!conversationId) return

      const toIds = [contact.id]
      lastDialIdsRef.current = toIds

      startCall({
        conversationId,
        mode,
        toUserIds: toIds,
        me: {
          id: currentUser._id,
          name: currentUser.fullName || currentUser.username || currentUser.email,
          avatarUrl: currentUser.avatarUrl
        },
        peer: {
          name: contact.name,
          avatarUrl: contact.avatar
        }
      })
      // GlobalCallModal will handle modal after accept; show ringing banner below meanwhile
    } finally {
      setNavLoadingId(null)
    }
  }

  // Debounce search 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Fetch friends when page or debouncedQ changes
  useEffect(() => {
    let cancelled = false
    const fetchFriends = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getFriendsAPI({ page, limit: 30, q: debouncedQ })
        if (cancelled) return
        const mapped = (res?.data || []).map((r) => ({
          id: r.friend.id,
          name: r.friend.fullName || r.friend.username,
          username: r.friend.username,
          avatar: r.friend.avatarUrl,
          status: r.friend.status?.isOnline ? 'online' : 'offline',
          lastActiveAt: r.friend.status?.lastActiveAt || null
        }))
        setFriends((prev) => (page === 1 ? mapped : [...prev, ...mapped]))
        setHasNext(!!res?.hasNext)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Không tải được danh sách bạn bè.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchFriends()
    return () => {
      cancelled = true
    }
  }, [page, debouncedQ])

  // Reset về page 1 khi đổi q
  useEffect(() => {
    setPage(1)
  }, [debouncedQ])

  const onlineCount = useMemo(() => friends.filter((c) => c.status === 'online').length, [friends])

  // Filter client theo trạng thái (search đã gửi lên server)
  const filteredfriends = useMemo(() => {
    return friends.filter((c) => {
      if (filterStatus === 'online') return c.status === 'online'
      if (filterStatus === 'offline') return c.status !== 'online'
      return true
    })
  }, [friends, filterStatus])

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bạn bè</h1>
            <p className="text-sm text-muted-foreground">
              {onlineCount} bạn Online • {friends.length} tổng số bạn bè
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Tìm kiếm bạn bè..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border-input-border focus:border-input-focus"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('all')}
          >
            <Users className="w-4 h-4 mr-2" />
            Tất cả
          </Button>
          <Button
            variant={filterStatus === 'online' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('online')}
          >
            <div className="w-2 h-2 bg-success rounded-full mr-2"></div>
            Đang online
          </Button>
          <Button
            variant={filterStatus === 'offline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus('offline')}
          >
            <Filter className="w-4 h-4 mr-2" />
            Offline
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-sm text-red-500 border-b border-border">
          {error}
        </div>
      )}

      {/* Online Friends */}
      {!error && onlineCount > 0 && (
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            Online ({onlineCount})
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {friends
              .filter((c) => c.status === 'online')
              .slice(0, 8)
              .map((contact) => (
                <div
                  key={contact.id}
                  onClick={(e) => openChat(contact, e)}
                  className="flex flex-col items-center p-2 rounded-lg cursor-pointer hover:bg-card-hover transition-colors"
                >
                  <div className="relative" onClick={(e) => openProfile(contact, e)}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{(contact.name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-white"></div>
                  </div>
                  <span className="text-xs text-center mt-1 font-medium truncate w-full">{contact.name}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* All friends */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Tất cả bạn bè ({filteredfriends.length})
        </h3>

        <div className="space-y-2">
          {filteredfriends.map((contact) => (
            <Card
              key={contact.id}
              className="hover:shadow-soft transition-shadow cursor-pointer"
              onClick={(e) => openChat(contact, e)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative" onClick={(e) => openProfile(contact, e)}>
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>{(contact.name || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(
                        contact.status
                      )}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground truncate">
                      {getStatusText(contact)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => openChat(contact, e)}
                      disabled={navLoadingId === contact.id}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => startDirectCall(contact, 'audio', e)}
                      disabled={navLoadingId === contact.id}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => startDirectCall(contact, 'video', e)}
                      disabled={navLoadingId === contact.id}
                    >
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredfriends.length === 0 && !loading && !error && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">Không tìm thấy bạn bè</h3>
            <p className="text-sm text-muted-foreground">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
            </p>
          </div>
        )}

        {/* Load more */}
        <div className="flex items-center justify-center py-6">
          {hasNext ? (
            <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tải thêm
            </Button>
          ) : loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
        </div>
      </div>

      {/* User Profile Panel */}
      {profileOpen && (
        <UserProfilePanel
          open={profileOpen}
          onClose={closeProfile}
          user={{ ...mapToUserProfile(profileUser), mutualGroups: profileMutualCount }}
          isFriend={isFriendForPanel}
          onChat={() => openChat(profileUser)}
          onCall={() => startDirectCall(profileUser, 'audio')}
          onAddFriend={() => handleAddFriend(profileUser)}
          onUnfriend={() => handleUnfriend(profileUser)}
        />
      )}

      {/* Outgoing ringing banner (30s countdown, same logic as ChatArea) */}
      {ringing && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 bg-card border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
          <img src={ringing.peer?.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          <div className="mr-4">
            <div className="text-sm font-semibold">{ringing.peer?.name}</div>
            <div className="text-xs text-muted-foreground">
              Đang gọi… còn {Math.ceil((ringing.leftMs || 0) / 1000)}s
            </div>
          </div>
          <Button size="sm" variant="destructive" onClick={() => cancelCaller(lastDialIdsRef.current)}>
            Hủy
          </Button>
        </div>
      )}
    </div>
  )
}

export default ListFriend
