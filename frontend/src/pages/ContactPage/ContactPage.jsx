"use client";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CONTACT_TABS } from "@/components/common/Sidebar/Contact/ContactSidebar";

export default function ContactPage({ value, onValueChange }) {
  return (
    <div className="h-full w-full p-4">
      <Tabs value={value} onValueChange={onValueChange} className="h-full">
        {CONTACT_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="h-full">
            <div className="h-[calc(100vh-180px)] border rounded-md flex items-center justify-center font-medium text-muted-foreground">
              {tab.name} Content
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
