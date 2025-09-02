import { useState } from 'react';
import { ChatSidebar } from './ChatSidebar';
import { ChatArea } from './ChatArea';
import { UserProfile } from './UserProfile';
import { ContactsList } from './ContactsList';

const mockContacts = [
  {
    id: '1',
    name: 'Minh Tuấn',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    status: 'online'
  },
  {
    id: '2', 
    name: 'Thu Hương',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    status: 'away',
    lastSeen: '2 phút'
  },
  {
    id: '3',
    name: 'Đình Nam',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 
    status: 'offline',
    lastSeen: '1 giờ'
  },
  {
    id: '4',
    name: 'Hải Yến',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    status: 'online'
  }
];

const mockMessages = [
  {
    id: '1',
    text: 'Chào bạn! Bạn có khỏe không? 😊',
    timestamp: '14:32',
    isOwn: false,
    type: 'text'
  },
  {
    id: '2', 
    text: 'Mình khỏe, cảm ơn bạn! Hôm nay thế nào?',
    timestamp: '14:33',
    isOwn: true,
    type: 'text'
  },
  {
    id: '3',
    text: 'Hôm nay mình đi cafe với bạn bè, vui lắm! 🎉',
    timestamp: '14:35',
    isOwn: false,
    type: 'text',
    isPinned: true
  },
  {
    id: '4',
    text: 'Tuyệt vời! Mình cũng muốn đi cà phê với các bạn',
    timestamp: '14:36', 
    isOwn: true,
    type: 'text'
  },
  {
    id: '5',
    text: 'Lần sau mình rủ bạn nhé! 💪',
    timestamp: '14:37',
    isOwn: false,
    type: 'text',
    reactions: [{ emoji: '👍', count: 2 }, { emoji: '❤️', count: 1 }]
  }
];

const mockChats = [
  {
    id: '1',
    contact: mockContacts[0],
    messages: mockMessages,
    unreadCount: 2,
    lastMessage: mockMessages[mockMessages.length - 1]
  },
  {
    id: '2', 
    contact: mockContacts[1],
    messages: [],
    unreadCount: 0,
    lastMessage: {
      id: 'last1',
      text: 'OK nha, hẹn gặp lại!', 
      timestamp: '12:45',
      isOwn: true,
      type: 'text'
    }
  },
  {
    id: '3',
    contact: mockContacts[2], 
    messages: [],
    unreadCount: 5,
    lastMessage: {
      id: 'last2',
      text: 'Bạn có thời gian rảnh không?',
      timestamp: '10:30',
      isOwn: false, 
      type: 'text'
    }
  }
];

export function ChatLayout() {
  const [currentView, setCurrentView] = useState('chat');
  const [selectedChat, setSelectedChat] = useState(mockChats[0]);
  const [chats] = useState(mockChats);
  const [contacts] = useState(mockContacts);

  return (
    <div className="h-screen flex bg-background-chat overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-background-sidebar border-r border-border flex flex-col shadow-soft">
        <ChatSidebar 
          chats={chats}
          selectedChat={selectedChat}
          onChatSelect={setSelectedChat}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentView === 'chat' && selectedChat && (
          <ChatArea 
            chat={selectedChat}
            onSendMessage={(text) => {
              // Handle sending message
              console.log('Sending:', text);
            }}
          />
        )}
        
        {currentView === 'profile' && (
          <UserProfile />
        )}
        
        {currentView === 'contacts' && (
          <ContactsList 
            contacts={contacts}
            onContactSelect={(contact) => {
              // Find or create chat with this contact
              const existingChat = chats.find(c => c.contact.id === contact.id);
              if (existingChat) {
                setSelectedChat(existingChat);
                setCurrentView('chat');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}