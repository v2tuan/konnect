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