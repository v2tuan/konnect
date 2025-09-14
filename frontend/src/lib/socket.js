import { io } from "socket.io-client"
import { API_ROOT } from "@/utils/constant"

let socket = null

export const getSocket = () => socket

export const connectSocket = () => {
  if (socket?.connected) return socket
  socket = io(API_ROOT, {
    transports: ["websocket"],
    withCredentials: true
  })

  socket.on("connect", () => console.log("[socket] connected", socket.id))
  socket.on("connect_error", (err) =>
    console.error("[socket] connect_error:", err.message)
  )
  socket.on("disconnect", (reason) =>
    console.log("[socket] disconnected:", reason)
  )

  return socket
};

export const disconnectSocket = () => {
  try {
    socket?.removeAllListeners()
    socket?.disconnect()
  } finally {
    socket = null
  }
}
