/* eslint-disable no-empty */
import { useEffect, useRef, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Search, X, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "react-toastify"

import {
  searchUserByUsername,
  getDisplayUsers,
  getConversationByUserId,
  getConversations,
  submitFriendRequestAPI,
  removeFriendAPI,
  findUserById,          // [+] dùng giống ListFriend
  getFriendsAPI          // [+] nạp friend list
} from "@/apis"

import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectCurrentUser } from "@/redux/user/userSlice"
import { useCallInvite } from "@/hooks/useCallInvite"

import UserProfilePanel from "./UserProfilePanel"

// Chuẩn hóa dữ liệu giống ListFriend.jsx
function mapToUserProfile(contact) {
  if (!contact) return {}
  return {
    id: contact.id || contact._id,
    fullName: contact.fullName || contact.name || contact.username || "Người dùng",
    username: contact.username || "",
    avatarUrl: contact.avatarUrl || contact.avatar || "",
    coverUrl: contact.coverUrl || "",
    bio: contact.bio || "",
    dateOfBirth: contact.dateOfBirth || contact.birthday || "",
    phone: contact.phone || "",
    photos: contact.photos || [],
    mutualGroups: typeof contact.mutualGroups === "number" ? contact.mutualGroups : 0,
    friendship: contact.friendship || null,
  }
}

