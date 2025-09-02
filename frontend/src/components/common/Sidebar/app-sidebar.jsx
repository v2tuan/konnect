"use client";

import * as React from "react";
import {
  BookUser,
  Brain,
  Cloud,
  Inbox,
  Trash2,
} from "lucide-react";

import { NavUser } from "@/components/common/Sidebar/nav-user";
import { ChatSidebar } from "@/components/common/Sidebar/Chat/ChatSidebar";
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
} from "@/components/ui/sidebar";
import ContactSidebar from "./Contact/ContactSidebar";
import { NavLink, useLocation } from "react-router-dom";

const data = {
  user: {
    name: "Đặng Đăng Duy",
    email: "duyproven987@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    { title: "Message", url: "/chats", icon: Inbox },
    { title: "Contact", url: "/contacts", icon: BookUser },
    { title: "Cloud", url: "/cloud", icon: Cloud },
    { title: "Block", url: "/block", icon: Trash2 },
    { title: "Agent Chat", url: "/agent", icon: Brain },
  ],
};

export function AppSidebar({
  chatState,
  contactTab,
  onContactTabChange,
  ...props
}) {
  const { open, setOpen } = useSidebar();
  const location = useLocation();

  const isMessage = location.pathname.startsWith("/chats");
  const isContact = location.pathname.startsWith("/contacts");

  return (
    <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row" {...props}>
      {/* Left rail */}
      <Sidebar collapsible="none" className="w-[180px] border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg">
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
                {data.navMain.map((item) => {
                  const active = location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      {/* Nếu SidebarMenuButton có prop asChild thì dùng: asChild + NavLink */}
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="px-2.5 md:px-2"
                        onClick={() => setOpen(true)} // mở pane giữa
                      >
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {/* Middle pane - Message list */}
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

      {/* Middle pane - Contact tabs */}
      {open && isContact && (
        <Sidebar collapsible="none" className="w-[450px] border-r bg-background">
          <ContactSidebar
            value={contactTab || "home"}
            onValueChange={onContactTabChange || (() => {})}
          />
        </Sidebar>
      )}
    </Sidebar>
  );
}