"use client"

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { useDispatch, useSelector } from "react-redux"
import { clearCurrentUser, logoutUserAPI, selectCurrentUser } from "@/redux/user/userSlice"
import { useNavigate } from "react-router-dom"

export function NavUser() {
  const { isMobile, open } = useSidebar()
  const user = useSelector(selectCurrentUser)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleAccountClick = () => {
    navigate("/settings/account")
  }

  const handleLogoutClick = async () => {
    try {
      await dispatch(logoutUserAPI()).unwrap()
      dispatch(clearCurrentUser())
      navigate("/login")
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              aria-label="User menu"
              className="
                relative flex h-12 w-full items-center px-2 py-0 leading-none
                data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground
                gap-2
                /* Collapsed overrides */
                group-data-[collapsible=icon]:!justify-center
                group-data-[collapsible=icon]:!h-12
                group-data-[collapsible=icon]:!w-full
                group-data-[collapsible=icon]:!px-0
                group-data-[collapsible=icon]:!gap-0
              "
            >
              {/* Avatar wrapper FIX */}
              <div
                className="
                  flex items-center justify-center
                  h-8 w-8 aspect-square shrink-0 flex-none
                  rounded-lg overflow-hidden
                  bg-sidebar-primary text-sidebar-primary-foreground
                  ring-1 ring-black/5 dark:ring-white/10
                  [image-rendering:auto]
                "
              >
                <Avatar className="h-full w-full rounded-lg">
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                  <AvatarFallback className="rounded-lg text-xs font-medium">
                    {(user.fullName || 'U').slice(0,1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Hidden when collapsed */}
              <div
                className="
                  grid flex-1 min-w-0 text-left text-sm leading-tight
                  group-data-[collapsible=icon]:hidden
                "
              >
                <span className="truncate font-semibold">{user.fullName}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>

              <ChevronsUpDown
                className="
                  ml-auto size-4 shrink-0
                  group-data-[collapsible=icon]:hidden
                "
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                  <AvatarFallback className="rounded-lg">
                    {(user.fullName || 'U').slice(0,1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.fullName}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Sparkles />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleAccountClick}>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogoutClick}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}