import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import {
  loginUserAPI,
  logoutUserAPI,
  clearCurrentUser,
  setUserStatus
} from "@/redux/user/userSlice"
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket"

let heartbeatTimer = null

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

    socket.once("connect", () => {
      // Immediately reflect own status
      api.dispatch(setUserStatus({
        userId: user._id,
        isOnline: true,
        lastActiveAt: new Date().toISOString()
      }))
      // Request snapshot of contacts (if we store them in state.user.usersById)
      const state = api.getState()
      const ids = Object.keys(state.user?.usersById || {})
      if (ids.length) socket.emit('presence:snapshot', ids)
    })

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
