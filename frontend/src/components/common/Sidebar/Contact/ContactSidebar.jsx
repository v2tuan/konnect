"use client"

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, UserSearch } from "lucide-react";
import { FaUsers, FaUsersCog } from "react-icons/fa";

export const CONTACT_TABS = [
  { name: "Friends list", value: "friends", icon: UserSearch },
  { name: "Joined groups and communities", value: "groups", icon: FaUsers },
  { name: "Friends requests", value: "friendsRequest", icon: UserPlus },
  { name: "Group and community invitations", value: "groupsRequest", icon: FaUsersCog }
]

export default function ContactSidebar({ value, onValueChange }) {
  return (
    <div className="h-full">
      <div className="p-4 border-b border-border">
        {/* Search */}
        <div className="relative w-[80%]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Tìm kiếm ..."
            className="pl-10 bg-input border-input-border focus:border-input-focus"
          />
        </div>
      </div>
      <Tabs
        orientation="vertical"
        value={value}
        onValueChange={onValueChange}
        className="max-w-md w-full flex flex-row items-start gap-4"
      >
        <TabsList className="shrink-0 grid grid-cols-1 min-w-full p-0 bg-background h-[200px]">
          {CONTACT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="border-l-2 border-transparent justify-start rounded-none data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:bg-primary/5 py-1.5"
            >
              <tab.icon className="h-5 w-5 me-2" /> {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
