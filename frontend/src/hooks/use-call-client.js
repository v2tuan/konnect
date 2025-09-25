// server/socket.js
import { Server } from "socket.io"

export function attachSocket(server) {
  const io = new Server(server, { cors: { origin: "*" } })

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId
    if (userId) {
      const room = `user:${String(userId)}`
      socket.join(room)
      console.log("[SOCKET] joined", room)
    }

    socket.on("call:invite", (payload = {}) => {
      const { toUserIds = [] } = payload
      console.log("[CALL] invite ->", toUserIds)
      toUserIds
        .filter(Boolean)
        .forEach(uid => io.to(`user:${String(uid)}`).emit("call:incoming", payload))
    })

    socket.on("call:cancel", (payload = {}) => {
      const { toUserIds = [] } = payload
      console.log("[CALL] cancel ->", toUserIds)
      toUserIds
        .filter(Boolean)
        .forEach(uid => io.to(`user:${String(uid)}`).emit("call:cancelled", payload))
    })
  })

  return io
}
