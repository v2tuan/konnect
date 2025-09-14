import { useEffect, useState } from 'react'
import { formatTimeAgo } from '@/utils/helper'

/**
 * useRelativeTime
 * Trả về chuỗi thời gian tương đối ("Online 5 minutes", "Just now" ...)
 * và tự động re-render mỗi 60s (có thể cấu hình) để UI luôn cập nhật.
 *
 * @param {string|Date|null} iso - thời gian ISO hoặc Date
 * @param {object} options
 * @param {number} options.intervalMs - chu kỳ cập nhật, mặc định 60000ms
 * @param {boolean} options.enabled - bật/tắt cập nhật tự động
 */
export function useRelativeTime(iso, { intervalMs = 60000, enabled = true } = {}) {
  const [nowTick, setNowTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const id = setInterval(() => setNowTick(t => t + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])

  if (!iso) return ''
  // dùng nowTick trong expression để tránh lint cảnh báo và buộc re-render
  return formatTimeAgo(iso) + (nowTick ? '' : '')
}

/**
 * Hook tiện ích: trả về cả isOnline + text cho UI presence.
 * @param {{ isOnline: boolean, lastActiveAt: string|null }} param0
 */
export function usePresenceText({ isOnline, lastActiveAt }, opts) {
  const relative = useRelativeTime(lastActiveAt, opts)
  if (isOnline) return 'Online'
  if (lastActiveAt) return `Online ${relative} ago`
  return 'Offline'
}
