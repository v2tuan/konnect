import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User } from "lucide-react"
import { useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import AccountTab from "./AccountTab"
import SecurityTab from "./SecurityTab"

const TABS = { ACCOUNT: "account", SECURITY: "security" }

function Settings() {
  const { pathname } = useLocation()
  const activeTab = useMemo(() => {
    if (pathname.startsWith("/settings/security")) return TABS.SECURITY
    return TABS.ACCOUNT
  }, [pathname])

  return (
    /* Căn giữa toàn trang */
    <div className="w-full min-h-[100vh] flex justify-center px-4 py-8">
      {/* Khung tối đa và căn giữa */}
      <div className="w-full max-w-[1000px] mx-auto">
        <Card className="border-none shadow-none py-0">
          <CardContent className="px-0 pt-0">
            <Tabs value={activeTab} className="w-full">
              {/* Header Tabs: thu gọn theo max-width và căn giữa */}
              <div className="border-b border-border">
                <div className="mx-auto">
                  <TabsList className="h-14 w-full flex rounded-none bg-transparent p-0 border-b border-border">
                    <TabsTrigger
                      value={TABS.ACCOUNT}
                      asChild
                      className="flex-1 h-full flex items-center justify-center gap-2
                                border-b-2 border-transparent
                                data-[state=active]:border-primary
                                data-[state=active]:text-primary
                                text-xl font-semibold
                                hover:bg-muted/20 transition-colors"
                    >
                      <Link to="/settings/account" className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        <span>Account</span>
                      </Link>
                    </TabsTrigger>

                    <TabsTrigger
                      value={TABS.SECURITY}
                      asChild
                      className="flex-1 h-full flex items-center justify-center gap-2
                                border-b-2 border-transparent
                                data-[state=active]:border-primary
                                data-[state=active]:text-primary
                                text-xl font-semibolb
                                hover:bg-muted/20 transition-colors"
                    >
                      <Link to="/settings/security" className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        <span>Security</span>
                      </Link>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Nội dung Tabs: bám theo max-width và căn giữa */}
              <div className="mx-auto max-w-[760px]">
                <TabsContent value={TABS.ACCOUNT} className="pt-8">
                  <AccountTab />
                </TabsContent>

                <TabsContent value={TABS.SECURITY} className="pt-8">
                  <SecurityTab />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings
