import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { logoutUserAPI, selectCurrentUser } from "@/redux/user/userSlice"
import { LogOut, Settings, User2 } from "lucide-react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"

function UserMenu() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await dispatch(logoutUserAPI(false))
    // tuỳ flow: có thể điều hướng thẳng, hoặc rely vào ProtectedRoute
    navigate("/login")
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 rounded-xl pl-1 pr-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name} />
            <AvatarFallback className="text-xs">{currentUser?.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block max-w-[120px] truncate text-sm font-medium">{currentUser?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">Signed in as {currentUser?.fullName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href="/settings/account" className="flex w-full items-center gap-2">
              <User2 className="h-4 w-4" /> Profile
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault() // giữ menu khỏi điều hướng mặc định
            handleLogout()
          }}
          className="text-red-600 focus:text-red-700">
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default UserMenu