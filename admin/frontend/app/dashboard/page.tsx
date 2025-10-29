'use client'
import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
// import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { DataTable } from "@/components/user-table"

// import data from "./data.json"

const response = {
  "total": 64,
  "page": 1,
  "totalPages": 7,
  "users": [
    {
      "_id": "655e1f1a1a2b3c4d5e6f0007",
      "email": "phamkhanh007@example.com",
      "avatarUrl": "https://github.com/phamkhanh007.png",
      "fullName": "Phạm Khánh",
      "username": "phamkhanh007",
      "dateOfBirth": "1990-09-10T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-26T20:00:00.000Z"
      },
      "updatedAt": "2025-10-26T20:00:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-26T19:59:59.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f0032",
      "email": "tienphu050@example.com",
      "avatarUrl": "https://github.com/tienphu050.png",
      "fullName": "Tiến Phú",
      "username": "tienphu050",
      "dateOfBirth": "1995-10-10T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-24T20:00:00.000Z"
      },
      "updatedAt": "2025-10-24T20:00:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-23T19:19:19.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f0001",
      "email": "nguyenvana001@example.com",
      "avatarUrl": "https://github.com/nguyenvana001.png",
      "fullName": "Nguyễn Văn A",
      "username": "nguyenvana001",
      "dateOfBirth": "1995-03-12T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": false,
        "lastActiveAt": "2025-10-22T10:15:00.000Z"
      },
      "updatedAt": "2025-10-22T10:15:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-21T08:34:12.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f0027",
      "email": "tuananh039@example.com",
      "avatarUrl": "https://github.com/tuananh039.png",
      "fullName": "Tuấn Anh",
      "username": "tuananh039",
      "dateOfBirth": "1996-09-09T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-21T21:21:00.000Z"
      },
      "updatedAt": "2025-10-21T21:21:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-20T20:20:20.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f000a",
      "email": "doanthuy010@example.com",
      "avatarUrl": "https://github.com/doanthuy010.png",
      "fullName": "Đoàn Thùy",
      "username": "doanthuy010",
      "dateOfBirth": "2001-08-03T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-20T07:10:00.000Z"
      },
      "updatedAt": "2025-10-20T07:10:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-19T06:55:00.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f0025",
      "email": "phuctran037@example.com",
      "avatarUrl": "https://github.com/phuctran037.png",
      "fullName": "Phúc Trần",
      "username": "phuctran037",
      "dateOfBirth": "1994-07-07T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-18T18:18:00.000Z"
      },
      "updatedAt": "2025-10-18T18:18:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-17T17:17:17.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f0012",
      "email": "nguyenvan018@example.com",
      "avatarUrl": "https://github.com/nguyenvan018.png",
      "fullName": "Nguyễn Văn B",
      "username": "nguyenvan018",
      "dateOfBirth": "1989-09-09T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-15T15:15:00.000Z"
      },
      "updatedAt": "2025-10-15T15:15:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-14T14:14:14.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f002f",
      "email": "thanhhoa047@example.com",
      "avatarUrl": "https://github.com/thanhhoa047.png",
      "fullName": "Thanh Hoa",
      "username": "thanhhoa047",
      "dateOfBirth": "1997-04-04T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-13T13:13:00.000Z"
      },
      "updatedAt": "2025-10-13T13:13:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-12T12:12:12.000Z",
      "__v": 0
    },
    {
      "_id": "655e1f1a1a2b3c4d5e6f0017",
      "email": "tranphuong023@example.com",
      "avatarUrl": "https://github.com/tranphuong023.png",
      "fullName": "Trần Phương",
      "username": "tranphuong023",
      "dateOfBirth": "1993-07-07T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": true,
        "lastActiveAt": "2025-10-12T12:12:00.000Z"
      },
      "updatedAt": "2025-10-12T12:12:00.000Z",
      "_destroy": false,
      "createdAt": "2025-10-11T12:12:12.000Z",
      "__v": 0
    },
    {
      "_id": "68b808d8840cbb83a98a2207",
      "email": "doanvanj@example.com",
      "avatarUrl": "https://github.com/shadcn.png",
      "fullName": "Đoàn Văn J",
      "username": "doanvanj",
      "dateOfBirth": "2004-06-22T00:00:00.000Z",
      "bio": "",
      "status": {
        "isOnline": false,
        "lastActiveAt": "2025-10-24T14:15:23.587Z"
      },
      "updatedAt": "2025-09-03T09:22:32.967Z",
      "_destroy": false,
      "createdAt": "2025-10-10T09:22:32.965Z",
      "__v": 0
    }
  ]
}

const data = response.users

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable/>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
