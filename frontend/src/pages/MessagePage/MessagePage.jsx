import { useOutletContext } from "react-router-dom";

// ví dụ: MessageBody / MessageList ... của bạn
export default function MessagePage() {
  const { chatState } = useOutletContext();

  // chatState: {chats, contacts, selectedChat, currentView, onChatSelect, onViewChange, onContactSelect, onSendMessage}
  // Render UI hiện có của bạn ở đây, ví dụ:
  return (
    <div className="h-full w-full">
      {/* ... UI chat của bạn ... */}
      <div className="p-4 text-muted-foreground">
        Room: {chatState?.selectedChat?.contact?.name}
      </div>
    </div>
  );
}
