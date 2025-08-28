import NavBar from '@/components/common/NavBar'
import { AppSidebar } from '@/components/common/Sidebar/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import HeroKonnect from './content'

function HomePage() {
  return (
    <>
      <SidebarProvider>

        <AppSidebar/>
        <div className="w-full">
          <NavBar/>
          <HeroKonnect/>
        </div>
      </SidebarProvider>
    </>
  )
}

export default HomePage