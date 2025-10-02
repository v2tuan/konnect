// src/components/chat/ChatArea.jsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from "@/components/ui/switch"
import { EyeOff, Pin, Shield, Trash, TriangleAlert } from 'lucide-react'
import CreateGroupDialog from '../../Modal/CreateGroupModel'
import MuteMenu from "@/components/common/Sidebar/Chat/MuteMenu.jsx"
import ConversationMediaPanel from './ConversationMediaPanel'
function ChatSidebarRight( { conversation, isOpen }) {
  return (
    <div
      className={`fixed flex flex-col top-0 right-0 h-full w-80 shadow-lg transform transition-transform duration-300 ease-in-out border-l ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex items-center justify-center p-4 border-b h-18">
        <h2 className="text-lg font-semibold">Conversation information</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        <div className="p-6 text-center border-b">
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            {conversation?.conversationAvatarUrl ? (
              <Avatar className="w-20 h-20">
                <AvatarImage src={conversation?.conversationAvatarUrl} />
                <AvatarFallback>{conversation?.displayName}</AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-2xl font-bold text-white">{conversation?.displayName}</span>
            )}
          </div>
          <div className="flex items-center justify-center mb-4">
            <h3 className="text-xl font-semibold">{conversation?.displayName}</h3>
          </div>

          <div className="flex justify-center space-x-8 mb-4">
            <MuteMenu conversationId={conversation?._id} />
            <button className="flex flex-col items-center p-3 rounded-lg transition-colors cursor-pointer">
              <Pin size={24} className="mb-1" />
              <span className="text-xs">Pin conversation</span>
            </button>
            <CreateGroupDialog />
          </div>
        </div>

        {/* ✅ Thay mock bằng panel media động */}
        <Accordion type="multiple" className="w-full" defaultValue={["media", "file", "link", "security"]}>
          <AccordionItem value="media">
            <AccordionTrigger className="text-base p-4">Ảnh & Video</AccordionTrigger>
            <AccordionContent>
              <ConversationMediaPanel
                conversationId={conversation?._id}
                kind="visual" // ✅ chỉ Image/Video
                defaultTab="image"
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="files">
            <AccordionTrigger className="text-base p-4">Audio & File</AccordionTrigger>
            <AccordionContent>
              <ConversationMediaPanel
                conversationId={conversation?._id}
                kind="binary" // ✅ chỉ Audio/File
                defaultTab="audio"
              />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="security">
            <AccordionTrigger className="text-base p-4">Thiết lập bảo mật</AccordionTrigger>
            <AccordionContent>
              <div className="px-4 pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield size={18} className="mr-3" />
                    <div>
                      <p className="text-sm font-medium">Tin nhắn tự xóa</p>
                      <p className="text-xs">Không bao giờ</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <EyeOff size={18} className="mr-3" />
                    <span className="text-sm font-medium">Ẩn trò chuyện</span>
                  </div>
                  <Switch
                    className="
                        data-[state=checked]:bg-primary
                        data-[state=unchecked]:bg-muted-foreground
                      "
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center mb-2">
                    <TriangleAlert size={18} className="mr-3" />
                    <span className="text-sm">Báo xấu</span>
                  </div>
                  <div className="flex items-center text-destructive">
                    <Trash size={18} className="mr-3" />
                    <span className="text-sm">Xóa lịch sử trò chuyện</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}

export default ChatSidebarRight