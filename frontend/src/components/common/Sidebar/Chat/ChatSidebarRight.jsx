import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from "@/components/ui/switch"
import { EyeOff, Pin, Shield, Trash, TriangleAlert, LogOut } from 'lucide-react'
import CreateGroupDialog from '../../Modal/CreateGroupModel'
import MuteMenu from "@/components/common/Sidebar/Chat/MuteMenu.jsx"
import ConversationMediaPanel from './ConversationMediaPanel'
import { deleteConversationAPI, leaveGroupAPI } from "@/apis"
import { toast } from "react-toastify"
import { useNavigate, useParams } from "react-router-dom"

function ChatSidebarRight({ conversation, isOpen }) {
  const navigate = useNavigate()
  const { conversationId: activeIdFromURL } = useParams()

  const handleDeleteConversation = async (conversationId) => {
    try {
      const confirmed = window.confirm('Bạn có chắc chắn muốn xóa lịch sử cuộc trò chuyện này? Hành động này không thể hoàn tác.')

      if (!confirmed) return

      await deleteConversationAPI(conversationId, { action: 'delete' })

      window.dispatchEvent(new CustomEvent('conversation:deleted', {
        detail: { conversationId }
      }))

      toast.success('Đã xóa cuộc trò chuyện thành công')

      if (activeIdFromURL === conversationId) {
        navigate('/')
      }

    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi xóa cuộc trò chuyện')
    }
  }

  const handleLeaveGroup = async (conversationId) => {
    try {
      const confirmed = window.confirm('Bạn có chắc chắn muốn rời khỏi nhóm này?')

      if (!confirmed) return

      await leaveGroupAPI(conversationId, { action: 'leave' })

      window.dispatchEvent(new CustomEvent('conversation:deleted', {
        detail: { conversationId }
      }))

      toast.success('Đã rời khỏi nhóm thành công')

      if (activeIdFromURL === conversationId) {
        navigate('/')
      }

    } catch (error) {
      console.error('Error leaving group:', error)
      toast.error(error.message || 'Có lỗi xảy ra khi rời nhóm')
    }
  }

  return (
    <div
      className={`fixed flex flex-col top-0 right-0 bg-sidebar h-full w-80 shadow-lg transform transition-transform duration-300 ease-in-out border-l overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-center p-4 border-b h-18 shrink-0">
        <h2 className="text-lg font-semibold truncate">Conversation information</h2>
      </div>

      {/* ✅ Thêm overflow-hidden và max-width để tránh scrollbar ngang */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 max-w-full">
        <div className="p-6 text-center border-b">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shrink-0">
            {conversation?.conversationAvatarUrl ? (
              <Avatar className="w-20 h-20">
                <AvatarImage src={conversation?.conversationAvatarUrl} />
                <AvatarFallback>{conversation?.displayName?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-2xl font-bold text-white">{conversation?.displayName?.[0] || 'U'}</span>
            )}
          </div>
          <div className="flex items-center justify-center mb-4">
            {/* ✅ Thêm truncate để tránh text dài */}
            <h3 className="text-xl font-semibold truncate max-w-full px-2">{conversation?.displayName}</h3>
          </div>

          <div className="flex justify-center items-center gap-4 mb-4">
            <MuteMenu conversationId={conversation?._id} />
            <button className="flex flex-col items-center p-2 rounded-lg transition-colors cursor-pointer min-w-0">
              <Pin size={24} className="mb-1" />
              <span className="text-xs">Pin</span>
            </button>
            <CreateGroupDialog />
          </div>
        </div>

        {/* ✅ Thêm overflow-hidden cho Accordion */}
        <div className="overflow-hidden">
          <Accordion type="multiple" className="w-full" defaultValue={["media", "files", "members", "security"]}>
            <AccordionItem value="media">
              <AccordionTrigger className="text-base p-4">Ảnh & Video</AccordionTrigger>
              <AccordionContent className="overflow-hidden">
                <ConversationMediaPanel
                  conversationId={conversation?._id}
                  kind="visual"
                  defaultTab="image"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="files">
              <AccordionTrigger className="text-base p-4">Audio & File</AccordionTrigger>
              <AccordionContent className="overflow-hidden">
                <ConversationMediaPanel
                  conversationId={conversation?._id}
                  kind="binary"
                  defaultTab="audio"
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="members">
              <AccordionTrigger className="text-base p-4">Thành viên nhóm</AccordionTrigger>
              <AccordionContent className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2">
                  {(conversation?.type !== "group" || !Array.isArray(conversation?.group?.members) || !conversation.group.members.length) ? (
                    <div className="text-sm text-muted-foreground">Cuộc trò chuyện này không phải nhóm hoặc chưa có thành viên.</div>
                  ) : (
                    conversation.group.members.map(m => {
                      const name = m?.fullName || m?.username || "User"
                      const initial = (name?.[0] || "U").toUpperCase()
                      return (
                        <div key={m._id || m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={m?.avatarUrl || ""} />
                            <AvatarFallback>{initial}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{name}</div>
                            {/* Nếu BE có status { isOnline, lastActiveAt } thì hiện thêm */}
                            {m?.status?.isOnline !== undefined && (
                              <div className="text-xs text-muted-foreground">
                                {m.status.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="security">
              <AccordionTrigger className="text-base p-4">Thiết lập bảo mật</AccordionTrigger>
              <AccordionContent className="overflow-hidden">
                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <Shield size={18} className="mr-3 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">Tin nhắn tự xóa</p>
                        <p className="text-xs truncate">Không bao giờ</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <EyeOff size={18} className="mr-3 shrink-0" />
                      <span className="text-sm font-medium truncate">Ẩn trò chuyện</span>
                    </div>
                    <Switch
                      className="
                          data-[state=checked]:bg-primary
                          data-[state=unchecked]:bg-muted-foreground
                          shrink-0
                        "
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center mb-5 min-w-0">
                      <TriangleAlert size={18} className="mr-3 shrink-0" />
                      <span className="text-sm truncate">Báo xấu</span>
                    </div>

                    <div className="flex items-center text-destructive mb-5 cursor-pointer min-w-0" onClick={() => handleDeleteConversation(conversation?._id)}>
                      <Trash size={18} className="mr-3 shrink-0" />
                      <span className="text-sm truncate">Xóa lịch sử trò chuyện</span>
                    </div>

                    {conversation?.type === "group" && (
                      <div className="flex items-center text-destructive mb-5 cursor-pointer min-w-0" onClick={() => handleLeaveGroup(conversation?._id)}>
                        <LogOut size={18} className="mr-3 shrink-0" />
                        <span className="text-sm truncate">Leave group</span>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  )
}

export default ChatSidebarRight