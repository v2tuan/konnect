"use client"

import React from "react"
import NavBar from "@/components/common/NavBar"
import { AppSidebar } from "@/components/common/Sidebar/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import MessagePage from "@/pages/MessagePage/MessagePage"

export default function Page() {
  const [activeMenu, setActiveMenu] = React.useState("Message")

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          activeMenu={activeMenu}
          onMenuChange={(item) => setActiveMenu(item.title)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <NavBar />
          <div className="flex-1 min-h-0">
            {activeMenu === "Message" ? (
              <MessagePage />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {`Chức năng "${activeMenu}" đang phát triển...`}
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}