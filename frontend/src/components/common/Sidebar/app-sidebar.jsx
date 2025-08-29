import {
  BookOpen,
  Bot,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal
} from "lucide-react"
import * as React from "react"
import { useNavigate } from "react-router-dom"

import { NavMain } from "@/components/common/Sidebar/nav-main"
import { NavProjects } from "@/components/common/Sidebar/nav-projects"
import { NavUser } from "@/components/common/Sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "History", url: "#" },
        { title: "Starred", url: "#" },
        { title: "Settings", url: "#" }
      ]
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        { title: "Genesis", url: "#" },
        { title: "Explorer", url: "#" },
        { title: "Quantum", url: "#" }
      ]
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Introduction", url: "#" },
        { title: "Get Started", url: "#" },
        { title: "Tutorials", url: "#" },
        { title: "Changelog", url: "#" }
      ]
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" }
      ]
    }
  ],
  projects: [
    { name: "Design Engineering", url: "#", icon: Frame },
    { name: "Sales & Marketing", url: "#", icon: PieChart },
    { name: "Travel", url: "#", icon: Map }
  ]
}

function BrandButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <GalleryVerticalEnd className="h-5 w-5" />
      <div className="flex flex-col">
        <span className="font-semibold leading-none">Konnect</span>
        <span className="text-xs text-muted-foreground">Chat App V1</span>
      </div>
    </button>
  )
}


export function AppSidebar({ ...props }) {
  const navigate = useNavigate()
  const goHome = React.useCallback(() => navigate("/"), [navigate])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BrandButton onClick={goHome} />
        {/* Hoặc: <BrandLink /> */}
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
