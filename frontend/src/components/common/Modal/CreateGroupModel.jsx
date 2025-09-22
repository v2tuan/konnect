import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@radix-ui/react-label"
import { Camera, Image, Search, Users, X } from "lucide-react"
import { useRef, useState } from "react"

export default function CreateGroupDialog() {
  const [selectedMembers, setSelectedMembers] = useState(['Nguyễn Văn A'])
  const [groupName, setGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Tất cả')
  const [groupImage, setGroupImage] = useState(null)
  const fileInputRef = useRef(null)

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

  const toggleMember = (memberName) => {
    setSelectedMembers(prev =>
      prev.includes(memberName)
        ? prev.filter(name => name !== memberName)
        : [...prev, memberName]
    )
  }

  const removeMember = (memberName) => {
    setSelectedMembers(prev => prev.filter(name => name !== memberName))
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

  const ContactItem = ({ contact, section = 'recent' }) => (
    <div
      className="flex items-center p-3 rounded-md border border-transparent cursor-pointer hover:bg-primary/10 hover:border-primary/50"
      onClick={() => toggleMember(contact.name)}
    >

      <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${selectedMembers.includes(contact.name)
        ? 'bg-blue-500 border-blue-500'
        : 'border-gray-300'
        }`}>
        {selectedMembers.includes(contact.name) && (
          <div className="w-2 h-2 bg-white rounded-full"></div>
        )}
      </div>
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3 text-white">
        {contact.avatar}
      </div>
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
                    <div className="px-4 py-2">
                      <h3 className="text-sm font-semibold mb-2">Trò chuyện gần đây</h3>
                      {recentContacts.map(contact => (
                        <ContactItem key={contact.name} contact={contact} />
                      ))}
                    </div>

                    {/* Alphabetical Contacts */}
                    {Object.entries(alphabetContacts).map(([letter, contacts]) => (
                      <div key={letter} className="px-4 py-2">
                        <h3 className="text-sm font-semibold mb-2">{letter}</h3>
                        {contacts.map(contact => (
                          <ContactItem key={contact.name} contact={contact} section="alphabet" />
                        ))}
                      </div>
                    ))}
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
                            <div className="w-4 h-4 bg-blue-500 rounded-full mr-2 flex items-center justify-center">
                              <span className="text-xs text-white">👨</span>
                            </div>
                            <span className="text-sm text-blue-700">{member}</span>
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
          {/* <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
                            Make changes to your profile here. Click save when you&apos;re
                            done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Name</Label>
              <Input id="name-1" name="name" defaultValue="Pedro Duarte" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="username-1">Username</Label>
              <Input id="username-1" name="username" defaultValue="@peduarte" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter> */}
        </DialogContent>
      </form>
    </Dialog>
  )
}