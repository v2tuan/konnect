import { io } from "socket.io-client";
import { API_ROOT } from "@/utils/constant";

let socket = null

export const getSocket = () => socket

export const connectSocket = () => {
  if (socket?.connected) return socket
  socket = io(API_ROOT, {
    transports: ["websocket"],
    withCredentials: true //dam bao browse tu gui cookie httponly
  })
}

export const disconnectSocket = () => {
  try {
    socket?.removeAllListeners()
    socket?.disconnect()
    socket = null
  } catch (error) {
    console.error(error)
  }
}