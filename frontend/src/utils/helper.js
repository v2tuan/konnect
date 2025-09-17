import { format } from "date-fns"

export const toDateKey = (d) => {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}

export const formatChip = (dateObj, count) => {
  const d = new Date(dateObj)
  const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dmy  = d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })
  return count === 1 ? `${hhmm} ${dmy}` : dmy
}

export const groupByDay = (items = []) => {
  const map = new Map()
  for (const m of items) {
    const key = toDateKey(m.createdAt || m.timestamp || Date.now())
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  // giữ thứ tự ngày theo tin nhắn
  return Array.from(map.entries()).map(([key, arr]) => ({ key, items: arr }))
}

export function extractId(raw) {
  if (!raw) return null
  if (typeof raw === 'string') return raw
  if (raw._id) return raw._id.toString()
  if (raw.id) return raw.id.toString()
  if (raw.conversationId) return raw.conversationId.toString()
  if (raw.$oid) return raw.$oid.toString()
  return null
}

export function formatTimeAgo(dateString) {
  if (!dateString) return ""

  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return "Just now"
  if (diffMin < 60) return `${diffMin} minutes`
  if (diffHour < 24) return `${diffHour} hours`
  if (diffDay === 1) return "Yesterday"
  if (diffDay < 7) return `${diffDay} days`

  // nếu cùng năm -> chỉ hiện ngày/tháng
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "dd/MM")
  }

  // khác năm -> hiện đầy đủ ngày/tháng/năm
  return format(date, "dd/MM/yyyy")
}

export const pickPeerStatus = (conversation, usersMap) => {
  const peer = conversation?.direct?.otherUser
  const peerId = extractId(peer)
  const fromStore = peerId ? usersMap[peerId]?.status : null
  const fallback = peer?.status

  const isOnline = (fromStore?.isOnline ?? fallback?.isOnline) || false
  const lastActiveAt = fromStore?.lastActiveAt ?? fallback?.lastActiveAt ?? null

  return { isOnline, lastActiveAt }
}
