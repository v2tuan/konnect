import { loginUserAPI, logoutUserAPI, setUserStatus } from "@/redux/user/userSlice"
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit"
import { P } from "framer-motion/dist/types.d-Cjd591yU"

const { getSocket, connectSocket, disconnectSocket } = require("@/lib/socket")

let heartbeatTimer = null

const startHeartbeat = () => {
  const s = getSocket
  if (!s) return
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    s.emit("presence:heartbeat")
  }, 3000)
}

const stopHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

export const presenceListener = createListenerMiddleware()

presenceListener.startListening({
  matcher: isAnyOf(loginUserAPI.fulfilled),
  effect: async (action, listenerAPI) => {
    const user = action.payload
    const socket = connectSocket

    socket.once('connect', () => {
      listenerAPI.dispatch(
        setUserStatus({
          userId: user._id,
          isOnline: true,
          lastActiveAt: new Date().toISOString()
        })
      )
    })

    socket.on('presence:update', (payload) => {
      listenerAPI.dispatch(setUserStatus(payload))
    })

    startHeartbeat()
  }
})

//logout
presenceListener.startListening({
  matcher: isAnyOf(logoutUserAPI.fulfilled),
  effect: async () => {
    stopHeartbeat()
    const s = getSocket()
    if (s) {
      try {
        s.removeAllListener("presense:update")
        s.removeAllListener("connect")
        s.removeAllListener("disconnect")
      } catch (e) {
        console.error(e)
      }
    }
    disconnectSocket()
  }
})