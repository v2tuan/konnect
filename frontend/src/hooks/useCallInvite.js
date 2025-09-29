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
    if (!currentUserId) return

    const s = getWebRTCSocket(currentUserId)
    socketRef.current = s

    console.log('[useCallInvite] Setting up socket listeners for user:', currentUserId)

    // ===== Callee: nhận cuộc gọi đến =====
    const onRinging = ({ callId, conversationId, mode, from }) => {
      console.log('[useCallInvite] call:ringing received:', { callId, conversationId, mode, from })

      const toastId = toast.info(
        createElement(ToastIncoming, {
          from: from,
          mode: mode,
          onAccept: () => accept(callId, conversationId, mode, from),
          onDecline: () => decline(callId, from?.id)
        }),
        {
          autoClose: false,
          closeOnClick: false,
          toastId: callId // Đặt toastId = callId để dễ quản lý
        }
      )
      toastMapRef.current.set(callId, toastId)
    }

    // Caller hủy cuộc gọi
    const onCanceled = ({ callId }) => {
      console.log('[useCallInvite] call:canceled received:', callId)

      // Dismiss toast by callId
      toast.dismiss(callId)
      toastMapRef.current.delete(callId)
    }

    // Cả 2 bên được thông báo accept
    const onAccepted = ({ callId, conversationId, mode, acceptedAt }) => {
      console.log('[useCallInvite] call:accepted received:', { callId, conversationId, mode, acceptedAt })

      // Đóng toast
      toast.dismiss(callId)
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
        console.log('[useCallInvite] Opening call modal:', { conversationId, mode, acceptedAt, callId })
        onOpenCallRef.current(conversationId, mode, acceptedAt, callId)
      } else {
        console.warn('[useCallInvite] onOpenCallRef not set!')
      }
    }

    // Caller nhận báo bị từ chối
    const onDeclined = ({ callId }) => {
      console.log('[useCallInvite] call:declined received:', callId)

      toast.dismiss(callId)
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
      toastMapRef.current.forEach(toastId => toast.dismiss(toastId))
      toastMapRef.current.clear()
    }
  }, [currentUserId])

  // ===== Helper functions =====
  function accept(callId, conversationId, mode, fromUser) {
    if (!socketRef.current) {
      console.error('[useCallInvite] Socket not connected for accept')
      return
    }

    console.log('[useCallInvite] Accepting call:', { callId, conversationId, mode, fromUser })

    socketRef.current.emit('call:accept', {
      callId,
      conversationId,
      mode,
      fromUserId: currentUserId,
      toUserId: fromUser?.id
    })

    // Dismiss toast ngay lập tức
    toast.dismiss(callId)
    toastMapRef.current.delete(callId)
  }

  function decline(callId, toUserId) {
    if (!socketRef.current) {
      console.error('[useCallInvite] Socket not connected for decline')
      return
    }

    console.log('[useCallInvite] Declining call:', { callId, toUserId })

    socketRef.current.emit('call:decline', {
      callId,
      fromUserId: currentUserId,
      toUserId
    })

    // Dismiss toast ngay lập tức
    toast.dismiss(callId)
    toastMapRef.current.delete(callId)
  }

  // Đăng ký callback mở modal
  function setOnOpenCall(fn) {
    console.log('[useCallInvite] setOnOpenCall registered')
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

  return {
    ringing,
    startCall,
    cancelCaller,
    setOnOpenCall
  }
}