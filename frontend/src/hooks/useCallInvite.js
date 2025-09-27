import { useEffect, useRef, useState, createElement } from 'react'
import { toast } from 'react-toastify'
import { getWebRTCSocket } from '@/lib/socket'
import { ToastIncoming } from '@/components/common/Modal/CallToast'

export function useCallInvite(currentUserId) {
  const socketRef = useRef(null)
  
  // Khung chờ phía caller
  const [ringing, setRinging] = useState(null)
  // Map callId -> toastId
  const toastMapRef = useRef(new Map())
  // Callback mở modal WebRTC
  const onOpenCallRef = useRef(null)

  useEffect(() => {
    const s = getWebRTCSocket(currentUserId)
    socketRef.current = s

    console.log('[useCallInvite] Setting up socket listeners for user:', currentUserId)

    // ===== Callee: nhận cuộc gọi đến =====
    const onRinging = ({ callId, conversationId, mode, from }) => {
      console.log('[useCallInvite] call:ringing received:', { callId, conversationId, mode, from })
      
      // Sử dụng createElement thay vì JSX
      const toastId = toast.info(
        createElement(ToastIncoming, {
          from: from,
          mode: mode,
          onAccept: () => accept(callId, conversationId, mode, from),
          onDecline: () => decline(callId, from?.id)
        }),
        { autoClose: false, closeOnClick: false }
      )
      toastMapRef.current.set(callId, toastId)
    }

    // Caller hủy cuộc gọi
    const onCanceled = ({ callId }) => {
      console.log('[useCallInvite] call:canceled received:', callId)
      const tid = toastMapRef.current.get(callId)
      if (tid) toast.dismiss(tid)
      toastMapRef.current.delete(callId)
    }

    // Cả 2 bên được thông báo accept
    const onAccepted = ({ callId, conversationId, mode, acceptedAt }) => {
      console.log('[useCallInvite] call:accepted received:', { callId, conversationId, mode, acceptedAt })
      
      // Đóng toast
      const tid = toastMapRef.current.get(callId)
      if (tid) toast.dismiss(tid)
      toastMapRef.current.delete(callId)

      // Caller tắt khung chờ
      setRinging(prev => {
        if (prev?.callId === callId) {
          if (prev.timer) clearInterval(prev.timer)
          return null
        }
        return prev
      })

      // Mở modal WebRTC
      if (typeof onOpenCallRef.current === 'function') {
        onOpenCallRef.current(conversationId, mode, acceptedAt)
      }
    }

    // Caller nhận báo bị từ chối
    const onDeclined = ({ callId }) => {
      console.log('[useCallInvite] call:declined received:', callId)
      
      const tid = toastMapRef.current.get(callId)
      if (tid) toast.dismiss(tid)
      toastMapRef.current.delete(callId)

      toast.warn('Call was declined')
      setRinging(prev => {
        if (prev?.callId === callId) {
          if (prev.timer) clearInterval(prev.timer)
          return null
        }
        return prev
      })
    }

    s.on('call:ringing', onRinging)
    s.on('call:canceled', onCanceled)
    s.on('call:accepted', onAccepted)
    s.on('call:declined', onDeclined)

    return () => {
      s.off('call:ringing', onRinging)
      s.off('call:canceled', onCanceled)
      s.off('call:accepted', onAccepted)
      s.off('call:declined', onDeclined)
      
      // Dọn dẹp
      setRinging(prev => {
        if (prev?.timer) clearInterval(prev.timer)
        return null
      })
      toastMapRef.current.clear()
    }
  }, [currentUserId])

  // Đăng ký callback mở modal
  function setOnOpenCall(fn) {
    onOpenCallRef.current = fn
  }

  // ===== Caller bắt đầu gọi =====
  function startCall({ callId, conversationId, mode, toUserIds, me, peer }) {
    if (!socketRef.current || !conversationId || !toUserIds || toUserIds.length === 0) {
      console.error('[useCallInvite] Invalid startCall params')
      return
    }

    const _callId = callId || `${conversationId}:${Date.now()}`

    console.log('[useCallInvite] Starting call:', { _callId, conversationId, mode, toUserIds })

    // Emit invite
    socketRef.current.emit('call:invite', {
      callId: _callId,
      conversationId,
      mode,
      toUserIds,
      from: me
    })

    // Hiển thị khung chờ 30s
    const ttl = 30000
    const startedAt = Date.now()
    const timer = setInterval(() => {
      setRinging(prev => {
        if (!prev || prev.callId !== _callId) return prev
        const left = ttl - (Date.now() - startedAt)
        if (left <= 0) {
          // Timeout - tự động hủy
          clearInterval(timer)
          console.log('[useCallInvite] Call timeout, auto canceling')
          socketRef.current?.emit('call:cancel', { callId: _callId, toUserIds })
          return null
        }
        return { ...prev, leftMs: left }
      })
    }, 250)

    setRinging({
      callId: _callId,
      conversationId,
      mode,
      peer,
      startedAt,
      leftMs: ttl,
      timer
    })
  }

  // Caller hủy chủ động
  function cancelCaller(toUserIds) {
    if (!ringing || !socketRef.current) return
    
    console.log('[useCallInvite] Canceling call:', ringing.callId)
    socketRef.current.emit('call:cancel', { callId: ringing.callId, toUserIds })
    
    if (ringing.timer) clearInterval(ringing.timer)
    setRinging(null)
  }

  // ===== Callee accept/decline =====
  function accept(callId, conversationId, mode, fromUser) {
    if (!socketRef.current) return
    
    console.log('[useCallInvite] Accepting call:', callId)
    socketRef.current.emit('call:accept', {
      callId,
      conversationId,
      mode,
      fromUserId: currentUserId,
      toUserId: fromUser?.id
    })
  }

  function decline(callId, toUserId) {
    if (!socketRef.current) return
    
    console.log('[useCallInvite] Declining call:', callId)
    socketRef.current.emit('call:decline', {
      callId,
      fromUserId: currentUserId,
      toUserId
    })
  }

  return {
    ringing,
    startCall,
    cancelCaller,
    setOnOpenCall
  }
}