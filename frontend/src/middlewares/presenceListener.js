import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import {
  loginUserAPI,
  logoutUserAPI,
  clearCurrentUser,
  setUserStatus,
  upsertUsers,
  repairUsersMap
} from "@/redux/user/userSlice"
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket"

let heartbeatTimer = null
let snapshotDebounceTimer = null

const requestSnapshot = (socket, api, userIds) => {
  if (!socket || !userIds?.length) return
  // debounce to batch multiple upsertUsers dispatches in same tick
  clearTimeout(snapshotDebounceTimer)
  snapshotDebounceTimer = setTimeout(() => {
    socket.emit('presence:snapshot', userIds)
  }, 150)
}

const startHeartbeat = () => {
  const s = getSocket()
  if (!s) return
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    const sock = getSocket()
    if (sock?.connected) sock.emit("presence:heartbeat")
  }, 30000) // 30s (3s hơi dày)
}

const stopHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

export const presenceListener = createListenerMiddleware()

// Helper: attach handlers & do initial snapshot
function ensurePresenceStarted(api) {
  const state = api.getState()
  const user = state.user?.currentUser
  if (!user) return
  let socket = getSocket()
  if (!socket) socket = connectSocket()
  if (!socket) return

  if (!socket._presenceHandlersAttached) {
    socket._presenceHandlersAttached = true
    // Presence updates
    socket.on('presence:update', (payload) => {
      api.dispatch(setUserStatus(payload))
    })
    socket.on('presence:snapshot', (list) => {
      ;(list || []).forEach(item => api.dispatch(setUserStatus(item)))
    })
    // On connect (first or reconnect)
    socket.on('connect', () => {
      api.dispatch(setUserStatus({
        userId: user._id,
        isOnline: true,
        lastActiveAt: new Date().toISOString()
      }))
      const ids = Object.keys(api.getState().user?.usersById || {})
      if (ids.length) socket.emit('presence:snapshot', ids)
    })
  }
  // If socket already connected when we attach, manually trigger connect logic once
  if (socket.connected && !socket._presenceInitialSyncDone) {
    socket._presenceInitialSyncDone = true
    api.dispatch(setUserStatus({
      userId: user._id,
      isOnline: true,
      lastActiveAt: new Date().toISOString()
    }))
    const ids = Object.keys(api.getState().user?.usersById || {})
    if (ids.length) socket.emit('presence:snapshot', ids)
  }
  startHeartbeat()
}

// After login -> connect socket + listen presence
presenceListener.startListening({
  matcher: isAnyOf(loginUserAPI.fulfilled),
  effect: async (_action, api) => {
    ensurePresenceStarted(api)
  }
})

// On rehydrate (Option B): auto bootstrap presence if user already persisted
presenceListener.startListening({
  predicate: (action, currentState, previousState) => {
    if (action.type !== 'persist/REHYDRATE') return false
    const prevHadUser = !!previousState?.user?.currentUser
    const nowHasUser = !!currentState?.user?.currentUser
    return !prevHadUser && nowHasUser
  },
  effect: async (_action, api) => {
    api.dispatch(repairUsersMap())
    ensurePresenceStarted(api)
  }
})

// Khi thêm mới user vào store -> xin snapshot trạng thái nếu đã kết nối
presenceListener.startListening({
  actionCreator: upsertUsers,
  effect: async (action, api) => {
    const socket = getSocket()
    if (!socket?.connected) return
    const ids = (action.payload || []).map(u => u._id).filter(Boolean)
    requestSnapshot(socket, api, ids)
  }
})

// logout/clear -> remove listeners + disconnect
presenceListener.startListening({
  matcher: isAnyOf(logoutUserAPI.fulfilled, clearCurrentUser),
  effect: async () => {
    stopHeartbeat()
    const s = getSocket()
    if (s) {
      s.off("presence:update")
      s.off("presence:snapshot")
      s.off("connect")
      s.off("disconnect")
    }
    disconnectSocket()
  }
})
