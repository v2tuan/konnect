"use client"

import {
  Bell,
  BookUser,
  Brain,
  Cloud,
  GalleryVerticalEnd,
  Inbox,
  Trash2
} from "lucide-react"

import { ChatSidebar } from "@/components/common/Sidebar/Chat/ChatSidebar"
import { NavUser } from "@/components/common/Sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { NavLink, useLocation } from "react-router-dom"
import ModeToggle from "../NavBar/ThemeToggle"
import ContactSidebar from "./Contact/ContactSidebar"
import CloudSidebar from "./Cloud/CloudSidebar"

const data = {
  user: {
    name: "Đặng Đăng Duy",
    email: "duyproven987@gmail.com",
    avatar: "/avatars/shadcn.jpg"
  },
  navMain: [
    { title: "Message", url: "/chats", icon: Inbox },
    { title: "Contact", url: "/contacts", icon: BookUser },
    { title: "Cloud", url: "/cloud", icon: Cloud },
    { title: "Block", url: "/block", icon: Trash2 },
    { title: "Agent Chat", url: "/agent", icon: Brain }
  ]
}

export function AppSidebar({
  chatState,
  contactTab,
  onContactTabChange,
  cloudTab,
  onCloudTabChange,
  ...props
}) {
  const { open, setOpen } = useSidebar()
  const location = useLocation()

  const isMessage = location.pathname.startsWith("/chats")
  const isContact = location.pathname.startsWith("/contacts")
  const isCloud = location.pathname.startsWith("/cloud")

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...props}
    >
      {/* Left rail - Luôn chỉ hiện icon, không expand */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon))] border-r"
      >
        <SidebarHeader className="flex items-center justify-center">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={{
                  children: "Konnect",
                  hidden: false
                }}
                className="w-full justify-center px-0"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="flex items-center">
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col items-center px-0">
              <SidebarMenu>
                {data.navMain.map((item) => {
                  const active = location.pathname.startsWith(item.url)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="w-full justify-center px-0"
                        tooltip={{
                          children: item.title,
                          hidden: false
                        }}
                        onClick={() => setOpen(true)} // mở submenu
                      >
                        <NavLink to={item.url} className="flex items-center justify-center">
                          <item.icon />
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="flex items-center justify-center gap-3">
          <Bell/>
          <ModeToggle/>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Middle pane - Message list (submenu) */}
      {open && isMessage && chatState && (
        <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
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

      {/* Middle pane - Contact tabs (submenu) */}
      {open && isContact && (
        <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
          <ContactSidebar
            value={contactTab || "home"}
            onValueChange={onContactTabChange || (() => {})}
          />
        </Sidebar>
      )}

      {open && isCloud && (
        <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
          <CloudSidebar
            value={cloudTab || "cloud"}
            onValueChange={onCloudTabChange || (() => {})}
          />
        </Sidebar>
      )}
    </Sidebar>
  )
}