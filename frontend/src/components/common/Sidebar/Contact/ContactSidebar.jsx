"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Home, Settings, User } from "lucide-react";

export const CONTACT_TABS = [
  { name: "Home", value: "home", icon: Home },
  { name: "Profile", value: "profile", icon: User },
  { name: "Messages", value: "messages", icon: Bot },
  { name: "Settings", value: "settings", icon: Settings },
];

export default function ContactSidebar({ value, onValueChange }) {
  return (
    <Tabs
      orientation="vertical"
      value={value}
      onValueChange={onValueChange}
      className="max-w-md w-full flex flex-row items-start gap-4 justify-center"
    >
      <TabsList className="shrink-0 grid grid-cols-1 min-w-28 p-0 bg-background">
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
  );
}
