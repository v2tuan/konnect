import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { use, useEffect, useState } from "react"
import { getNewUsersCount, getNewUserStatistics, getTotalUsers, getUserStatistics } from "@/api"
import { set } from "zod"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Label } from "./ui/label"
import { time } from "console"

type newUserStats = {
  currentCount: number
  previousCount: number
  percentageChange: number
  trend: "increase" | "decrease" | "no change"
}

export function SectionCards() {
  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [newUserStats, setNewUsersStats] = useState<newUserStats | null>(null)
  const [timeRange, setTimeRange] = useState(1)

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const response = await getTotalUsers()
        setTotalUsers(response)
        console.log("Total Users:", response)
      } catch (error) {
        console.error("Error fetching total users:", error)
      }
    }

    fetchTotalUsers()
  }, [])

  useEffect(() => {
    const fetchNewUsersStats = async () => {
      try {
        const sinceDate = new Date()
        sinceDate.setMonth(sinceDate.getMonth() - timeRange) // Last month
        const response = await getNewUserStatistics(sinceDate.toISOString())
        console.log("Response:", response)
        setNewUsersStats(response)
        console.log("New Users Stats:", response)
      } catch (error) {
        console.error("Error fetching new users stats:", error)
      }
    }

    fetchNewUsersStats()
  }, [timeRange])

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalUsers !== null ? totalUsers : 'Loading...'}
          </CardTitle>
          {/* <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +12.5%
            </Badge>
          </CardAction> */}
        </CardHeader>
        {/* <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Trending up this month <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Visitors for the last 6 months
          </div>
        </CardFooter> */}
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>New Customers</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {newUserStats !== null ? newUserStats.currentCount : 'Loading...'}
          </CardTitle>
          <CardAction>
            <div className='w-full max-w-xs space-y-2'>
              <Select defaultValue='1' value={timeRange.toString()} onValueChange={(value) => { setTimeRange(parseInt(value)) }}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select framework' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='1'>1 Months</SelectItem>
                  <SelectItem value='2'>2 Months</SelectItem>
                  <SelectItem value='3'>3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {newUserStats?.trend} {newUserStats?.percentageChange}% this period {(newUserStats?.percentageChange ?? 0) > 0 ? <IconTrendingUp className="size-4" /> : <IconTrendingDown className="size-4" />}
          </div>
          <div className="text-muted-foreground">
            User signups {newUserStats !== null ? `compared to previous period` : ''}
          </div>
        </CardFooter>
      </Card>
      {/* <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Accounts</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            45,678
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +12.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Strong user retention <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Engagement exceed targets</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Growth Rate</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4.5%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              +4.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Steady performance increase <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Meets growth projections</div>
        </CardFooter>
      </Card> */}
    </div>
  )
}
