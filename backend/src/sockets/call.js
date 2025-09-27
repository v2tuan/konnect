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

    // ===== WEBRTC SIGNALING (existing) =====
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

    socket.on('rtc-offer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-offer', { from, sdp }))
    socket.on('rtc-answer', ({ to, sdp, from }) => nsp.to(to).emit('rtc-answer', { from, sdp }))
    socket.on('rtc-ice', ({ to, candidate, from }) => nsp.to(to).emit('rtc-ice', { from, candidate }))

    // ===== CALL INVITE SYSTEM =====
    
    // 1. Caller gửi invite
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
        if (!conversationId || !mode || targets.length === 0) {
          console.warn('[WEBRTC] invalid call:invite payload', payload)
          return
        }

        console.log('[WEBRTC] invite ->', targets, 'conv:', conversationId, 'by:', authedUserId)
        
        // Emit đúng event name: call:ringing
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

    // 2. Caller hủy cuộc gọi
    socket.on('call:cancel', (payload = {}) => {
      try {
        const { callId, toUserIds = [] } = payload
        const targets = (toUserIds || []).map(String).filter(Boolean)
        
        console.log('[WEBRTC] cancel ->', targets, 'by:', authedUserId)
        
        // Emit đúng event name: call:canceled (không phải call:cancelled)
        targets.forEach(uid => {
          nsp.to(`user:${uid}`).emit('call:canceled', { callId })
        })
      } catch (err) {
        console.error('[WEBRTC] call:cancel error:', err)
      }
    })

    // 3. Callee accept cuộc gọi  
    socket.on('call:accept', (payload = {}) => {
      try {
        const { callId, conversationId, mode, fromUserId, toUserId } = payload
        
        console.log('[WEBRTC] accept by:', fromUserId, 'to:', toUserId, 'callId:', callId)
        
        const acceptedAt = new Date().toISOString()
        
        // Thông báo cho caller (toUserId)
        if (toUserId) {
          nsp.to(`user:${String(toUserId)}`).emit('call:accepted', {
            callId,
            conversationId,
            mode,
            acceptedAt
          })
        }
        
        // Thông báo cho chính callee (fromUserId) 
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

    // 4. Callee decline cuộc gọi
    socket.on('call:decline', (payload = {}) => {
      try {
        const { callId, fromUserId, toUserId } = payload
        
        console.log('[WEBRTC] decline by:', fromUserId, 'to:', toUserId, 'callId:', callId)
        
        // Thông báo cho caller (toUserId)
        if (toUserId) {
          nsp.to(`user:${String(toUserId)}`).emit('call:declined', { callId })
        }
      } catch (err) {
        console.error('[WEBRTC] call:decline error:', err)
      }
    })

    socket.on('disconnect', () => {
      const roomId = socket.data?.roomId
      if (roomId) socket.to(roomId).emit('peer-left', { peerId: socket.id })
    })
  })

  return nsp
}
