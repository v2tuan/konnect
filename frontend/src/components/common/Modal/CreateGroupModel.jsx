import { getFriendsAPI } from "@/apis"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Label } from "@radix-ui/react-label"
import { fr } from "date-fns/locale"
import { Camera, Image, Search, Users, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function CreateGroupDialog() {
  const [selectedMembers, setSelectedMembers] = useState([]) // Mảng tên thành viên đã chọn
  const [groupName, setGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Tất cả')
  const [groupImage, setGroupImage] = useState(null)
  const fileInputRef = useRef(null)
  const [friends, setFriends] = useState([]) /** @type {[FriendUI[], any]} */
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [debouncedQ, setDebouncedQ] = useState('')
  const [searchQuery, setSearchQuery] = useState('')


  const tabs = ['Tất cả', 'Khách hàng', 'Gia đình', 'Công việc', 'Bạn bè', 'Trả lời sau']

  const recentContacts = [
    { name: 'Nguyễn Văn A', avatar: '👨', isSelected: true },
    { name: 'Trần Văn B', avatar: '👨' },
    { name: 'Duy Lon', avatar: '👨' },
    { name: 'Nguyễn Văn D', avatar: '👨' },
    { name: 'Nguyễn Văn E', avatar: '👨' }
  ]

  const alphabetContacts = {
    'F': [{ name: 'Nguyễn Văn F', avatar: '👨' }],
    'G': [
      { name: 'Nguyễn Văn G', avatar: '👨' },
      { name: 'Nguyễn Văn H', avatar: '👨' }
    ]
  }

  const toggleMember = (member) => {
    setSelectedMembers(prev =>
      prev.some(m => m.id === member.id)        // kiểm tra đã có chưa
        ? prev.filter(m => m.id !== member.id)  // remove
        : [...prev, member]                     // add
    );
  };


  const removeMember = (member) => {
    setSelectedMembers(prev => prev.filter(itemMember => itemMember.id !== member.id))
  }

  // Đọc ảnh bằng FileReader chuyển thành base64 để hiển thị lại
  // Wrapper để đọc file trả về Promise cho dễ await
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      // Đăng ký callback: khi việc đọc file hoàn tất thành công, onload sẽ được gọi
      reader.onload = () => resolve(reader.result)
      reader.onerror = (e) => reject(e)
      // Bắt đầu đọc file dưới dạng Data URL (base64). Đây là thao tác bất đồng bộ:
      // readAsDataURL trả về ngay, nhưng quá trình đọc file sẽ chạy trong nền.
      // Khi đọc xong, reader.onload mới được gọi.
      reader.readAsDataURL(file)
    })
  }

  // Handler async
  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    if (!file || !file.type.startsWith('image/')) return

    try {
      // await chờ cho file được đọc xong rồi mới tiếp tục
      const dataUrl = await readFileAsDataURL(file)
      setGroupImage(dataUrl)
    } catch (err) {
      console.error('Lỗi khi đọc file:', err)
    }
  }


  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const removeImage = () => {
    setGroupImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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

  const ContactItem = ({ contact, section = 'recent' }) => (
    <div
      className="flex items-center p-3 rounded-md border border-transparent cursor-pointer hover:bg-primary/10 hover:border-primary/50"
      onClick={() => toggleMember(contact)}
    >

      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${selectedMembers.some(m => m.id == contact.id)
        ? 'bg-blue-500 border-blue-500'
        : 'border-gray-300'
        }`}>
        {selectedMembers.some(m => m.id == contact.id) && (
          <div className="w-2 h-2 bg-white rounded-full"></div>
        )}
      </div>
      <Avatar className="w-10 h-10 mr-3">
        <AvatarImage src={contact.avatar} />
        <AvatarFallback>{contact.name}</AvatarFallback>
      </Avatar>

      <span className="font-medium text-sm">{contact.name}</span>
    </div>
  )
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
            <Users size={24} className="mb-1" />
            <span className="text-xs">Create a chat group</span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[800px] min-w-[800px] w-[800px] h-[600px] p-0">
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-xl w-[800px] h-[600px] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">Create Group</h2>
                <DialogClose asChild>
                  <button className="p-1 rounded-full hover:bg-primary/50">
                    <X size={20} />
                  </button>
                </DialogClose>
              </div>

              {/* Group Name Input */}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage()
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera size={20} className="text-gray-400 group-hover:text-gray-600" />
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-transparent group-hover:border-primary/50"></div>
                      </>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Nhập tên nhóm..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="flex-1 border-b border-blue-400 outline-none text-muted-foreground"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                {groupImage && (
                  <div className="mt-2 text-xs text-muted-foreground flex items-center">
                    <Image size={12} className="mr-1" />
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
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Main Content - Split Layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Side - Contacts */}
                <div className="flex-1 flex flex-col border-r">
                  {/* Contacts List */}
                  <div className="flex-1 overflow-y-auto">
                    {/* Recent Contacts */}
                    {/* <div className="px-4 py-2">
                      <h3 className="text-sm font-semibold mb-2">Trò chuyện gần đây</h3>
                      {recentContacts.map(contact => (
                        <ContactItem key={contact.name} contact={contact} />
                      ))}
                    </div> */}

                    {/* Alphabetical Contacts */}
                    {/* {Object.entries(alphabetContacts).map(([letter, contacts]) => (
                      <div key={letter} className="px-4 py-2">
                        <h3 className="text-sm font-semibold mb-2">{letter}</h3>
                        {contacts.map(contact => (
                          <ContactItem key={contact.name} contact={contact} section="alphabet" />
                        ))}
                      </div>
                    ))} */}

                    {/* Friends from API */}
                    {friends.length > 0 && (
                      <div className="px-4 py-2">
                        {friends.map(friend => (
                          <ContactItem key={friend.id} contact={friend} section="alphabet" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Selected Members */}
                <div className="w-80 flex flex-col">
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Đã chọn</span>
                      <span className="text-sm text-blue-600">{selectedMembers.length}/100</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {selectedMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map(member => (
                          <div key={member} className="inline-flex items-center bg-blue-100 rounded-full px-3 py-1">
                            <span className="text-sm text-blue-700">{member.name}</span>
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
                <button className="px-6 py-2 rounded-md text-muted-foreground hover:bg-secondary">
                  Hủy
                </button>

                <button
                  className={`px-6 py-2 rounded-md ${selectedMembers.length > 0 && groupName.trim()
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  disabled={selectedMembers.length === 0 || !groupName.trim()}
                >
                  Tạo nhóm
                </button>

              </div>
            </div>
          </div>
        </DialogContent>
      </form>
    </Dialog>
  )
}