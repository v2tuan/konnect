import NavBar from '@/components/common/NavBar'
import Settings from '@/components/common/Settings/Settings'
import { AppSidebar } from '@/components/common/Sidebar/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

function ProfilePage() {
  return (
    <div>
      <SidebarProvider>
        <AppSidebar/>
        <div className='w-full'>
          <NavBar/>
          <Settings />
        </div>
      </SidebarProvider>
    </div>
  )
}

export default ProfilePage