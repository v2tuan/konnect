// src/lib/socket.js
import { io } from "socket.io-client"
import { API_ROOT } from "@/utils/constant"

let socket = null
let webrtcSocket = null

export const getSocket = () => socket

export const connectSocket = (currentUserId) => {
  if (socket?.connected) return socket

  socket = io(API_ROOT, {
    // ĐỂ MẶC ĐỊNH cho phép polling -> websocket. Nếu server chắc chắn OK websocket thì thêm lại.
    withCredentials: true,
    auth: { userId: String(currentUserId || "") },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
  })

  socket.on("connect", () => {
    console.log("[socket] connected", socket.id)
    // ⭐ rất quan trọng: join user-room để nhận `notification:new`
    const uid = String(currentUserId || "")
    if (uid) socket.emit("user:join", { userId: uid })
  })

  socket.on("connect_error", (err) => {
    console.error("[socket] connect_error:", err?.message || err)
  })

  socket.on("disconnect", (reason) => {
    console.log("[socket] disconnected:", reason)
  })

  // Debug tất cả events (bật bằng window.__SOCKET_DEBUG = true;)
  socket.onAny((event, ...args) => {
    if (window.__SOCKET_DEBUG) {
      console.log("[socket:onAny]", event, args?.[0])
    }
  })

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
  if (!webrtcSocket || webrtcSocket.disconnected) {
    webrtcSocket = io(`${API_ROOT}/webrtc`, {
      withCredentials: true,
      auth: { userId: String(currentUserId || "") }
    })
    webrtcSocket.on("connect", () => console.log("[webrtc] connected", webrtcSocket.id))
    webrtcSocket.on("connect_error", (err) => console.error("[webrtc] connect_error:", err.message))
    webrtcSocket.on("disconnect", (reason) => console.log("[webrtc] disconnected:", reason))
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
