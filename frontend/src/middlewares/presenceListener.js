import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import {
  loginUserAPI,
  logoutUserAPI,
  clearCurrentUser,
  setUserStatus,
  upsertUsers
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

// After login -> connect socket + listen presence
presenceListener.startListening({
  matcher: isAnyOf(loginUserAPI.fulfilled),
  effect: async (action, api) => {
    const user = action.payload

    const socket = connectSocket()
    if (!socket) return

    const handleConnect = () => {
      api.dispatch(setUserStatus({
        userId: user._id,
        isOnline: true,
        lastActiveAt: new Date().toISOString()
      }))
      const state = api.getState()
      const ids = Object.keys(state.user?.usersById || {})
      requestSnapshot(socket, api, ids)
    }
    socket.on("connect", handleConnect)

    socket.on('presence:snapshot', (list) => {
      // list: [{ userId, isOnline, lastActiveAt }]
      list.forEach(item => api.dispatch(setUserStatus(item)))
    })

    socket.on("presence:update", (payload) => {
      api.dispatch(setUserStatus(payload))
    })

    startHeartbeat()
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
