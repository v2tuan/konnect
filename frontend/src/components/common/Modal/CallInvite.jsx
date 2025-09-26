// src/hooks/useCallInvite.js
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { getSocket } from '@/lib/socket'

function ToastIncoming({ from, mode, onAccept, onDecline }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <img
        src={from?.avatarUrl}
        alt=""
        style={{ width:32, height:32, borderRadius:'9999px', objectFit:'cover' }}
      />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:600 }}>
          {from?.name || 'Ai đó'} is calling to you
        </div>
        <div style={{ fontSize:12, opacity:0.7 }}>
          {mode === 'video' ? 'Video Call' : 'Audio Call'}
        </div>
      </div>
      <button
        onClick={onAccept}
        style={{ padding:'4px 8px', fontSize:12, borderRadius:6, background:'#059669', color:'#fff' }}
      >
        Accept
      </button>
      <button
        onClick={onDecline}
        style={{ padding:'4px 8px', fontSize:12, borderRadius:6, background:'#dc2626', color:'#fff' }}
      >
        Decline
      </button>
    </div>
  )
}

/**
 * Hook “chuông gọi”:
 * - Caller: startCall() → hiển thị khung chờ 30s (avatar người đối diện) + emit call:invite
 * - Callee: nhận call:ringing → toast Accept/Decline (react-toastify)
 * - Khi Accept: server emit call:accepted(acceptedAt) cho cả 2 → callback onOpenCall(mode, acceptedAt)
 */
export function useCallInvite(currentUserId) {
  const socketRef = useRef(null)

  // Khung chờ phía caller (để hiển thị ở UI, ví dụ 1 banner nhỏ)
  const [ringing, setRinging] = useState(null)
  // Map callId -> toastId (để dismiss toast ở callee/caller)
  const toastMapRef = useRef(new Map())
  // callback do component ngoài đăng ký, để mở modal WebRTC khi accept
  const onOpenCallRef = useRef(null)

  useEffect(() => {
    const s = getSocket()
    socketRef.current = s

    // ===== Callee: có cuộc gọi đến -> hiển thị toast Accept/Decline
    const onRinging = ({ callId, conversationId, mode, from }) => {
      const toastId = toast.info(
        <ToastIncoming
          from={from}
          mode={mode}
          onAccept={() => accept(callId, conversationId, mode, from)}
          onDecline={() => decline(callId, from?.id)}
        />,
        { autoClose: false, closeOnClick: false }
      )
      toastMapRef.current.set(callId, toastId)
    }

    // Callee nhận báo Caller đã cancel (hoặc timeout)
    const onCanceled = ({ callId }) => {
      const tid = toastMapRef.current.get(callId)
      if (tid) toast.dismiss(tid)
      toastMapRef.current.delete(callId)
    }

    // Cả 2 bên được thông báo đã accept
    const onAccepted = ({ callId, conversationId, mode, acceptedAt }) => {
      // Đóng mọi toast liên quan
      const tid = toastMapRef.current.get(callId)
      if (tid) toast.dismiss(tid)
      toastMapRef.current.delete(callId)

      // Caller tắt khung chờ
      setRinging(prev => {
        if (prev?.callId === callId) {
          if (prev.timer) window.clearInterval(prev.timer)
          return null
        }
        return prev
      })

      // Mở modal WebRTC + truyền mốc acceptedAt để hiển thị timer
      if (typeof onOpenCallRef.current === 'function') {
        onOpenCallRef.current(mode, acceptedAt)
      }
    }

    // Caller nhận báo bị từ chối
    const onDeclined = ({ callId }) => {
      const tid = toastMapRef.current.get(callId)
      if (tid) toast.dismiss(tid)
      toastMapRef.current.delete(callId)

      toast.warn('Đối phương đã từ chối cuộc gọi')
      setRinging(prev => {
        if (prev?.callId === callId) {
          if (prev.timer) window.clearInterval(prev.timer)
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
      // dọn state chờ nếu unmount
      setRinging(prev => {
        if (prev?.timer) window.clearInterval(prev.timer)
        return null
      })
      toastMapRef.current.clear()
    }
  }, [currentUserId])

  // Cho component ngoài đăng ký callback mở modal WebRTC
  function setOnOpenCall(fn) {
    onOpenCallRef.current = fn
  }

  // ===== Caller bắt đầu gọi
  function startCall({ callId, conversationId, mode, toUserIds, me, peer, onOpenCall }) {
    if (!socketRef.current || !conversationId || !toUserIds || toUserIds.length === 0) return
    if (typeof onOpenCall === 'function') onOpenCallRef.current = onOpenCall

    const _callId = callId || `${conversationId}:${Date.now()}`

    // Bắn invite để bên kia toast
    socketRef.current.emit('call:invite', {
      callId: _callId,
      conversationId,
      mode,
      toUserIds,
      from: me
    })

    // Hiển thị “khung chờ 30s” cho caller — avatar người đối diện
    const ttl = 30000
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setRinging(prev => {
        if (!prev || prev.callId !== _callId) return prev
        const left = ttl - (Date.now() - startedAt)
        if (left <= 0) {
          // Timeout → auto cancel
          window.clearInterval(prev.timer)
          socketRef.current.emit('call:cancel', { callId: _callId, toUserIds })
          toast.info('Không có phản hồi')
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
    socketRef.current.emit('call:cancel', { callId: ringing.callId, toUserIds })
    if (ringing.timer) window.clearInterval(ringing.timer)
    setRinging(null)
  }

  // ===== Callee thao tác trong toast
  function accept(callId, conversationId, mode, fromUser) {
    if (!socketRef.current) return
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
    socketRef.current.emit('call:decline', {
      callId,
      fromUserId: currentUserId,
      toUserId
    })
  }

  return {
    // state khung chờ 30s (phía caller)
    ringing, // { callId, peer:{name,avatarUrl}, leftMs, ... }
    // APIs
    startCall, // Caller: bắt đầu gọi
    cancelCaller, // Caller: hủy
    setOnOpenCall // Đăng ký callback mở modal WebRTC khi Accept
  }
}
