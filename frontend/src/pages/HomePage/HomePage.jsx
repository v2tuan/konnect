import NavBar from "@/components/common/NavBar"
import { AppSidebar } from "@/components/common/Sidebar/app-sidebar"
import { ChatLayout } from "@/components/common/Chat/ChatLayout"
import { SidebarProvider } from "@/components/ui/sidebar"
import React from "react"

export default function Page() {
  const [activeMenu, setActiveMenu] = React.useState("Message")

  return (
    <SidebarProvider>
      <AppSidebar onMenuChange={(item) => setActiveMenu(item.title)} />
      <div className="w-full flex flex-col flex-1">
        <NavBar />
        <div className="flex-1 flex">
          {activeMenu === "Message" ? (
            <ChatLayout />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              {activeMenu ? `Chức năng "${activeMenu}" đang phát triển...` : null}
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  )
}