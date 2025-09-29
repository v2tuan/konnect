export function registerCallSignaling(io, authMiddleware) {
  const nsp = io.of('/webrtc')

  if (authMiddleware) nsp.use(authMiddleware)

  nsp.on('connection', (socket) => {
    const authedUserId = socket.user?.id ? String(socket.user.id) : null
    if (authedUserId) {
      const userRoom = `user:${authedUserId}`
      socket.join(userRoom)
      console.log('[WEBRTC] joined', userRoom)
    }

    // ===== WEBRTC SIGNALING =====
    socket.on('join-call', ({ roomId, userId, callId }) => {
      const actualRoomId = callId || roomId
      socket.data = { roomId: actualRoomId, userId, callId }
      socket.join(actualRoomId)

      console.log(`[WEBRTC] ${userId} joined call room: ${actualRoomId}`)

      const peers = [...(nsp.adapter.rooms.get(actualRoomId) || [])]
        .filter(id => id !== socket.id)
      
      console.log(`[WEBRTC] Current peers in ${actualRoomId}:`, peers.length)

      socket.emit('peers-in-room', { peers })
      socket.to(actualRoomId).emit('peer-joined', { peerId: socket.id, userId })
    })

    socket.on('leave-call', ({ roomId, callId }) => {
      const actualRoomId = callId || roomId
      socket.leave(actualRoomId)
      socket.to(actualRoomId).emit('peer-left', { peerId: socket.id })
      console.log(`[WEBRTC] User left call room: ${actualRoomId}`)
    })

    // ===== THÊM: SYNC MODE GIỮA PEERS =====
    socket.on('mode-changed', ({ mode, callId, roomId }) => {
      const actualRoomId = callId || roomId
      console.log(`[WEBRTC] Mode changed to ${mode} by ${socket.id} in room ${actualRoomId}`)
      
      // Broadcast tới tất cả peers khác trong room
      socket.to(actualRoomId).emit('peer-mode-changed', {
        peerId: socket.id,
        mode: mode
      })
    })

    // ===== WEBRTC SIGNALING (existing) =====
    socket.on('rtc-offer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-offer', { from, sdp }))
    socket.on('rtc-answer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-answer', { from, sdp }))
    socket.on('rtc-ice', ({ to, candidate, from }) => nsp.to(to).emit('rtc-ice', { from, candidate }))

    // ===== CALL INVITE SYSTEM (existing) =====
    socket.on('call:invite', (payload = {}) => {
      try {
        const {
          callId,
          toUserIds = [],
          conversationId,
          mode,
          from
        } = payload

        const targets = (toUserIds || []).map(String).filter(Boolean)
        if (!conversationId || !mode || targets.length === 0 || !callId) {
          console.warn('[WEBRTC] invalid call:invite payload', payload)
          return
        }

        console.log('[WEBRTC] invite ->', targets, 'conv:', conversationId, 'callId:', callId, 'by:', authedUserId)
        
        targets.forEach(uid => {
          nsp.to(`user:${uid}`).emit('call:ringing', {
            callId,
            conversationId,
            mode,
            from
          })
        })
      } catch (err) {
        console.error('[WEBRTC] call:invite error:', err)
      }
    })

    socket.on('call:cancel', (payload = {}) => {
      try {
        const { callId, toUserIds = [] } = payload
        const targets = (toUserIds || []).map(String).filter(Boolean)
        
        console.log('[WEBRTC] cancel ->', targets, 'by:', authedUserId)
        
        targets.forEach(uid => {
          nsp.to(`user:${uid}`).emit('call:canceled', { callId })
        })
      } catch (err) {
        console.error('[WEBRTC] call:cancel error:', err)
      }
    })

    socket.on('call:accept', (payload = {}) => {
      try {
        const { callId, conversationId, mode, fromUserId, toUserId } = payload
        
        console.log('[WEBRTC] accept by:', fromUserId, 'to:', toUserId, 'callId:', callId)
        
        const acceptedAt = new Date().toISOString()
        
        if (toUserId) {
          nsp.to(`user:${String(toUserId)}`).emit('call:accepted', {
            callId,
            conversationId,
            mode,
            acceptedAt
          })
        }
        
        nsp.to(`user:${String(fromUserId)}`).emit('call:accepted', {
          callId,
          conversationId,
          mode,
          acceptedAt
        })
      } catch (err) {
        console.error('[WEBRTC] call:accept error:', err)
      }
    })

    socket.on('call:decline', (payload = {}) => {
      try {
        const { callId, fromUserId, toUserId } = payload
        
        console.log('[WEBRTC] decline by:', fromUserId, 'to:', toUserId, 'callId:', callId)
        
        if (toUserId) {
          nsp.to(`user:${String(toUserId)}`).emit('call:declined', { callId })
        }
      } catch (err) {
        console.error('[WEBRTC] call:decline error:', err)
      }
    })

    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId
      if (roomId) {
        socket.to(roomId).emit('peer-left', { peerId: socket.id })
        console.log(`[WEBRTC] User disconnected from room: ${roomId}`)
      }
    })
  })

  return nsp
}
