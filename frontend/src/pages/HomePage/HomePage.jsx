import NavBar from '@/components/common/NavBar'
import { AppSidebar } from '@/components/common/Sidebar/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

function HomePage() {
  return (
    <>
      <SidebarProvider>

        <AppSidebar/>
        <NavBar/>
      </SidebarProvider>
    </>
  )
}

export default HomePage