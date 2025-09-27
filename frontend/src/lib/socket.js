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

// ===== WebRTC Socket cho call =====
export function getWebRTCSocket(currentUserId) {
  // Tạo mới nếu chưa có hoặc đã disconnect
  if (!webrtcSocket || webrtcSocket.disconnected) {
    webrtcSocket = io(`${API_ROOT}/webrtc`, {
      withCredentials: true,
      auth: { userId: String(currentUserId || "") }
    })
    
    webrtcSocket.on("connect", () => console.log("[webrtc] connected", webrtcSocket.id))
    webrtcSocket.on("connect_error", (err) =>
      console.error("[webrtc] connect_error:", err.message)
    )
    webrtcSocket.on("disconnect", (reason) =>
      console.log("[webrtc] disconnected:", reason)
    )
  }
  return webrtcSocket
}

export const disconnectWebRTCSocket = () => {
  try {
    webrtcSocket?.removeAllListeners()
    webrtcSocket?.disconnect()
  } finally {
    webrtcSocket = null
  }
}
