// src/lib/socket.js
import { io } from "socket.io-client"
import { API_ROOT } from "@/utils/constant"

let socket = null
let webrtcSocket = null

export const getSocket = () => socket

export const connectSocket = (currentUserId) => {
  if (socket?.connected) return socket

  socket = io(API_ROOT, {
    transports: ["websocket"],
    withCredentials: true,
    auth: { userId: String(currentUserId || "") }
    // nếu bạn muốn dùng query thay auth:
    // query: { userId: String(currentUserId || "") }
  })

  socket.on("connect", () => console.log("[socket] connected", socket.id))
  socket.on("connect_error", (err) =>
    console.error("[socket] connect_error:", err.message)
  )
  socket.on("disconnect", (reason) =>
    console.log("[socket] disconnected:", reason)
  )

  return socket
}

export const disconnectSocket = () => {
  try {
    socket?.removeAllListeners()
    socket?.disconnect()
  } finally {
    socket = null
  }
}

//namespace rieng cho phan call
export function getWebRTCSocket(currentUserId) {
  if (!webrtcSocket) {
    webrtcSocket = io(`${API_ROOT}/webrtc`, {
      withCredentials: true,
      auth: { userId: String(currentUserId || "") } // giữ đồng nhất
    })
  }
  return webrtcSocket
}
