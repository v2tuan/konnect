"use client"

import * as React from "react"
import {
  BookUser,
  Brain,
  Cloud,
  Inbox,
  Trash2,
} from "lucide-react"

import { NavUser } from "@/components/common/Sidebar/nav-user"
import { ChatSidebar } from "@/components/common/Sidebar/Chat/ChatSidebar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"

// Mock data for chat
const mockContacts = [
  { id: "1", name: "Minh Tuấn", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", status: "online" },
  { id: "2", name: "Thu Hương", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face", status: "away", lastSeen: "2 phút" },
  { id: "3", name: "Đình Nam", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", status: "offline", lastSeen: "1 giờ" },
  { id: "4", name: "Hải Yến", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", status: "online" }
]

const mockMessages = [
  { id: "1", text: "Chào bạn! Bạn có khỏe không? 😊", timestamp: "14:32", isOwn: false, type: "text" },
  { id: "2", text: "Mình khỏe, cảm ơn bạn! Hôm nay thế nào?", timestamp: "14:33", isOwn: true, type: "text" },
  { id: "3", text: "Hôm nay mình đi cafe với bạn bè, vui lắm! 🎉", timestamp: "14:35", isOwn: false, type: "text", isPinned: true },
  { id: "4", text: "Tuyệt vời! Mình cũng muốn đi cà phê với các bạn", timestamp: "14:36", isOwn: true, type: "text" },
  { id: "5", text: "Lần sau mình rủ bạn nhé! 💪", timestamp: "14:37", isOwn: false, type: "text", reactions: [{ emoji: "👍", count: 2 }, { emoji: "❤️", count: 1 }] }
]

const mockChats = [
  { id: "1", contact: mockContacts[0], messages: mockMessages, unreadCount: 2, lastMessage: mockMessages[mockMessages.length - 1] },
  { id: "2", contact: mockContacts[1], messages: [], unreadCount: 0, lastMessage: { id: "last1", text: "OK nha, hẹn gặp lại!", timestamp: "12:45", isOwn: true, type: "text" } },
  { id: "3", contact: mockContacts[2], messages: [], unreadCount: 5, lastMessage: { id: "last2", text: "Bạn có thời gian rảnh không?", timestamp: "10:30", isOwn: false, type: "text" } }
]

// This is sample data.
const data = {
  user: {
    name: "Đặng Đăng Duy",
    email: "duyproven987@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Message", url: "/chats", icon: Inbox },
    { title: "PhoneBook", url: "#", icon: BookUser },
    { title: "Cloud", url: "#", icon: Cloud },
    { title: "Block", url: "#", icon: Trash2 },
    { title: "Agent Model", url: "#", icon: Brain },
  ],
}

export function AppSidebar({ onMenuChange, activeMenu, ...props }) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0])
  const { open, setOpen } = useSidebar()
  const [currentView, setCurrentView] = React.useState("chat")
  const [selectedChat, setSelectedChat] = React.useState(mockChats[0])

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* Sidebar chính - width nhỏ khi expanded */}
      <Sidebar
        collapsible="none"
        className="w-[180px] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Inbox className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Konnect</span>
                  <span className="truncate text-xs">Chat App Version...</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item)
                        setOpen(true)
                        if (onMenuChange) onMenuChange(item)
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {open && activeMenu === "Message" && (
        <Sidebar 
          collapsible="none" 
          className="w-[450px] border-r bg-background"
        >
          <ChatSidebar
            chats={mockChats}
            contacts={mockContacts}
            selectedChat={selectedChat}
            onChatSelect={setSelectedChat}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </Sidebar>
      )}
    </Sidebar>
  )
}