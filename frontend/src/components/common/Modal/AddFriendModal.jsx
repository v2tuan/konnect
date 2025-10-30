/* eslint-disable no-empty */
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Search, X, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "react-toastify"

import { searchUserByUsername, getDisplayUsers } from "@/apis"
import UserProfilePanel from "./UserProfilePanel"

export default function AddFriendModal({ open = false, onClose = () => {} }) {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  // Panel state
  const [showProfile, setShowProfile] = useState(false)
  const [profileUser, setProfileUser] = useState(null)

  const debounceRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setShowProfile(false)
      setProfileUser(null)
      return
    }
  }, [open])

  // Debounce tìm user
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

  // ====== HYDRATE USER PROFILE trước khi mở panel ======
  const hydrateAndOpenProfile = async (u) => {
    try {
      const id = u?._id || u?.id
      if (!id) {
        toast.error("Thiếu user id")
        return
      }

      // gọi API hiển thị user chi tiết (bạn đã dùng hàm này trước đây)
      // kỳ vọng: trả về [{ _id, fullName, username, avatarUrl, bio, status, friendship, mutualGroups, ... }]
      let detailList = []
      try {
        detailList = await getDisplayUsers([id])
      } catch (e) {
        // fallback (nếu dự án của bạn có overload khác):
        try {
          const res = await getDisplayUsers({ userIds: [id] })
          detailList = Array.isArray(res) ? res : res?.data || []
        } catch {}
      }

      const d = Array.isArray(detailList) ? detailList[0] : detailList

      // map an toàn các field có thể khác tên (username / userName)
      const panelUser = {
        id,
        fullName: d?.fullName || u?.fullName || d?.displayName || u?.displayName,
        username: d?.username || d?.userName || u?.username || u?.userName,
        avatarUrl: d?.avatarUrl || u?.avatarUrl,
        bio: d?.bio ?? u?.bio ?? "",
        dateOfBirth: d?.dateOfBirth || u?.dateOfBirth,
        phone: d?.phone || u?.phone,
        photos: d?.photos || u?.photos || [],
        status: d?.status || u?.status, // { isOnline, lastActiveAt }
        friendship: d?.friendship ?? u?.friendship ?? { status: "none" }, // "accepted" | "pending" | "none"
        mutualGroups: typeof d?.mutualGroups === "number"
          ? d?.mutualGroups
          : (typeof u?.mutualGroups === "number" ? u?.mutualGroups : 0)
      }

      setProfileUser(panelUser)
      setShowProfile(true) // mở panel đè lên modal
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
    // hydrate trước khi mở panel
    hydrateAndOpenProfile(u)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay của AddFriendModal */}
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />

      {/* AddFriendModal container */}
      <div
        className="fixed z-[61] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden"
        role="dialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-base font-semibold">Add friend</h3>
          <button className="p-2 rounded hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body: ô nhập + dropdown gợi ý */}
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

          {/* Dropdown kết quả */}
          <div className="mt-3 max-h-60 overflow-y-auto">
            {loading && (
              <div className="text-sm text-muted-foreground px-1 py-2">Đang tìm…</div>
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
                          <div className="font-medium truncate">{name}</div>
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
              <div className="text-sm text-muted-foreground px-1 py-2">Không tìm thấy người dùng</div>
            )}
          </div>
        </div>
      </div>

      {/* UserProfilePanel: Portal z-[80] để CHỒNG LÊN modal */}
      {showProfile &&
        createPortal(
          <div className="fixed inset-0 z-[80]">
            <UserProfilePanel
              open={showProfile}
              onClose={() => setShowProfile(false)}
              // ⭐️ Truyền user đã hydrate: có friendship + mutualGroups
              user={profileUser}
              onChat={() => setShowProfile(false)}
              onAddFriend={() => setShowProfile(false)}
              onUnfriend={() => setShowProfile(false)}
            />
          </div>,
          document.body
        )}
    </>
  )
}
