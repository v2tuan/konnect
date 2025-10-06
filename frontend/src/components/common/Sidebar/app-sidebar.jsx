"use client"

import { Bell, BookUser, Brain, Cloud, GalleryVerticalEnd, Inbox, Trash2 } from "lucide-react"

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
import { useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import ModeToggle from "../NavBar/ThemeToggle"
import ContactSidebar from "./Contact/ContactSidebar"
import { useUnreadStore } from '../../../store/useUnreadStore.js'
import { useUnreadBoot } from '../../../hooks/useUnreadBoot.js'

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

export function AppSidebar(props) {
  // Preserve props
  const { chatState, contactTab, onContactTabChange, ...rest } = (() => {
    const clone = { ...props }
    delete clone.cloudTab
    delete clone.onCloudTabChange
    return clone
  })()
  const { open, setOpen } = useSidebar()
  const location = useLocation()

  const isMessage = location.pathname.startsWith("/chats")
  const isContact = location.pathname.startsWith("/contacts")
  // PATCH: Cloud không mở panel
  // const isCloud = location.pathname.startsWith("/cloud")

  useUnreadBoot()
  const totalConversations = useUnreadStore(s => s.totalConversations)

  // PATCH: chỉ mở khi là chats hoặc contacts
  useEffect(() => {
    const shouldOpen = isMessage || isContact
    if (open !== shouldOpen) setOpen(shouldOpen)
  }, [isMessage, isContact, open, setOpen])

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
      {...rest}
    >
      {/* Left rail */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon))] border-r"
      >
        <SidebarHeader className="flex items-center justify-center">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip={{ children: "Konnect", hidden: false }}
                className="
                  relative flex h-12 w-full items-center justify-center gap-0 p-0 leading-none
                  /* Giữ nguyên chiều cao khi sidebar ở chế độ icon */
                  group-data-[collapsible=icon]:!h-12
                  group-data-[collapsible=icon]:!w-full
                  group-data-[collapsible=icon]:!p-0
                "
              >
                <span
                  className="
                    flex h-8 w-8 items-center justify-center rounded-lg
                    bg-sidebar-primary text-sidebar-primary-foreground
                    /* Nếu muốn logo to hơn chút khi collapsed có thể tăng h-9 w-9 */
                    group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8
                  "
                >
                  <GalleryVerticalEnd className="h-4 w-4 block" />
                </span>
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
                  const needPanel = item.url === "/chats" || item.url === "/contacts" // PATCH
                  const isMessageItem = item.url === "/chats"
                  return (
                    <SidebarMenuItem key={item.title} className="relative overflow-visible">
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="w-full justify-center px-0 overflow-visible"
                        tooltip={{ children: item.title, hidden: false }}
                        // PATCH: chỉ mở panel nếu cần; ngược lại đóng (Cloud, Block, Agent)
                        onClick={() => setOpen(needPanel)}
                      >
                        <NavLink to={item.url} className="relative flex items-center justify-center">
                          <item.icon className="block" />
                          {isMessageItem && totalConversations > 0 && (
                            <span
                              className="absolute z-10 top-0 right-0 translate-x-1/3 -translate-y-1/3 min-w-5 h-5 rounded-full bg-red-500 text-white text-[10px] px-1 leading-none flex items-center justify-center shadow-sm"
                              aria-label={`${totalConversations} conversations have new messages`}
                            >
                              {totalConversations > 99 ? "99+" : totalConversations}
                            </span>
                          )}
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
          <Bell />
            <ModeToggle />
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Middle pane - Message list */}
      {open && isMessage && chatState && (
        <Sidebar collapsible="none" className="w-[450px] border-r">
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

      {/* Middle pane - Contact */}
      {open && isContact && (
        <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
          <ContactSidebar
            value={contactTab || "home"}
            onValueChange={onContactTabChange || (() => {})}
          />
        </Sidebar>
      )}
    </Sidebar>
  )
}
