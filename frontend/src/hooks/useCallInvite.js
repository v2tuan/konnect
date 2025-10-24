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

  // ✅ Lấy function từ global store
  const { openCall } = useCallStore()

  // NEW: audio refs
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
      ref.current.play().catch(()=>{})
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

  const stopAllAudio = () => {
    stopLoop(callerAudioRef)
    stopLoop(calleeAudioRef)
  }

  useEffect(() => {
    if (!currentUserId) return

    const s = getWebRTCSocket(currentUserId)
    socketRef.current = s

    const onRinging = ({ callId, conversationId, mode, from }) => {
      startLoop(calleeAudioRef, CALLEE_RING_SRC)

      const toastId = toast.info(
        createElement(ToastIncoming, {
          from,
          mode,
          onAccept: () => accept(callId, conversationId, mode, from),
          onDecline: () => decline(callId, from?.id)
        }),
        {
          autoClose: false,
          closeOnClick: false,
          toastId: callId,
          onClose: () => stopAllAudio()
        }
      )
      toastMapRef.current.set(callId, toastId)
    }

    const onCanceled = ({ callId }) => {
      toast.dismiss(callId)
      toastMapRef.current.delete(callId)
      stopAllAudio()
    }

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
      
      // ✅ MỞ CALL MODAL TOÀN CỤC (cho cả người gọi và người nhận)
      openCall({
        conversationId,
        callId,
        initialMode: mode,
        callStartedAt: acceptedAt || new Date()
      })
      
      // Backward compatible
      if (typeof onOpenCallRef.current === 'function') {
        onOpenCallRef.current(conversationId, mode, acceptedAt, callId)
      }
    }

    const onDeclined = ({ callId }) => {
      toast.dismiss(callId)
      toastMapRef.current.delete(callId)
      stopAllAudio()

      const declinedToastId = `${callId}-declined`
      if (!toast.isActive(declinedToastId)) {
        toast.warn('Call was declined', { toastId: declinedToastId, autoClose: 2500 })
      }

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

      setRinging(prev => {
        if (prev?.timer) clearInterval(prev.timer)
        return null
      })
      toastMapRef.current.forEach(id => toast.dismiss(id))
      toastMapRef.current.clear()
      stopAllAudio()
    }
  }, [currentUserId, openCall]) // ✅ Thêm openCall vào dependencies

  function accept(callId, conversationId, mode, fromUser) {
    if (!socketRef.current) return
    console.log('[useCallInvite] Accepting call:', { callId })
    
    // ✅ MỞ CALL MODAL NGAY KHI NGƯỜI NHẬN ACCEPT
    openCall({
      conversationId,
      callId,
      initialMode: mode,
      callStartedAt: new Date()
    })
    
    socketRef.current.emit('call:accept', {
      callId,
      conversationId,
      mode,
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
      callId,
      fromUserId: currentUserId,
      toUserId
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
      console.error('[useCallInvite] Invalid startCall params')
      return
    }
    const _callId = callId || `${conversationId}:${Date.now()}`
    console.log('[useCallInvite] Starting call:', { _callId, conversationId, mode })

    // ❌ KHÔNG MỞ MODAL Ở ĐÂY - chỉ emit invite
    socketRef.current.emit('call:invite', {
      callId: _callId,
      conversationId,
      mode,
      toUserIds,
      from: me
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

  function cancelCaller(toUserIds) {
    if (!ringing || !socketRef.current) return
    console.log('[useCallInvite] Canceling call:', ringing.callId)
    socketRef.current.emit('call:cancel', { callId: ringing.callId, toUserIds })
    if (ringing.timer) clearInterval(ringing.timer)
    stopLoop(callerAudioRef)
    setRinging(null)
  }

  return {
    ringing,
    startCall,
    cancelCaller,
    setOnOpenCall
  }
}