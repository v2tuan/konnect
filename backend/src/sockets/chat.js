// Sự kiện theo hội thoại: join room, typing
export function registerChat(io) {
  io.on('connection', (socket) => {
    const userId = socket.user?.id
    if (userId) {
      // JOIN user phòng để emit conversation:created
      socket.join(`user:${userId}`)
    }

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
