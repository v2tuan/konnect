// AppSidebar.jsx
"use client"

import { BookUser, Brain, Cloud, Command, Inbox, Trash2 } from "lucide-react"
import React from "react"
import { NavUser } from "@/components/common/Sidebar/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem
} from "@/components/ui/sidebar"

export function AppSidebar({ onMenuChange, activeMenu, ...props }) {
  const navMain = [
    { title: "Message",   url: "/chats", icon: Inbox },
    { title: "PhoneBook", url: "#",      icon: BookUser },
    { title: "Cloud",     url: "#",      icon: Cloud },
    { title: "Block",     url: "#",      icon: Trash2 },
    { title: "Agent Model", url: "#",    icon: Brain },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Konnect</span>
                  <span className="truncate text-xs">Chat App Version 1.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    tooltip={{ children: item.title, hidden: false }}
                    onClick={() => onMenuChange?.({ title: item.title })}
                    isActive={activeMenu === item.title}
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
        <NavUser user={{ name: "shadcn", email: "m@example.com", avatarUrl: "/avatars/shadcn.jpg" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
