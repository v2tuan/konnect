import { createConversation, getFriendsAPI } from "@/apis"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { connectSocket } from "@/lib/socket"
import { selectCurrentUser } from "@/redux/user/userSlice"
import { Camera, Image as ImageIcon, Search, Users, X } from "lucide-react"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

export default function CreateGroupDialog({ asChild = false, children }) {
  const [selectedMembers, setSelectedMembers] = useState([])
  const [groupName, setGroupName] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("Tất cả")
  const [groupImage, setGroupImage] = useState(null)
  const fileInputRef = useRef(null)

  const [friends, setFriends] = useState([])
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [debouncedQ, setDebouncedQ] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const navigate = useNavigate()
  const currentUser = useSelector(selectCurrentUser)

  // state phục vụ ảnh nhóm auto
  const [autoAvatarMembers, setAutoAvatarMembers] = useState([])
  const [autoAvatarSeed, setAutoAvatarSeed] = useState(Date.now())

  // đưa yourself (admin) vào danh sách ưu tiên
  const adminMember = useMemo(() => {
    if (!currentUser?._id) return null
    return {
      id: currentUser._id,
      name: currentUser.fullName || currentUser.username || "You",
      avatar: currentUser.avatarUrl,
    }
  }, [currentUser?._id, currentUser?.fullName, currentUser?.username, currentUser?.avatarUrl])

  const toggleMember = (member) => {
    setSelectedMembers((prev) =>
      prev.some((m) => m.id === member.id)
        ? prev.filter((m) => m.id !== member.id)
        : [...prev, member]
    )
  }

  const removeMember = (member) => {
    setSelectedMembers((prev) => prev.filter((itemMember) => itemMember.id !== member.id))
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = (e) => reject(e)
      reader.readAsDataURL(file)
    })
  }

  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    if (!file || !file.type.startsWith("image/")) return
    try {
      const dataUrl = await readFileAsDataURL(file)
      setGroupImage(dataUrl)
    } catch (err) {
      console.error("Lỗi khi đọc file:", err)
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const removeImageClick = (e) => {
    e.stopPropagation()
    setGroupImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setAutoAvatarSeed(Date.now())
  }

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // fetch friends
  useEffect(() => {
    let cancelled = false
    const fetchFriends = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await getFriendsAPI({ page, limit: 30, q: debouncedQ })
        if (cancelled) return
        const mapped = (res?.data || []).map((r) => ({
          id: r.friend.id || r.friend._id,
          name: r.friend.fullName || r.friend.username,
          username: r.friend.username,
          avatar: r.friend.avatarUrl,
          status: r.friend.status?.isOnline ? "online" : "offline",
          lastActiveAt: r.friend.status?.lastActiveAt || null,
        }))
        setFriends((prev) => (page === 1 ? mapped : [...prev, ...mapped]))
        setHasNext(!!res?.hasNext)
      } catch (e) {
        if (!cancelled) setError(e?.message || "Không tải được danh sách bạn bè.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchFriends()
    return () => {
      cancelled = true
    }
  }, [page, debouncedQ])

  // reset page khi đổi search
  useEffect(() => {
    setPage(1)
  }, [debouncedQ])

  // connect socket 1 lần
  useEffect(() => {
    if (currentUser?._id) {
      connectSocket(currentUser._id)
    }
  }, [currentUser?._id])

  // chọn ngẫu nhiên tối đa 3 member để build avatar fallback
  useEffect(() => {
    if (groupImage) return
    const totalSelectable = (adminMember ? 1 : 0) + selectedMembers.length
    if (!totalSelectable) {
      setAutoAvatarMembers([])
      return
    }

    const shuffled = [...selectedMembers].sort(
      () => 0.5 - Math.random() + (autoAvatarSeed % 17) / 100
    )

    const picked = []
    if (adminMember) picked.push(adminMember)
    for (const m of shuffled) {
      if (picked.length >= 3) break
      if (!picked.some((x) => x.id === m.id)) picked.push(m)
    }

    setAutoAvatarMembers(picked)
  }, [selectedMembers, groupImage, autoAvatarSeed, adminMember])

  // tổng member để tính badge
  const totalAvatarPool = (adminMember ? 1 : 0) + selectedMembers.length

  // HÀM QUAN TRỌNG: VẼ ẢNH NHÓM MẶC ĐỊNH
  // update theo yêu cầu: 
  // - nếu tổng >= 4: render kiểu Zalo -> lưới 2x2 (3 avatar + 1 ô badge số còn lại)
  // - nếu tổng < 4: giữ layout 1/2/3 tròn chéo như cũ
  const buildCompositeAvatarBlob = useCallback(async () => {
    if (groupImage) return null
    if (!autoAvatarMembers.length && totalAvatarPool < 4) return null

    const size = 256
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")

    // nền xám nhạt
    ctx.fillStyle = "#f3f4f6"
    ctx.fillRect(0, 0, size, size)

    // helper vẽ 1 avatar circle tại (cx,cy,r) bằng ảnh hoặc chữ cái
    async function drawMemberCircle(m, cx, cy, r) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.clip()

      const img = await new Promise((resolve) => {
        if (!m?.avatar) return resolve(null)
        const im = new window.Image()
        im.crossOrigin = "anonymous"
        im.onload = () => resolve(im)
        im.onerror = () => resolve(null)
        im.src = m.avatar
      })

      if (img) {
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
      } else {
        ctx.fillStyle = "#3b82f6"
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
        ctx.fillStyle = "#fff"
        ctx.font = `${r * 0.9}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText((m?.name?.[0] || "U").toUpperCase(), cx, cy + 2)
      }

      ctx.restore()

      // viền trắng
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = size * 0.015
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    // CASE A: tổng thành viên >=4 => layout Zalo 2x2
    if (totalAvatarPool >= 4) {
      // ta sẽ cần 3 người đầu tiên từ autoAvatarMembers (ưu tiên owner + 2 người khác)
      // nếu autoAvatarMembers ít hơn 3 (gần như không xảy ra nhưng cứ phòng hờ),
      // ta sẽ bổ sung tiếp từ selectedMembers để đủ 3.
      let visible = [...autoAvatarMembers]
      if (visible.length < 3) {
        for (const m of selectedMembers) {
          if (visible.length >= 3) break
          if (!visible.some((v) => v.id === m.id)) {
            visible.push(m)
          }
        }
      }
      visible = visible.slice(0, 3)

      const badgeValue = totalAvatarPool - 3

      // tọa độ 2x2 grid
      // cell00, cell01, cell10, cell11
      // bán kính nhỏ hơn để 4 hình tròn fit gọn
      const r = size * 0.23
      const cells = [
        { cx: size * 0.25, cy: size * 0.25 }, // top-left
        { cx: size * 0.75, cy: size * 0.25 }, // top-right
        { cx: size * 0.25, cy: size * 0.75 }, // bottom-left
      ]
      const badgeCell = { cx: size * 0.75, cy: size * 0.75 }

      // vẽ 3 avatar đầu
      for (let i = 0; i < visible.length; i++) {
        const m = visible[i]
        const { cx, cy } = cells[i]
        await drawMemberCircle(m, cx, cy, r)
      }

      // vẽ ô badge thứ 4 (bottom-right)
      ctx.beginPath()
      ctx.arc(badgeCell.cx, badgeCell.cy, r, 0, Math.PI * 2)
      ctx.fillStyle = "#6b7280" // xám đậm giống zalo-style bubble
      ctx.fill()

      ctx.fillStyle = "#fff"
      ctx.font = `${r * 0.9}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(
        badgeValue.toString(),
        badgeCell.cx,
        badgeCell.cy + 2
      )

      // stroke trắng cho badge
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = size * 0.015
      ctx.beginPath()
      ctx.arc(badgeCell.cx, badgeCell.cy, r, 0, Math.PI * 2)
      ctx.stroke()

      // done
      return new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          "image/png",
          0.92
        )
      })
    }

    // CASE B: tổng <4 => layout cũ (1 hình tròn lớn / 2 cạnh nhau / 3 tam giác)
    const count = autoAvatarMembers.length
    // fallback nếu vì lý do gì đó rỗng
    if (!count) {
      return new Promise((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          "image/png",
          0.92
        )
      })
    }

    const layouts = (() => {
      if (count === 1) {
        return [{ x: size / 2, y: size / 2, r: size * 0.45 }]
      }
      if (count === 2) {
        const r = size * 0.35
        return [
          { x: size * 0.35, y: size * 0.5, r },
          { x: size * 0.65, y: size * 0.5, r },
        ]
      }
      // count >=3
      const r = size * 0.3
      return [
        { x: size * 0.5, y: size * 0.32, r },
        { x: size * 0.3, y: size * 0.63, r },
        { x: size * 0.7, y: size * 0.63, r },
      ]
    })()

    for (let i = 0; i < Math.min(count, layouts.length); i++) {
      const m = autoAvatarMembers[i]
      const l = layouts[i]
      await drawMemberCircle(m, l.x, l.y, l.r)
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (b) => resolve(b),
        "image/png",
        0.92
      )
    })
  }, [autoAvatarMembers, totalAvatarPool, selectedMembers, groupImage])

  const handleCreateGroup = async () => {
    const payload = new FormData()
    payload.append("type", "group")
    payload.append("name", groupName)

    if (fileInputRef.current?.files?.[0]) {
      // user chọn ảnh thủ công
      payload.append("avatarUrl", fileInputRef.current.files[0])
    } else if (!groupImage) {
      // không chọn ảnh → generate avatar default theo logic trên
      const blob = await buildCompositeAvatarBlob()
      if (blob) {
        payload.append(
          "avatarUrl",
          new File([blob], "group-avatar.png", { type: "image/png" })
        )
      }
    }

    payload.append(
      "memberIds",
      JSON.stringify(selectedMembers.map((m) => m.id))
    )

    try {
      if (sending) return
      setSending(true)

      const response = await createConversation(payload)
      const newConversation =
        response?.conversation || response?.data || response

      setSelectedMembers([])
      setGroupName("")
      setGroupImage(null)
      setOpen(false)
      toast.success("Nhóm đã được tạo thành công!")
      setSending(false)

      if (newConversation?._id) {
        navigate(`/chats/${newConversation._id}`)
      }
    } catch (err) {
      console.error("Error creating group:", err)
      setSending(false)
      toast.error(
        err?.response?.data?.message ||
          "Không thể tạo nhóm. Vui lòng thử lại!"
      )
    }
  }

  const ContactItem = ({ contact }) => (
    <div
      className="flex items-center p-3 rounded-md border border-transparent cursor-pointer hover:bg-primary/10 hover:border-primary/50"
      onClick={() => toggleMember(contact)}
    >
      <div
        className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
          selectedMembers.some((m) => m.id == contact.id)
            ? "bg-blue-500 border-blue-500"
            : "border-gray-300"
        }`}
      >
        {selectedMembers.some((m) => m.id == contact.id) && (
          <div className="w-2 h-2 bg-white rounded-full"></div>
        )}
      </div>

      <Avatar className="w-10 h-10 mr-3">
        <AvatarImage src={contact.avatar} />
        <AvatarFallback>
          {contact.name?.[0]?.toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <span className="font-medium text-sm">{contact.name}</span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={asChild}>
        {asChild ? (
          children
        ) : (
          <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
            <Users size={24} className="mb-1" />
            <span className="text-xs">Create group</span>
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-[800px] min-w-[800px] w-[800px] h-[600px] p-0">
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl w-[800px] h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <DialogTitle asChild>
                <h2 className="font-semibold">Create Group</h2>
              </DialogTitle>
              <DialogClose asChild>
                <button className="p-1 rounded-full hover:bg-primary/50 hover:text-primary-foreground">
                  <X size={20} />
                </button>
              </DialogClose>
            </div>

            {/* Hidden description just to avoid warning */}
            <DialogDescription className="sr-only">
              Tạo nhóm trò chuyện mới và chọn thành viên.
            </DialogDescription>

            {/* Group Name + Avatar */}
            <div className="p-4 border-b">
              <div className="flex items-center space-x-3">
                <div
                  className="relative w-12 h-12 bg-secondary rounded-full flex items-center justify-center cursor-pointer hover:bg-secondary/80 group"
                  onClick={handleImageClick}
                >
                  {groupImage ? (
                    <>
                      <img
                        src={groupImage}
                        alt="Group"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={16} className="text-white" />
                      </div>
                      <button
                        type="button"
                        onClick={removeImageClick}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <>
                      {/* mặc định vẫn chỉ là icon camera như yêu cầu */}
                      <Camera
                        size={20}
                        className="text-gray-400 group-hover:text-gray-600"
                      />
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-transparent group-hover:border-primary/50"></div>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Nhập tên nhóm..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="flex-1 border-b border-blue-400 outline-none text-muted-foreground"
                />
              </div>

              {groupImage && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center">
                  <ImageIcon size={12} className="mr-1" />
                  Ảnh đại diện nhóm đã được chọn
                </div>
              )}
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại."
                  className="pl-10 rounded-full border border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Side - Contacts */}
              <div className="flex-1 flex flex-col border-r">
                <div className="flex-1 overflow-y-auto">
                  {friends.length > 0 && (
                    <div className="px-4 py-2">
                      {friends.map((friend) => (
                        <ContactItem key={friend.id} contact={friend} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side - Selected Members */}
              <div className="w-80 flex flex-col">
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Đã chọn
                    </span>
                    <span className="text-sm text-blue-600">
                      {selectedMembers.length}/100
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {selectedMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map((member) => (
                        <div
                          key={member.id}
                          className="inline-flex items-center bg-blue-100 rounded-full px-3 py-1"
                        >
                          <span className="text-sm text-blue-700">
                            {member.name}
                          </span>
                          <button
                            onClick={() => removeMember(member)}
                            className="text-blue-500 hover:text-blue-700 ml-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 mt-8">
                      <p className="text-sm">Chưa có thành viên nào được chọn</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-4 border-t">
              <Button
                variant="outline"
                className="px-6 py-2"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>

              <Button
                className="px-6 py-2"
                disabled={
                  selectedMembers.length === 0 ||
                  !groupName.trim() ||
                  sending
                }
                onClick={handleCreateGroup}
              >
                {sending ? "Creating Group..." : "Create Group"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}