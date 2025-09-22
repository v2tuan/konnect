// Quản lý online/offline và snapshot/heartbeat
export function registerPresence(io, { userService }) {
  const presenceMap = new Map() // userId -> { sockets:Set<socketId>, lastActiveAt:Date }

  io.on('connection', (socket) => {
    const userId = socket.user?.id
    if (userId) {
      let entry = presenceMap.get(userId)
      if (!entry) {
        entry = { sockets: new Set(), lastActiveAt: new Date() }
        presenceMap.set(userId, entry)
        // lần đầu online -> cập nhật DB + broadcast
        const now = new Date()
        userService.markUserStatus(userId, { isOnline: true, lastActiveAt: now })
        io.emit('presence:update', { userId, isOnline: true, lastActiveAt: now.toISOString() })
      }
      entry.sockets.add(socket.id)
    }

    socket.on('presence:snapshot', (userIds = []) => {
      const payload = userIds.map(uid => {
        const entry = presenceMap.get(uid)
        return {
          userId: uid,
          isOnline: !!entry,
          lastActiveAt: entry?.lastActiveAt?.toISOString() || null
        }
      })
      socket.emit('presence:snapshot', payload)
    })

    socket.on('presence:heartbeat', () => {
      if (!userId) return
      const entry = presenceMap.get(userId)
      if (entry) entry.lastActiveAt = new Date()
    })

    socket.on('disconnect', () => {
      if (!userId) return
      const entry = presenceMap.get(userId)
      if (!entry) return
      entry.sockets.delete(socket.id)
      if (entry.sockets.size === 0) {
        presenceMap.delete(userId)
        const lastActiveAt = new Date()
        userService.markUserStatus(userId, { isOnline: false, lastActiveAt })
        io.emit('presence:update', { userId, isOnline: false, lastActiveAt: lastActiveAt.toISOString() })
      }
    })
  })
}
