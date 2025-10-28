/* eslint-disable no-empty */
import { useEffect, useRef, useState, createElement } from 'react'
import { toast } from 'react-toastify'
import { getWebRTCSocket } from '@/lib/socket'
import { ToastIncoming } from '@/components/common/Modal/CallToast'
import { useCallStore } from '@/store/useCallStore'

const CALLER_RING_SRC = '/zalo-sender.mp3'
const CALLEE_RING_SRC = '/zalo-receive.mp3'
const DEFAULT_VOLUME = 0.8

export function useCallInvite(currentUserId) {
  const socketRef = useRef(null)

  const [ringing, setRinging] = useState(null)
  const toastMapRef = useRef(new Map())
  const onOpenCallRef = useRef(null)
  const { openCall } = useCallStore()

  // audio helpers
  const callerAudioRef = useRef(null)
  const calleeAudioRef = useRef(null)
  const startLoop = (ref, src) => {
    try {
      if (!ref.current) {
        ref.current = new Audio(src)
        ref.current.loop = true
        ref.current.volume = DEFAULT_VOLUME
      }
      ref.current.currentTime = 0
      ref.current.play().catch(() => {})
    } catch {}
  }
  const stopLoop = (ref) => {
    try {
      if (ref.current) {
        ref.current.pause()
        try { ref.current.currentTime = 0 } catch {}
        ref.current.src = ''
        ref.current.srcObject = null
        ref.current.load?.()
        ref.current = null
      }
    } catch {}
  }
  const stopAllAudio = () => { stopLoop(callerAudioRef); stopLoop(calleeAudioRef) }

  // 🔧 GOM TẤT CẢ LISTENER VÀO 1 EFFECT (global)
  useEffect(() => {
    if (!currentUserId) return
    const socket = getWebRTCSocket(currentUserId)
    if (!socket) return
    socketRef.current = socket

    // đọc state tức thời từ store (không cần re-render)
    const { activeCall, closeCall, currentConversation } = useCallStore.getState()

    // == bên kia rời cuộc gọi (Zalo-style auto close khi direct)
    const onCallLeft = ({ callId, conversationId, userId }) => {
      const { activeCall, closeCall } = useCallStore.getState()
      console.log('[useCallInvite] Peer left call:', userId, 'for callId:', callId)

      if (activeCall?.callId === callId) {
        toast.info('The other user has ended the call.')
        closeCall()
      }
    }


    // == đổ chuông
    const onRinging = ({ callId, conversationId, mode, from }) => {
      startLoop(calleeAudioRef, CALLEE_RING_SRC)
      const toastId = toast.info(
        createElement(ToastIncoming, {
          from,
          mode,
          onAccept: () => accept(callId, conversationId, mode, from),
          onDecline: () => decline(callId, from?.id)
        }),
        { autoClose: false, closeOnClick: false, toastId: callId, onClose: () => stopAllAudio() }
      )
      toastMapRef.current.set(callId, toastId)
    }

    // == người gọi huỷ khi còn đang rung
    const onCanceled = ({ callId }) => {
      toast.dismiss(callId)
      toastMapRef.current.delete(callId)
      stopAllAudio()
    }

    // == một bên accept → mở modal cho cả hai
    const onAccepted = ({ callId, conversationId, mode, acceptedAt }) => {
      toast.dismiss(callId)
      toastMapRef.current.delete(callId)
      stopAllAudio()

      setRinging(prev => {
        if (prev?.callId === callId) {
          if (prev.timer) clearInterval(prev.timer)
          return null
        }
        return prev
      })

      openCall({
        conversationId,
        callId,
        initialMode: mode,
        callStartedAt: acceptedAt || new Date()
      })

      // Back-compat nếu nơi khác có đăng ký onOpenCallRef
      onOpenCallRef.current?.(conversationId, mode, acceptedAt, callId)
    }

    // == bị decline
    const onDeclined = ({ callId }) => {
      toast.dismiss(callId)
      toastMapRef.current.delete(callId)
      stopAllAudio()
      if (!toast.isActive(`${callId}-declined`)) {
        toast.warn('Call was declined', { toastId: `${callId}-declined`, autoClose: 2500 })
      }
      setRinging(prev => {
        if (prev?.callId === callId) {
          if (prev.timer) clearInterval(prev.timer)
          return null
        }
        return prev
      })
    }

    // ĐK events
    socket.on('call:left', onCallLeft)
    socket.on('call:ringing', onRinging)
    socket.on('call:canceled', onCanceled)
    socket.on('call:accepted', onAccepted)
    socket.on('call:declined', onDeclined)

    return () => {
      socket.off('call:left', onCallLeft)
      socket.off('call:ringing', onRinging)
      socket.off('call:canceled', onCanceled)
      socket.off('call:accepted', onAccepted)
      socket.off('call:declined', onDeclined)

      setRinging(prev => { if (prev?.timer) clearInterval(prev.timer); return null })
      toastMapRef.current.forEach(id => toast.dismiss(id))
      toastMapRef.current.clear()
      stopAllAudio()
    }
  }, [currentUserId])

  function accept(callId, conversationId, mode, fromUser) {
    if (!socketRef.current) return
    console.log('[useCallInvite] Accepting call:', { callId })
    openCall({ conversationId, callId, initialMode: mode, callStartedAt: new Date() })
    socketRef.current.emit('call:accept', {
      callId, conversationId, mode,
      fromUserId: currentUserId,
      toUserId: fromUser?.id
    })
    stopAllAudio()
    toast.dismiss(callId)
    toastMapRef.current.delete(callId)
  }

  function decline(callId, toUserId) {
    if (!socketRef.current) return
    console.log('[useCallInvite] Declining call:', { callId })
    socketRef.current.emit('call:decline', {
      callId, fromUserId: currentUserId, toUserId
    })
    stopAllAudio()
    toast.dismiss(callId)
    toastMapRef.current.delete(callId)
  }

  function setOnOpenCall(fn) {
    console.log('[useCallInvite] setOnOpenCall registered')
    onOpenCallRef.current = fn
  }

  function startCall({ callId, conversationId, mode, toUserIds, me, peer }) {
    if (!socketRef.current || !conversationId || !toUserIds?.length) {
      console.error('[useCallInvite] Invalid startCall params', { socket: !!socketRef.current, conversationId, toUserIds })
      return
    }
    const _callId = callId || `${conversationId}:${Date.now()}`
    console.log('[useCallInvite] Starting call:', { _callId, conversationId, mode, toUserIds })

    socketRef.current.emit('call:invite', {
      callId: _callId, conversationId, mode, toUserIds, from: me
    })

    startLoop(callerAudioRef, CALLER_RING_SRC)

    const ttl = 30000
    const startedAt = Date.now()
    const timer = setInterval(() => {
      setRinging(prev => {
        if (!prev || prev.callId !== _callId) return prev
        const left = ttl - (Date.now() - startedAt)
        if (left <= 0) {
          clearInterval(timer)
          console.log('[useCallInvite] Call timeout, auto canceling')
          socketRef.current?.emit('call:cancel', { callId: _callId, toUserIds })
          stopLoop(callerAudioRef)
          return null
        }
        return { ...prev, leftMs: left }
      })
    }, 250)

    setRinging({ callId: _callId, conversationId, mode, peer, startedAt, leftMs: ttl, timer })
  }

  function cancelCaller(toUserIds) {
    if (!ringing || !socketRef.current) return
    console.log('[useCallInvite] Canceling call:', ringing.callId)
    socketRef.current.emit('call:cancel', { callId: ringing.callId, toUserIds })
    if (ringing.timer) clearInterval(ringing.timer)
    stopLoop(callerAudioRef)
    setRinging(null)
  }

  return { ringing, startCall, cancelCaller, setOnOpenCall }
}
