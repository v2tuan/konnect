import { Server } from 'socket.io'
import { socketAuth } from './auth.js'
import { registerPresence } from './presence.js'
import { registerChat } from './chat.js'
import { registerCallSignaling } from './call.js'

export function initSockets(httpServer, { corsOrigin, jwtSecret, userService }) {
  const io = new Server(httpServer, {
    cors: { origin: Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin], credentials: true }
  })

  // middleware auth cho namespace mặc định
  const auth = socketAuth({ jwtSecret })
  io.use(auth)

  // Đăng ký từng nhóm sự kiện
  registerPresence(io, { userService })     // online/offline
  registerChat(io)                           // join/typing
  registerCallSignaling(io, auth)            // namespace /webrtc

  return io
}
