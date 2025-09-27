export function registerCallSignaling(io, authMiddleware) {
  const nsp = io.of('/webrtc')

  // Áp dụng xác thực riêng cho namespace
  if (authMiddleware) nsp.use(authMiddleware)

  nsp.on('connection', (socket) => {
    // ================== NEW: join theo user-room để báo chuông ==================
    const authedUserId = socket.user?.id ? String(socket.user.id) : null
    if (authedUserId) {
      const userRoom = `user:${authedUserId}`
      socket.join(userRoom)
      console.log('[WEBRTC] joined', userRoom)
    } else {
      console.warn('[WEBRTC] missing userId in auth for ringing')
    }

    // ================== EXISTING: signaling theo roomId ==================
    socket.on('join-call', ({ roomId, userId }) => {
      socket.data = { roomId, userId }
      socket.join(roomId)

      const peers = [...(nsp.adapter.rooms.get(roomId) || [])].filter(id => id !== socket.id)
      socket.emit('peers-in-room', { peers })

      socket.to(roomId).emit('peer-joined', { peerId: socket.id, userId })
    })

    socket.on('leave-call', ({ roomId }) => {
      socket.leave(roomId)
      socket.to(roomId).emit('peer-left', { peerId: socket.id })
    })

    // SDP/ICE chuyển tiếp đích danh (giữ nguyên)
    socket.on('rtc-offer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-offer', { from, sdp }))
    socket.on('rtc-answer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-answer', { from, sdp }))
    socket.on('rtc-ice', ({ to, candidate, from }) => nsp.to(to).emit('rtc-ice', { from, candidate }))

    // ================== NEW: ringing invite/cancel theo user-room ==================
    // Caller gửi invite (trước khi 2 bên join roomId), server đẩy 'call:incoming' đến user:<toUserId>
    socket.on('call:invite', (payload = {}) => {
      try {
        const {
          toUserIds = [],            // mảng user đích
          conversationId,            // dùng để FE mở đúng chat/call modal
          mode,                      // 'audio' | 'video'
          fromUser,                  // { id, name, avatarUrl } (gợi ý hiển thị)
          peer,                      // đối tượng peer hiển thị cho receiver (optional)
          timeoutMs = 30000
        } = payload

        const targets = (toUserIds || []).map(String).filter(Boolean)
        if (!conversationId || !mode || targets.length === 0) {
          console.warn('[WEBRTC] invalid call:invite payload', payload)
          return
        }

        const notify = {
          conversationId,
          mode,
          fromUser: fromUser || (authedUserId ? { id: authedUserId } : undefined),
          peer,
          timeoutMs
        }

        console.log('[WEBRTC] invite ->', targets, 'conv:', conversationId, 'by:', authedUserId)
        targets.forEach(uid => nsp.to(`user:${uid}`).emit('call:ringing', notify))
      } catch (err) {
        console.error('[WEBRTC] invite error:', err)
      }
    })

    socket.on('call:cancel', (payload = {}) => {
      try {
        const { toUserIds = [], conversationId } = payload
        const targets = (toUserIds || []).map(String).filter(Boolean)
        if (targets.length === 0) return

        console.log('[WEBRTC] cancel ->', targets, 'by:', authedUserId)
        targets.forEach(uid => {
          nsp.to(`user:${uid}`).emit('call:cancelled', {
            by: authedUserId,
            conversationId
          })
        })
      } catch (err) {
        console.error('[WEBRTC] cancel error:', err)
      }
    })

    // (Optional) accept/reject nếu bạn cần
    socket.on('call:accept', ({ toUserId, conversationId }) => {
      if (!toUserId) return
      nsp.to(`user:${String(toUserId)}`).emit('call:accepted', {
        by: authedUserId,
        conversationId
      })
    })

    socket.on('call:reject', ({ toUserId, conversationId, reason }) => {
      if (!toUserId) return
      nsp.to(`user:${String(toUserId)}`).emit('call:rejected', {
        by: authedUserId,
        conversationId,
        reason: reason || 'rejected'
      })
    })

    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId
      if (roomId) socket.to(roomId).emit('peer-left', { peerId: socket.id })
    })
  })

  return nsp
}
