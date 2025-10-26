// Sự kiện theo hội thoại: join room, typing
export function registerChat(io) {
  io.on('connection', (socket) => {
    const userId = socket.user?.id
    if (userId) {
      socket.join(`user:${userId}`)
    }

    // ⭐ Thêm handler user:join để FE chủ động join khi reconnect
    socket.on('user:join', ({ userId }) => {
      if (!userId) return
      socket.join(`user:${userId}`)
    })

    socket.on('conversation:join', ({ conversationId }) => {
      if (!conversationId) return
      socket.join(`conversation:${conversationId}`)
    })

    socket.on('typing:start', ({ conversationId }) => {
      if (!conversationId) return
      socket.to(`conversation:${conversationId}`).emit('typing:start', { conversationId, userId })
    })

    socket.on('typing:stop', ({ conversationId }) => {
      if (!conversationId) return
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { conversationId, userId })
    })
  })
}
