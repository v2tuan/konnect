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

export function AppSidebar({ onMenuChange, activeMenu, chatState, ...props }) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0])
  const { open, setOpen } = useSidebar()

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* Sidebar chính */}
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

      {/* ChatSidebar */}
      {open && activeMenu === "Message" && chatState && (
        <Sidebar 
          collapsible="none" 
          className="w-[450px] border-r bg-background"
        >
          <ChatSidebar
            chats={chatState.chats}
            contacts={chatState.contacts}
            selectedChat={chatState.selectedChat}
            onChatSelect={chatState.onChatSelect}
            currentView={chatState.currentView}
            onViewChange={chatState.onViewChange}
          />
        </Sidebar>
      )}
    </Sidebar>
  )
}