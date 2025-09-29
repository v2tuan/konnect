import { useEffect, useRef, useState } from 'react'
import { getWebRTCSocket } from '@/lib/socket'

const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }

export function useWebRTCGroup({ roomId, currentUserId, initialMode = 'video', callId }) {
  const [mode, setMode] = useState(initialMode) // 'audio' | 'video'
  const [peerIds, setPeerIds] = useState([]) // danh sách socketId trong phòng
  const localStreamRef = useRef(null)
  const pcsRef = useRef(new Map()) // peerId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()) // peerId -> MediaStream
  const socketRef = useRef(null)
  const peerIdsRef = useRef([])

  const ensureLocalStream = async (target = mode) => {
    const needVideo = target === 'video'
    if (localStreamRef.current) {
      // Kiểm tra xem stream hiện tại có đúng loại không
      const tracks = localStreamRef.current.getVideoTracks()
      if (needVideo && tracks.length === 0) {
        // Cần video nhưng không có video track
        localStreamRef.current.getTracks().forEach(t => t.stop())
        localStreamRef.current = null
      } else if (!needVideo && tracks.length > 0) {
        // Không cần video nhưng có video track
        tracks.forEach(t => t.stop())
      }
    }

    if (!localStreamRef.current) {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: needVideo ? { width: 640, height: 480 } : false
      })
      localStreamRef.current = s
    }
    return localStreamRef.current
  }

  const stopLocal = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
  }

  const createPC = (peerId) => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)

    const pc = new RTCPeerConnection(ICE)
    pcsRef.current.set(peerId, pc)

    // Xử lý remote stream
    pc.ontrack = (e) => {
      console.log('[WebRTC] Received remote track from', peerId, e.streams[0])
      const remoteStream = e.streams[0]
      remoteStreamsRef.current.set(peerId, remoteStream)

      // Force re-render để cập nhật video
      setPeerIds(prev => [...prev])
    }

    // Xử lý ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('rtc-ice', {
          to: peerId,
          candidate: e.candidate,
          from: socketRef.current.id
        })
      }
    }

    // Thêm local tracks ngay khi tạo PC
    addLocalTracksTo(pc)

    return pc
  }

  const addLocalTracksTo = (pc) => {
    const stream = localStreamRef.current
    if (!stream) return

    // Xóa tất cả senders cũ
    pc.getSenders().forEach(sender => {
      if (sender.track) pc.removeTrack(sender)
    })

    // Thêm tracks mới
    stream.getTracks().forEach(track => {
      console.log('[WebRTC] Adding local track:', track.kind, track.label)
      pc.addTrack(track, stream)
    })
  }

  // Khi có peer mới join
  useEffect(() => {
    if (peerIds.length === 0) return

    peerIds.forEach(async (peerId) => {
      if (!pcsRef.current.has(peerId)) {
        const pc = createPC(peerId)

        // Tạo offer cho peer mới
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)

          socketRef.current?.emit('rtc-offer', {
            to: peerId,
            sdp: offer,
            from: socketRef.current.id
          })
          console.log('[WebRTC] Sent offer to', peerId)
        } catch (err) {
          console.error('[WebRTC] Error creating offer:', err)
        }
      }
    })
  }, [peerIds])

  useEffect(() => {
    const socket = getWebRTCSocket(currentUserId)
    socketRef.current = socket

    const join = async () => {
      await ensureLocalStream(initialMode)
      console.log('[WebRTC] Joining call with callId:', callId || roomId)

      // SỬA: Truyền callId để backend tạo room riêng biệt
      socket.emit('join-call', {
        roomId,
        userId: currentUserId,
        callId: callId || `${roomId}:${Date.now()}` // Fallback nếu không có callId
      })
    }

    // Socket event handlers
    const onPeersInRoom = ({ peers }) => {
      console.log('[WebRTC] Peers in room:', peers)
      setPeerIds(peers)
      peerIdsRef.current = peers
    }

    const onPeerJoined = ({ peerId, userId }) => {
      console.log('[WebRTC] Peer joined:', peerId, userId)
      setPeerIds(prev => prev.includes(peerId) ? prev : [...prev, peerId])
      peerIdsRef.current = [...peerIdsRef.current, peerId].filter((p, i, arr) => arr.indexOf(p) === i)
    }

    const onPeerLeft = ({ peerId }) => {
      console.log('[WebRTC] Peer left:', peerId)
      setPeerIds(prev => prev.filter(p => p !== peerId))
      peerIdsRef.current = peerIdsRef.current.filter(p => p !== peerId)

      // Cleanup connection
      const pc = pcsRef.current.get(peerId)
      if (pc) {
        pc.close()
        pcsRef.current.delete(peerId)
      }
      remoteStreamsRef.current.delete(peerId)
    }

    const onRtcOffer = async ({ from, sdp }) => {
      console.log('[WebRTC] Received offer from', from)
      const pc = createPC(from)

      try {
        await pc.setRemoteDescription(sdp)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socket.emit('rtc-answer', {
          to: from,
          sdp: answer,
          from: socket.id
        })
        console.log('[WebRTC] Sent answer to', from)
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err)
      }
    }

    const onRtcAnswer = async ({ from, sdp }) => {
      console.log('[WebRTC] Received answer from', from)
      const pc = pcsRef.current.get(from)
      if (pc) {
        try {
          await pc.setRemoteDescription(sdp)
        } catch (err) {
          console.error('[WebRTC] Error handling answer:', err)
        }
      }
    }

    const onRtcIce = async ({ from, candidate }) => {
      const pc = pcsRef.current.get(from)
      if (pc) {
        try {
          await pc.addIceCandidate(candidate)
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err)
        }
      }
    }

    // Bind events
    socket.on('peers-in-room', onPeersInRoom)
    socket.on('peer-joined', onPeerJoined)
    socket.on('peer-left', onPeerLeft)
    socket.on('rtc-offer', onRtcOffer)
    socket.on('rtc-answer', onRtcAnswer)
    socket.on('rtc-ice', onRtcIce)

    join()

    return () => {
      // Cleanup
      socket.off('peers-in-room', onPeersInRoom)
      socket.off('peer-joined', onPeerJoined)
      socket.off('peer-left', onPeerLeft)
      socket.off('rtc-offer', onRtcOffer)
      socket.off('rtc-answer', onRtcAnswer)
      socket.off('rtc-ice', onRtcIce)

      // Leave call
      socket.emit('leave-call', { roomId, callId })

      // Stop local stream
      stopLocal()

      // Close all peer connections
      pcsRef.current.forEach(pc => pc.close())
      pcsRef.current.clear()
      remoteStreamsRef.current.clear()
    }
  }, [roomId, currentUserId, callId])

  // Controls
  const getLocalStream = () => localStreamRef.current || null
  const getRemoteStream = (peerId) => remoteStreamsRef.current.get(peerId) || null

  const toggleMute = () => {
    const stream = localStreamRef.current
    if (!stream) return false

    const audioTrack = stream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      return audioTrack.enabled
    }
    return false
  }

  const toggleCamera = () => {
    const stream = localStreamRef.current
    if (!stream) return false

    const videoTrack = stream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      return videoTrack.enabled
    }
    return false
  }

  const switchToVideo = async () => {
    setMode('video')
    const newStream = await ensureLocalStream('video')

    // Cập nhật tracks cho tất cả peer connections
    pcsRef.current.forEach(pc => {
      addLocalTracksTo(pc)
    })

    return newStream
  }

  const switchToAudio = async () => {
    setMode('audio')
    const newStream = await ensureLocalStream('audio')

    // Cập nhật tracks cho tất cả peer connections
    pcsRef.current.forEach(pc => {
      addLocalTracksTo(pc)
    })

    return newStream
  }

  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const videoTrack = screenStream.getVideoTracks()[0]

      // Thay thế video track hiện tại
      pcsRef.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(videoTrack)
        }
      })

      // Khi stop sharing screen, quay lại camera
      videoTrack.onended = () => {
        switchToVideo()
      }
    } catch (err) {
      console.error('Error sharing screen:', err)
    }
  }

  return {
    mode,
    peerIds,
    getLocalStream,
    getRemoteStream,
    toggleMute,
    toggleCamera,
    switchToVideo,
    switchToAudio,
    shareScreen
  }
}
