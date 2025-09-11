import { Bell, Menu, MessageSquareMore, Search, Sparkles, Users2 } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import ModeToggle from "./ThemeToggle"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/40">
      <div className="mx-auto max-w-full px-3 sm:px-4 lg:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Left: Mobile menu + Logo */}
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <Separator />
                <nav className="p-3">
                  <MobileNavItem icon={<MessageSquareMore className="h-4 w-4" />} label="Chats" href="/" />
                  <MobileNavItem icon={<Users2 className="h-4 w-4" />} label="Contacts" href="/contacts" />
                  <MobileNavItem icon={<Sparkles className="h-4 w-4" />} label="Explore" href="/explore" />
                  <Separator className="my-3" />
                  <div className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[.03] dark:bg-white/[.06] p-2">
                    <Search className="h-4 w-4 opacity-70" />
                    <Input className="h-8 border-0 bg-transparent focus-visible:ring-0" placeholder="Search…" />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <SidebarTrigger className="-ml-1 flex flex-row" />
          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 justify-between">
            <ModeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-black dark:bg-white ring-2 ring-white dark:ring-black" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-72 space-y-1 overflow-auto">
                  {[
                    { id: 1, text: "New message from Anh Tran" },
                    { id: 2, text: "Minh added you to Team Konnect" },
                    { id: 3, text: "Update available — click to refresh" }
                  ].map((n) => (
                    <div key={n.id} className="rounded-lg border border-black/10 dark:border-white/10 p-2 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.06] cursor-pointer">
                      {n.text}
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

function MobileNavItem({ icon, label, href }) {
  return (
    <Link to={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-black/[.03] dark:hover:bg-white/[.06]">
      <span className="grid h-8 w-8 place-items-center rounded-xl border border-black/10 dark:border-white/10">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}
