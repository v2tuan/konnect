import { CONTACT_TABS } from "@/components/common/Sidebar/Contact/ContactSidebar"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { useOutletContext } from "react-router-dom"

export default function ContactPage() {
  const { contactTab, setContactTab } = useOutletContext()

  return (
    <div className="h-full w-full p-4">
      <Tabs value={contactTab} onValueChange={setContactTab} className="h-full">
        {CONTACT_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="h-full">
            <div className="h-[calc(100vh-180px)] border rounded-md flex items-center justify-center font-medium text-muted-foreground">
              {tab.name} Content
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
