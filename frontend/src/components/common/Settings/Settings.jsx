import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User } from "lucide-react"
import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import AccountTab from "./AccountTab"
import SecurityTab from "./SecurityTab"

const TABS = { ACCOUNT: "account", SECURITY: "security" }

function Settings() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const activeTab = useMemo(() => {
    if (pathname.startsWith("/settings/security")) return TABS.SECURITY
    return TABS.ACCOUNT
  }, [pathname])

  const onTabChange = (val) => {
    if (val === TABS.SECURITY) navigate("/settings/security", { replace: false })
    else navigate("/settings/account", { replace: false })
  }

  return (
    <div className="w-full min-h-[100vh] flex justify-center px-4 py-8">
      <div className="w-full max-w-[1000px] mx-auto">
        <Card className="border-none shadow-none py-0">
          <CardContent className="px-0 pt-0">
            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
              {/* Header */}
              <div className="border-b border-border">
                <div className="mx-auto">
                  <TabsList className="h-14 w-full flex rounded-none bg-transparent p-0 border-b border-border">
                    <TabsTrigger
                      value={TABS.ACCOUNT}
                      className="flex-1 h-full flex items-center justify-center gap-2
                                 border-b-2 border-transparent
                                 data-[state=active]:border-primary
                                 data-[state=active]:text-primary
                                 text-xl font-semibold
                                 hover:bg-muted/20 transition-colors"
                    >
                      <User className="h-5 w-5" />
                      <span>Account</span>
                    </TabsTrigger>

                    <TabsTrigger
                      value={TABS.SECURITY}
                      className="flex-1 h-full flex items-center justify-center gap-2
                                 border-b-2 border-transparent
                                 data-[state=active]:border-primary
                                 data-[state=active]:text-primary
                                 text-xl font-semibold
                                 hover:bg-muted/20 transition-colors"
                    >
                      <Shield className="h-5 w-5" />
                      <span>Security</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Content */}
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
