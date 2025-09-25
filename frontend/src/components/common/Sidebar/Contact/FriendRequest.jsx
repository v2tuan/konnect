import { getFriendRequestsAPI, updateFriendRequestStatusAPI } from "@/apis"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Check, Loader2, RefreshCw, Search, Users, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

const ACTION_ACCEPT = "acepted"
const ACTION_DECLINE = "delete"

function formatTimeAgo(dateStr) {
  if (!dateStr) return ""
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, Date.now() - then)
  const m = 60 * 1000, h = 60 * m, d = 24 * h
  if (diff < m) return "just now"
  if (diff < h) return `${Math.floor(diff / m)}m ago`
  if (diff < d) return `${Math.floor(diff / h)}h ago`
  return `${Math.floor(diff / d)}d ago`
}

export default function FriendRequest() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [busyId, setBusyId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      // Truyền thêm filter nếu cần: { params: { status: 'pending' } }
      const res = await getFriendRequestsAPI({ params: {} })
      // SỬA 1: đọc đúng mảng từ res.data.data
      const arr = Array.isArray(res?.data) ? res.data : (res?.items ?? [])
      setItems(arr)
      setPage(1)
    } catch (e) {
      console.error(e)
      setError(e?.response?.data?.message || e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // Search tên/username/email
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter((r) => {
      const rq = r?.requester || {}
      const name = (rq.fullName || rq.username || rq.email || "").toLowerCase()
      return name.includes(needle)
    })
  }, [items, q])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const pageItems = useMemo(() => {
    const start = (page - 1) * limit
    return filtered.slice(start, start + limit)
  }, [filtered, page, limit])

  // SỬA 2: dùng id (không phải _id)
  const handleAccept = async (req) => {
    const id = req?.id
    if (!id) return
    setBusyId(id)
    const prev = items
    setItems((arr) => arr.filter((x) => x.id !== id))
    try {
      await updateFriendRequestStatusAPI({ requestId: id, action: ACTION_ACCEPT })
    } catch (e) {
      console.error(e)
      setItems(prev)
      alert(e?.response?.data?.message || "Accept failed")
    } finally {
      setBusyId(null)
    }
  }

  const handleDecline = async (req) => {
    const id = req?.id
    if (!id) return
    setBusyId(id)
    const prev = items
    setItems((arr) => arr.filter((x) => x.id !== id))
    try {
      await updateFriendRequestStatusAPI({ requestId: id, action: ACTION_DECLINE })
    } catch (e) {
      console.error(e)
      setItems(prev)
      alert(e?.response?.data?.message || "Decline failed")
    } finally {
      setBusyId(null)
    }
  }

  const handleAcceptAll = async () => {
    if (!filtered.length) return
    const prev = items
    const ids = filtered.map((x) => x.id)
    setItems((arr) => arr.filter((x) => !ids.includes(x.id)))
    try {
      await Promise.all(ids.map((id) => updateFriendRequestStatusAPI({ requestId: id, action: ACTION_ACCEPT })))
    } catch (e) {
      console.error(e)
      setItems(prev)
      alert(e?.response?.data?.message || "Accept all failed")
    }
  }

  return (
    <div className="mx-auto max-w-full p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Friend Requests</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="default" size="sm" onClick={handleAcceptAll} disabled={!filtered.length || loading}>
            <Check className="mr-2 h-4 w-4" />
            Accept all ({filtered.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
              <Input className="pl-9" placeholder="Search requester…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline-block">Per page</span>
              <select className="h-9 rounded-md border px-2 text-sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <Separator className="mb-4" />

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading friend requests…</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">{String(error)}</div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-2 h-8 w-8 opacity-60" />
              <div className="text-base font-medium">No friend requests</div>
              <div className="text-sm text-muted-foreground">You’re all caught up.</div>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <ul className="space-y-3">
              {pageItems.map((req) => {
                const rid = req.id
                const r = req.requester || {}
                return (
                  <li key={rid} className="flex items-center justify-between rounded-xl border p-3 sm:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={r.avatarUrl} alt={r.fullName || r.username || "avatar"} />
                        <AvatarFallback>
                          {String(r.fullName || r.username || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {r.fullName || r.username || r.email || "Unknown user"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{r.username} · Requested {formatTimeAgo(req.createdAt)}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">
                          {r.status?.isOnline ? "Online now" : r.status?.lastActiveAt ? `Last active ${formatTimeAgo(r.status.lastActiveAt)}` : "Offline"}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button size="sm" className="gap-1" onClick={() => handleAccept(req)} disabled={busyId === rid}>
                        <Check className="h-4 w-4" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleDecline(req)} disabled={busyId === rid}>
                        <X className="h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="text-xs text-muted-foreground">
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Prev
                </Button>
                <span className="text-sm">Page {page} / {Math.max(1, pageCount)}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
