export function registerCallSignaling(io, authMiddleware) {
  const nsp = io.of('/webrtc')

  // áp dụng xác thực riêng cho namespace
  if (authMiddleware) nsp.use(authMiddleware)

  nsp.on('connection', (socket) => {
    socket.on('join-call', ({ roomId, userId }) => {
      socket.data = { roomId, userId }
      socket.join(roomId)

      // Trả về danh sách socketId đã có trong phòng (trừ mình)
      const peers = [...(nsp.adapter.rooms.get(roomId) || [])].filter(id => id !== socket.id)
      socket.emit('peers-in-room', { peers }) // thống nhất tên event: "peers-in-room"

      // Thông báo có peer mới
      socket.to(roomId).emit('peer-joined', { peerId: socket.id, userId })
    })

    socket.on('leave-call', ({ roomId }) => {
      socket.leave(roomId)
      socket.to(roomId).emit('peer-left', { peerId: socket.id })
    })

    // SDP/ICE chuyển tiếp đích danh
    socket.on('rtc-offer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-offer', { from, sdp }))
    socket.on('rtc-answer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-answer', { from, sdp }))
    socket.on('rtc-ice', ({ to, candidate, from }) => nsp.to(to).emit('rtc-ice', { from, candidate })) // candidate (đúng chính tả)

    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId
      if (roomId) socket.to(roomId).emit('peer-left', { peerId: socket.id })
    })
  })

  return nsp
}