export default function AddFriendModal({ open = false, onClose = () => {} }) {
  const navigate = useNavigate()
  const currentUser = useSelector(selectCurrentUser)
  const { startCall } = useCallInvite(currentUser?._id)

  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  // panel state
  const [showProfile, setShowProfile] = useState(false)
  const [profileUser, setProfileUser] = useState(null)
  const [profileMutualCount, setProfileMutualCount] = useState(0)

  // [+] Set các id bạn bè để suy ra isFriend
  const [friendIdSet, setFriendIdSet] = useState(() => new Set())

  const debounceRef = useRef(null)

  // reset khi modal đóng
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setShowProfile(false)
      setProfileUser(null)
      setProfileMutualCount(0)
      setFriendIdSet(new Set()) // [+] reset
    }
  }, [open])

  // [+] Nạp friend list khi mở modal (paginate)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        let page = 1
        const limit = 60
        const acc = new Set()
        while (!cancelled) {
          const res = await getFriendsAPI({ page, limit, q: "" })
          const list = res?.data || []
          for (const r of list) {
            const fid = r?.friend?.id || r?.friend?._id
            if (fid) acc.add(String(fid))
          }
          if (!res?.hasNext || list.length < limit) break
          page += 1
        }
        if (!cancelled) setFriendIdSet(acc)
      } catch {}
    })()
    return () => { cancelled = true }
  }, [open])

  // tìm user (debounce)
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchUserByUsername(query.trim())
        setResults(Array.isArray(data) ? data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 450)

    return () => clearTimeout(debounceRef.current)
  }, [query, open])

  // helper lấy số nhóm chung giống ListFriend
  const calcMutualGroups = async (targetUserId) => {
    try {
      let page = 1
      const limit = 50
      let total = 0
      while (page <= 5) {
        const res = await getConversations(page, limit)
        const list = res?.data || []
        const groups = list.filter((c) => c?.type === "group")

        for (const g of groups) {
          const members = g?.group?.members || g?.members || []
          const hasFriend = members.some(
            (m) => String(m._id || m.id) === String(targetUserId)
          )
          if (hasFriend) total += 1
        }

        if (list.length < limit) break
        page += 1
      }
      return total
    } catch (err) {
      return 0
    }
  }

  // ====== hydrateAndOpenProfile
  // Bổ sung: sau khi load user + mutual group,
  // ta gọi getConversationByUserId để cố lấy thông tin friendship chính xác.
  const hydrateAndOpenProfile = async (u) => {
    try {
      const id = u?._id || u?.id
      if (!id) {
        toast.error("Thiếu user id")
        return
      }

      // [+] Ưu tiên findUserById giống ListFriend
      let rawDetail = null
      try {
        const detail = await findUserById(id)
        rawDetail = detail?.data || detail?.user || detail || null
      } catch {}

      // 1. fallback getDisplayUsers nếu cần
      let detailList = []
      if (!rawDetail) {
        try {
          detailList = await getDisplayUsers([id])
        } catch (e) {
          try {
            const res = await getDisplayUsers({ userIds: [id] })
            detailList = Array.isArray(res) ? res : res?.data || []
          } catch {}
        }
      }
      const d = rawDetail || (Array.isArray(detailList) ? detailList[0] : detailList)

      // 2. mutual groups
      const mutualCount = await calcMutualGroups(id)

      // 3. kiểm tra conversation để đoán trạng thái kết bạn thực tế
      let friendshipFromConvo = null
      try {
        const convoRes = await getConversationByUserId(id)
        friendshipFromConvo =
          convoRes?.data?.direct?.otherUser?.friendship ||
          convoRes?.direct?.otherUser?.friendship ||
          convoRes?.friendship ||
          null
      } catch {}

      // 4. quyết định finalFriendship
      const finalFriendship =
        friendshipFromConvo ||
        d?.friendship ||
        u?.friendship ||
        { status: "none" }

      // normalize + [+] nếu có trong friend set thì coi là accepted
      let normalizedFriendship = finalFriendship
      if (typeof normalizedFriendship === "string") normalizedFriendship = { status: normalizedFriendship }
      if (!normalizedFriendship?.status && normalizedFriendship?.state) {
        normalizedFriendship = { ...normalizedFriendship, status: normalizedFriendship.state }
      }
      if (friendIdSet.has(String(id))) {
        normalizedFriendship = { ...(normalizedFriendship || {}), status: "accepted" }
      }

      // 5. build object cho panel
      const panelUser = mapToUserProfile({
        id,
        fullName:
          d?.fullName || u?.fullName || d?.displayName || u?.displayName || u?.username || "Người dùng",
        username: d?.username || d?.userName || u?.username || u?.userName || "",
        avatarUrl: d?.avatarUrl || u?.avatarUrl || "",
        coverUrl: d?.coverUrl || "",
        bio: d?.bio ?? u?.bio ?? "",
        dateOfBirth: d?.dateOfBirth || u?.dateOfBirth || d?.birthday || u?.birthday || "",
        phone: d?.phone || u?.phone || "",
        photos: d?.photos || u?.photos || [],
        friendship: normalizedFriendship,
        mutualGroups: mutualCount,
      })

      setProfileMutualCount(mutualCount)
      setProfileUser(panelUser)
      setShowProfile(true)
    } catch (err) {
      console.error(err)
      toast.error("Không tải được thông tin người dùng")
    }
  }

  const handlePickUser = (u) => {
    if (!u) {
      toast.info("Không tìm thấy người dùng")
      return
    }
    hydrateAndOpenProfile(u)
  }

  // ===== Derived status
  const friendshipStatus = profileUser?.friendship?.status || "none"
  const isFriendForPanel = useMemo(() => {
    const id = profileUser?.id || profileUser?._id
    const inList = id ? friendIdSet.has(String(id)) : false  // [+]
    const accepted = friendshipStatus === "accepted" || friendshipStatus === "friends"
    return inList || accepted
  }, [friendshipStatus, profileUser, friendIdSet])

  // ===== handlers =====
  const handleOpenChatFromPanel = async () => {
    try {
      const uid = profileUser?.id || profileUser?._id
      if (!uid) return

      const res = await getConversationByUserId(uid)
      const convoId =
        res?.data?._id || res?.data?.id || res?.id || res?._id

      if (convoId) {
        navigate(`/chats/${convoId}`)
        setShowProfile(false)
        onClose()
      } else {
        toast.info("Chưa có cuộc trò chuyện. Hãy gửi lời mời kết bạn trước.")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleStartCallFromPanel = async () => {
    if (!currentUser?._id) return
    try {
      const uid = profileUser?.id || profileUser?._id
      if (!uid) return

      const res = await getConversationByUserId(uid)
      const conversationId =
        res?.data?._id || res?.data?.id || res?.id || res?._id

      if (!conversationId) {
        toast.info("Không thể gọi vì chưa có cuộc trò chuyện giữa 2 bạn.")
        return
      }

      startCall({
        conversationId,
        mode: "audio",
        toUserIds: [uid],
        me: {
          id: currentUser._id,
          name: currentUser.fullName || currentUser.username || currentUser.email,
          avatarUrl: currentUser.avatarUrl,
        },
        peer: {
          name: profileUser?.fullName || profileUser?.username || "User",
          avatarUrl: profileUser?.avatarUrl,
        },
      })

      setShowProfile(false)
      onClose()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddFriendFromPanel = async () => {
    try {
      const uid = profileUser?.id || profileUser?._id
      if (!uid) return
      await submitFriendRequestAPI(uid)
      toast.success("Đã gửi lời mời kết bạn")

      setProfileUser((p) => ({
        ...(p || {}),
        friendship: { status: "pending", direction: "outgoing" },
      }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleUnfriendFromPanel = async () => {
    try {
      const uid = profileUser?.id || profileUser?._id
      if (!uid) return
      await removeFriendAPI(uid)
      toast.success("Đã xóa bạn bè")

      setProfileUser((p) => ({ ...(p || {}), friendship: { status: "none" } }))
      // [+] cập nhật friend set để UI phản ánh ngay
      setFriendIdSet((prev) => {
        const next = new Set(prev)
        next.delete(String(uid))
        return next
      })
      setShowProfile(false)
    } catch (e) {
      console.error(e)
    }
  }

  if (!open) return null

  return (
    <>
      {/* overlay AddFriendModal */}
      <div
        className="fixed inset-0 z-[60] bg-black/30"
        onClick={onClose}
      />

      {/* AddFriendModal body */}
      <div
        className="fixed z-[61] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold">Add friend</h3>
          <button
            className="p-2 rounded hover:bg-gray-100"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) {
                  e.preventDefault()
                  handlePickUser(results[0])
                }
              }}
            />
          </div>

          {/* list kết quả */}
          <div className="mt-3 max-h-60 overflow-y-auto">
            {loading && (
              <div className="text-sm text-muted-foreground px-1 py-2">
                Đang tìm…
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((u) => {
                  const name = u?.fullName || u?.username || u?.userName || "User"
                  const initial = (name?.[0] || "U").toUpperCase()

                  return (
                    <button
                      key={u._id || u.id}
                      type="button"
                      className="w-full text-left p-2 rounded-md hover:bg-accent/60 transition-colors"
                      onClick={() => handlePickUser(u)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={u?.avatarUrl || ""} />
                          <AvatarFallback>{initial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {name}
                          </div>
                          {(u?.username || u?.userName) && (
                            <div className="text-xs text-muted-foreground truncate">
                              @{u?.username || u?.userName}
                            </div>
                          )}
                        </div>
                        <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!loading && query.trim() && results.length === 0 && (
              <div className="text-sm text-muted-foreground px-1 py-2">
                Không tìm thấy người dùng
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel overlay trên modal */}
      {showProfile &&
        createPortal(
          <div className="fixed inset-0 z-[80]">
            <UserProfilePanel
              open={showProfile}
              onClose={() => setShowProfile(false)}
              user={{ ...mapToUserProfile(profileUser), mutualGroups: profileMutualCount }}
              isFriend={isFriendForPanel}
              onChat={handleOpenChatFromPanel}
              onCall={handleStartCallFromPanel}
              onAddFriend={handleAddFriendFromPanel}
              onUnfriend={handleUnfriendFromPanel}
            />
          </div>,
          document.body
        )}
    </>
  )
}
