import { useOutletContext } from "react-router-dom";
import { ChatArea } from "@/components/common/Sidebar/Chat/ChatArea"; // đúng path của bạn

export default function MessagePage() {
  const { chatState } = useOutletContext();
  const chat = chatState?.selectedChat;

  if (!chat) {
    return (
      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
        Chọn một cuộc trò chuyện để bắt đầu
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ChatArea
        chat={chat}
        onSendMessage={chatState.onSendMessage}
      />
    </div>
  );
}
