import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, UserPlus, Users, UserSearch, MessageCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { searchUserByUsername, getConversationByUserId } from "@/apis"
import CreateGroupDialog from "../../Modal/CreateGroupModel"
import AddFriendModal from "../../Modal/AddFriendModal"

export const CONTACT_TABS = [
  { name: "Friends list", value: "friends", icon: UserSearch },
  { name: "Friends requests", value: "friendsRequest", icon: UserPlus }
]

export default function ContactSidebar({ value, onValueChange }) {
  const navigate = useNavigate()
  const [openAddFriend, setOpenAddFriend] = useState(false)

  // --- Search state ---
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [openDropdown, setOpenDropdown] = useState(false)
  const debounceRef = useRef(null)
  const searchBoxRef = useRef(null)

  // Debounce fetch users
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      setOpenDropdown(false)
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchUserByUsername(query.trim())
        setResults(Array.isArray(data) ? data : [])
        setOpenDropdown(true)
      } catch (e) {
        setResults([])
        setOpenDropdown(true)
      } finally {
        setLoading(false)
      }
    }, 450)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Close dropdown when clicking outside search box
  useEffect(() => {
    const onDocClick = (e) => {
      if (!searchBoxRef.current) return
      if (!searchBoxRef.current.contains(e.target)) setOpenDropdown(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  // helper rút conversationId từ nhiều kiểu payload khác nhau
  const extractConvId = (r) =>
    r?.conversationId ||
  r?.id ||
  r?._id ||
  r?.data?.conversationId ||
  r?.data?.id || // <— quan trọng: data.id như bạn gửi
  r?.data?._id ||
  r?.conversation?.id ||
  r?.conversation?._id

  const openDirect = useCallback(async (user) => {
    try {
      const targetId = user?._id || user?.id
      if (!targetId) return

      const res = await getConversationByUserId(targetId)
      const convId = extractConvId(res)

      if (!convId) {
      // debug nhẹ nếu cần
        console.warn("getConversationByUserId() raw response:", res)
        toast.error("Không mở được cuộc hội thoại")
        return
      }

      navigate(`/chats/${convId}`)
      setQuery("")
      setResults([])
      setOpenDropdown(false)
    } catch (e) {
      console.error(e)
      toast.error(e?.message || "Có lỗi khi mở cuộc hội thoại")
    }
  }, [navigate])


  // Enter to open first result
  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (results.length > 0) openDirect(results[0])
    }
  }

  return (
    <div className="h-full">
      <div className="p-4 border-b border-border flex flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative w-[80%]" ref={searchBoxRef}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Tìm kiếm ..."
            className="pl-10 bg-input border-input-border focus:border-input-focus"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => {
              if (results.length > 0) setOpenDropdown(true)
            }}
          />
          {/* Dropdown kết quả — chỉ thêm trong vùng search, không ảnh hưởng UI khác */}
          {openDropdown && (
            <div className="absolute z-50 mt-2 w-full bg-popover border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Đang tìm…</div>
              )}
              {!loading && results.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Không tìm thấy người dùng
                </div>
              )}
              {!loading && results.length > 0 && (
                <div className="py-1">
                  {results.map((u) => {
                    const name = u?.fullName || u?.username || "User"
                    const initial = (name?.[0] || "U").toUpperCase()
                    return (
                      <button
                        key={u._id || u.id}
                        type="button"
                        onClick={() => openDirect(u)}
                        className="w-full text-left p-2.5 hover:bg-accent/60 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={u?.avatarUrl || ""} />
                            <AvatarFallback>{initial}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{name}</div>
                            {u?.username && (
                              <div className="text-xs text-muted-foreground truncate">
                                @{u.username}
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
            </div>
          )}
        </div>
        {/* UserPlus => mở AddFriendModal (không đổi UI, chỉ thêm onClick + cursor) */}
        <button
          type="button"
          className="p-1 rounded hover:bg-muted transition-colors"
          onClick={() => setOpenAddFriend(true)}
          title="Add friend"
        >
          <UserPlus />
        </button>

        {/* Users => CreateGroup (theo logic ChatSidebarRight) */}
        <CreateGroupDialog asChild>
          <button
            type="button"
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Create group"
          >
            <Users />
          </button>
        </CreateGroupDialog>
      </div>

      {/* Tabs (GIỮ NGUYÊN) */}
      <Tabs
        orientation="vertical"
        value={value}
        onValueChange={onValueChange}
        className="max-w-md w-full flex flex-row items-start gap-4"
      >
        <TabsList className="shrink-0 grid grid-cols-1 min-w-full p-0 bg-background h-[200px]">
          {CONTACT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="border-l-2 border-transparent justify-start rounded-none data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary/5 py-1.5"
            >
              <tab.icon className="h-5 w-5 me-2" /> {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <AddFriendModal open={openAddFriend} onClose={() => setOpenAddFriend(false)} />

    </div>
  )
}
