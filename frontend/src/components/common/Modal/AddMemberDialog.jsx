import { addMemberToGroup, getFriendsAPI } from "@/apis"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { connectSocket } from '@/lib/socket'
import { selectCurrentUser } from "@/redux/user/userSlice"
import { Search, UserPlus, X } from "lucide-react"
import { useEffect, useRef, useState, useMemo } from "react" // <-- thêm useMemo
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

export default function AddMemberDialog({ existingMemberIds = [], conversationId }) {
  const [selectedMembers, setSelectedMembers] = useState([])
  const [friends, setFriends] = useState([])
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)

  const currentUser = useSelector(selectCurrentUser)

  // Memo hóa để dependency ổn định
  const excludeSet = useMemo(() => new Set([
    String(currentUser?._id || ''),
    ...existingMemberIds.map(String)
  ]), [currentUser?._id, existingMemberIds])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Fetch + filter luôn theo excludeSet
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await getFriendsAPI({ page, limit: 30, q: debouncedQ })
        if (cancelled) return
        const mapped = (res?.data || []).map(r => ({
          id: String(r.friend.id || r.friend._id),
            name: r.friend.fullName || r.friend.username,
          username: r.friend.username,
          avatar: r.friend.avatarUrl
        }))
        const filtered = mapped.filter(u => !excludeSet.has(String(u.id)))
        setFriends(prev => (page === 1 ? filtered : [...prev, ...filtered]))
      } catch (e) {
        console.error(e)
      }
    })()
    return () => { cancelled = true }
  }, [page, debouncedQ, excludeSet]) // <-- thêm excludeSet

  // Reset page khi search thay đổi
  useEffect(() => { setPage(1) }, [debouncedQ])

  // Khi excludeSet đổi (VD: conversation.members cập nhật) re-filter danh sách hiện tại
  useEffect(() => {
    setFriends(prev => prev.filter(f => !excludeSet.has(String(f.id))))
  }, [excludeSet])

  const toggleMember = (member) => {
    setSelectedMembers(prev =>
      prev.some(m => m.id === member.id)
        ? prev.filter(m => m.id !== member.id)
        : [...prev, member]
    )
  }

  const removeMember = (member) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== member.id))
  }

  const handleAddMembers = async () => {
    if (!conversationId) return toast.error('Thiếu conversationId')
    if (!selectedMembers.length) return
    try {
      setSending(true)
      const ids = selectedMembers.map(m => m.id)
      const res = await addMemberToGroup(conversationId, ids)
      const addedCount = res?.added?.length ?? ids.length
      toast.success(`Đã thêm ${addedCount} thành viên vào nhóm`)
      setSelectedMembers([])
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Không thể thêm thành viên')
    } finally {
      setSending(false)
    }
  }

  const ContactItem = ({ contact }) => (
    <div
      className="flex items-center p-3 rounded-md border border-transparent cursor-pointer hover:bg-primary/10 hover:border-primary/50"
      onClick={() => toggleMember(contact)}
    >
      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
        selectedMembers.some(m => m.id == contact.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
      }`}>
        {selectedMembers.some(m => m.id == contact.id) && <div className="w-2 h-2 bg-white rounded-full" />}
      </div>
      <Avatar className="w-10 h-10 mr-3">
        <AvatarImage src={contact.avatar} />
        <AvatarFallback>{contact.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <span className="font-medium text-sm">{contact.name}</span>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form onSubmit={(e) => { e.preventDefault(); handleAddMembers() }}>
        <DialogTrigger asChild>
          <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
            <UserPlus size={24} className="mb-1" />
            <span className="text-xs">Add members</span>
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-[800px] min-w-[800px] w-[800px] h-[600px] p-0">
          <div className="bg-background rounded-lg shadow-xl w-[800px] h-[600px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Add members</h2>
              <DialogClose asChild>
              </DialogClose>
            </div>

            {/* Search */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Nhập tên, số điện thoại..."
                  className="pl-10 rounded-full border border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col border-r">
                <div className="flex-1 overflow-y-auto">
                  <div className="px-4 py-2">
                    {friends.map(f => (<ContactItem key={f.id} contact={f} />))}
                  </div>
                </div>
              </div>

              {/* Selected */}
              <div className="w-80 flex flex-col">
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Đã chọn</span>
                    <span className="text-sm text-blue-600">{selectedMembers.length}/100</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedMembers.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMembers.map(m => (
                        <div key={m.id} className="inline-flex items-center bg-blue-100 rounded-full px-3 py-1">
                          <span className="text-sm text-blue-700">{m.name}</span>
                          <button onClick={() => removeMember(m)} className="text-blue-500 hover:text-blue-700 ml-1">
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
              <Button variant="outline" className="px-6" onClick={() => setOpen(false)}>Hủy</Button>
              <Button className="px-6" disabled={!selectedMembers.length || sending} onClick={handleAddMembers}>
                {sending ? 'Adding member...' : 'Add member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </form>
    </Dialog>
  )
}
