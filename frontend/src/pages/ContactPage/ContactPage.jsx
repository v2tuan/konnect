import { CONTACT_TABS } from "@/components/common/Sidebar/Contact/ContactSidebar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useOutletContext } from "react-router-dom";
import { ListFriend } from "@/components/common/Sidebar/Contact/ListFriend";

export default function ContactPage() {
  // mở rộng context để lấy data cần cho ContactsList
  const { contactTab, setContactTab } = useOutletContext();

  return (
    <div className="h-full w-full p-4">
      <Tabs value={contactTab} onValueChange={setContactTab} className="h-full">
        {/* Friends list */}
        <TabsContent value="friends" className="h-full m-0">
          <div className="h-[calc(100vh-180px)] border rounded-md overflow-hidden">
            <ListFriend/>
          </div>
        </TabsContent>

        {/* Các tab còn lại giữ placeholder */}
        {CONTACT_TABS.filter(t => t.value !== "friends").map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="h-full m-0">
            <div className="h-[calc(100vh-180px)] border rounded-md flex items-center justify-center font-medium text-muted-foreground">
              {tab.name} Content
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
